const Enrollment = require("../models/Enrollment");
const Batch = require("../models/Batch");
const User = require("../models/User");
const { applyDiscount } = require("../utils/discountService");
const Discount = require("../models/Discount");

/* ======================================================
   UTIL FUNCTIONS
====================================================== */

const calculateEndDate = (startDate, months) => {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + months);
  return d;
};

const calculateEnrollmentStatus = (
  paymentStatus,
  enrollmentEndDate,
  batchEndDate
) => {
  if (paymentStatus !== "paid") return "pending";

  const today = new Date();

  const effectiveEndDate = batchEndDate
    ? new Date(
      Math.min(
        new Date(enrollmentEndDate),
        new Date(batchEndDate)
      )
    )
    : new Date(enrollmentEndDate);

  const diffDays = Math.ceil(
    (effectiveEndDate - today) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "expired";
  if (diffDays <= 7) return "expiring";
  return "active";
};

/* ======================================================
   USER UPSERT
====================================================== */

const findOrCreatePlayerUser = async ({
  playerName,
  mobile,
  email,
  sportName,
  address,
  age,
  dateOfBirth,
  gender,
}) => {
  if (!dateOfBirth || !gender) {
    throw new Error("Date of Birth and Gender are required");
  }

  const normalizedAddress = {
    country: address?.country || "India",
    state: address?.state || "Maharashtra",
    city: address?.city || "",
    localAddress: address?.localAddress || "",
  };

  const query = { role: "player", $or: [] };

  if (mobile) query.$or.push({ mobile });
  if (email) query.$or.push({ email });

  let user = await User.findOne(query);

  const dobDate = new Date(dateOfBirth);
  
  if (!user) {
    return await User.create({
      fullName: playerName,
      mobile,
      email,
      age,
     dateOfBirth: dobDate,
      gender,
      role: "player",
      sportsPlayed: sportName ? [sportName] : [],
      address: normalizedAddress,
      memberSince: new Date(),
      source: "enrollment",
    });
  }

  /* ================= UPDATE EXISTING USER ================= */

  await User.findByIdAndUpdate(user._id, {
    fullName: playerName,
    email,
    age,
    dateOfBirth: dobDate,
    gender,
    address: normalizedAddress,   // 🔥 FULL ADDRESS SYNC
    $addToSet: {
      sportsPlayed: sportName,
    },
  });

  return user;
};

/* ======================================================
   CREATE ENROLLMENT (MULTI DISCOUNT SAFE VERSION)
====================================================== */
exports.createEnrollment = async (req, res) => {
  try {
    const {
      source = "website",
      playerName,
      age,
      mobile,
      email,
      dateOfBirth,
      gender,
      batchId,
      startDate,
      planType = "monthly",
      paymentMode = "razorpay",
      address,
      paymentStatus,
      discountCodes = [],   // coupon codes from website
      discounts = [],       // admin direct discounts
    } = req.body;

   if (
      !playerName ||
      !mobile ||
      !dateOfBirth ||
      !gender ||
      !batchId ||
      !startDate
    ) {
      return res.status(400).json({
        message: "Complete player details required",
      });
    }

    if (!["male", "female", "other"].includes(gender)) {
      return res.status(400).json({
        message: "Invalid gender value",
      });
    }

    const batch = await Batch.findOne({ _id: batchId }).populate(
      "sportId",
      "name endDate"
    );

    if (!batch) {
      return res.status(400).json({ message: "Invalid batch" });
    }

    if (batch.enrolledCount >= batch.capacity) {
      return res.status(400).json({ message: "Batch is full" });
    }

    const durationMonths = planType === "quarterly" ? 3 : 1;
    const endDate = calculateEndDate(startDate, durationMonths);
    const baseAmount = batch.monthlyFee * durationMonths;

    /* ================= USER UPSERT ================= */

    const user = await findOrCreatePlayerUser({
      playerName,
      mobile,
      email,
      age,
      dateOfBirth,
      gender,
      sportName: batch.sportId?.name,
      address: {
        country: address?.country || "India",
        state: address?.state || "Maharashtra",
        city: address?.city || "",
        localAddress: address?.localAddress || "",
      },
    });

    /* ================= BLOCK DUPLICATE ENROLLMENT ================= */

    const existingEnrollment = await Enrollment.findOne({
      userId: user._id,
      batchId: batch._id,
    });

    if (existingEnrollment) {
      return res.status(400).json({
        message:
          "You are already enrolled in this batch.",
      });
    }

    /* ================= APPLY DISCOUNTS ================= */

    let runningAmount = baseAmount;
    let totalDiscountAmount = 0;
    let appliedDiscounts = [];

    /* ======================================================
       1️⃣ ADMIN DIRECT DISCOUNTS
    ====================================================== */
    if (source === "admin" && discounts.length > 0) {

      for (let d of discounts) {

        let discountValue =
          d.type === "percentage"
            ? (runningAmount * d.value) / 100
            : d.value;

        discountValue = Math.min(discountValue, runningAmount);

        runningAmount -= discountValue;
        totalDiscountAmount += discountValue;

        appliedDiscounts.push({
          discountId: d.discountId || null,
          title: d.title || null,
          code: d.code || null,
          type: d.type,
          value: d.value,
          discountAmount: Math.round(discountValue),
        });
      }
    }

    /* ======================================================
       2️⃣ WEBSITE DISCOUNTS (AUTO + COUPON STACK SAFE)
    ====================================================== */
    else {

      const today = new Date();

      const allDiscountDocs = await Discount.find({
        applicableFor: "enrollment",
        isActive: true,
        $or: [{ validFrom: null }, { validFrom: { $lte: today } }],
        $and: [
          {
            $or: [{ validTill: null }, { validTill: { $gte: today } }],
          },
        ],
      });

      const applicableDiscounts = allDiscountDocs.filter((discount) => {

        // Plan match
        if (discount.planType && discount.planType !== planType)
          return false;

        // Sport match
        if (
          discount.sportId &&
          String(discount.sportId) !== String(batch.sportId?._id)
        )
          return false;

        // Batch match
        if (
          discount.batchId &&
          String(discount.batchId) !== String(batch._id)
        )
          return false;

        // If discount has code → must be in discountCodes
        if (discount.code) {
          return discountCodes.includes(discount.code);
        }

        // No code → auto discount
        return true;
      });

      for (let discount of applicableDiscounts) {

        let discountValue =
          discount.type === "percentage"
            ? (runningAmount * discount.value) / 100
            : discount.value;

        discountValue = Math.min(discountValue, runningAmount);

        runningAmount -= discountValue;
        totalDiscountAmount += discountValue;

        appliedDiscounts.push({
          discountId: discount._id,
          title: discount.title,
          code: discount.code || null,
          type: discount.type,
          value: discount.value,
          discountAmount: Math.round(discountValue),
        });
      }
    }

    const finalAmount = Math.max(0, Math.round(runningAmount));

    /* ================= PAYMENT STATUS ================= */

    const finalPaymentStatus =
      paymentStatus ||
      (paymentMode === "cash" ? "paid" : "unpaid");

    const finalStatus = calculateEnrollmentStatus(
      finalPaymentStatus,
      endDate,
      batch.endDate
    );

    /* ================= CREATE ENROLLMENT ================= */

    const enrollment = await Enrollment.create({
      userId: user._id,
      playerName,
      age,
      dateOfBirth,
      gender,
      mobile,
      email,
      address,
      batchId: batch._id,
      batchName: batch.name,
      sportName: batch.sportId?.name,
      coachName: batch.coachName,
      planType,
      durationMonths,
      startDate,
      endDate,
      monthlyFee: batch.monthlyFee,
      baseAmount,
      discounts: appliedDiscounts,
      totalDiscountAmount: Math.round(totalDiscountAmount),
      finalAmount,
      paymentMode,
      paymentStatus: finalPaymentStatus,
      status: finalStatus,
      source,
    });

    res.status(201).json(enrollment);

  } catch (err) {
    console.error("CREATE ENROLLMENT ERROR:", err);

    if (err.code === 11000 || err.message.includes("duplicate key")) {
      return res.status(400).json({
        message: "This player is already enrolled in this batch.",
      });
    }

    res.status(500).json({
      message: "Something went wrong. Please try again.",
    });
  }
};

/* ======================================================
   GET ALL ENROLLMENTS (ADMIN)
====================================================== */
exports.getEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.aggregate([
      {
        $lookup: {
          from: "batches",
          localField: "batchId",
          foreignField: "_id",
          as: "batch",
        },
      },
      { $addFields: { batch: { $first: "$batch" } } },
      { $sort: { createdAt: -1 } },
    ]);

    const final = enrollments.map((e) => {
      const status = calculateEnrollmentStatus(
        e.paymentStatus,
        e.endDate,
        e.batch?.endDate
      );

      return {
        ...e,
        status,
        batchEnded:
          e.batch?.endDate &&
          new Date(e.batch.endDate) < new Date(),
      };
    });

    res.json(final);

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch enrollments",
    });
  }
};

/* ======================================================
   GET SINGLE ENROLLMENT
====================================================== */

exports.getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("batchId", "endDate capacity enrolledCount")
      .lean();

    if (!enrollment) {
      return res.status(404).json({ message: "Not found" });
    }

    /* ================= RECALCULATE LIVE STATUS ================= */

    const status = calculateEnrollmentStatus(
      enrollment.paymentStatus,
      enrollment.endDate,
      enrollment.batchId?.endDate
    );

    /* ================= FORMAT RESPONSE ================= */

    const response = {
      ...enrollment,

      // Ensure amounts are consistent
      baseAmount: enrollment.baseAmount || 0,
      totalDiscountAmount: enrollment.totalDiscountAmount || 0,
      finalAmount: enrollment.finalAmount || 0,

      // Return discount breakdown safely
      discounts: enrollment.discounts || [],

      // Live computed status
      status,

      batchEnded:
        enrollment.batchId?.endDate &&
        new Date(enrollment.batchId.endDate) < new Date(),
    };

    res.json(response);

  } catch (err) {
    console.error("GET ENROLLMENT ERROR:", err);
    res.status(500).json({ message: "Error fetching enrollment" });
  }
};

/* ======================================================
   UPDATE ENROLLMENT
====================================================== */
exports.updateEnrollment = async (req, res) => {
  try {
    const old = await Enrollment.findById(req.params.id);
    if (!old) return res.status(404).json({ message: "Not found" });

    let batch = await Batch.findById(old.batchId);

    const updateData = { ...req.body };

    /* ======================================================
       BATCH CHANGE
    ====================================================== */
    if (
      updateData.batchId &&
      updateData.batchId !== old.batchId.toString()
    ) {
      const newBatch = await Batch.findById(updateData.batchId);
      if (!newBatch)
        return res.status(400).json({ message: "Invalid batch" });

      await Batch.findByIdAndUpdate(old.batchId, {
        $inc: { enrolledCount: -1 },
      });

      await Batch.findByIdAndUpdate(updateData.batchId, {
        $inc: { enrolledCount: 1 },
      });

      batch = newBatch;

      updateData.batchName = newBatch.name;
      updateData.coachName = newBatch.coachName;
      updateData.sportName = newBatch.sportName;
    }

    /* ======================================================
       PLAN / DATE UPDATE
    ====================================================== */

    const planType = updateData.planType || old.planType;
    const startDate = updateData.startDate || old.startDate;
    const months = planType === "quarterly" ? 3 : 1;

    const endDate = calculateEndDate(startDate, months);

    updateData.planType = planType;
    updateData.durationMonths = months;
    updateData.startDate = startDate;
    updateData.endDate = endDate;

    /* ======================================================
       RECALCULATE BASE AMOUNT
    ====================================================== */

    const monthlyFee = batch?.monthlyFee || old.monthlyFee;
    const baseAmount = monthlyFee * months;

    updateData.monthlyFee = monthlyFee;
    updateData.baseAmount = baseAmount;

    /* ======================================================
       HANDLE MULTIPLE DISCOUNTS
    ====================================================== */

    let discounts = updateData.discounts || old.discounts || [];

    let runningTotal = baseAmount;
    let totalDiscountAmount = 0;

    discounts.forEach((d) => {
      let discountValue =
        d.type === "percentage"
          ? (runningTotal * d.value) / 100
          : d.value;

      discountValue = Math.min(discountValue, runningTotal);

      runningTotal -= discountValue;
      totalDiscountAmount += discountValue;
    });

    runningTotal = Math.max(0, Math.round(runningTotal));

    updateData.discounts = discounts;
    updateData.totalDiscountAmount = Math.round(totalDiscountAmount);
    updateData.finalAmount = runningTotal;

    /* ======================================================
       PAYMENT STATUS
    ====================================================== */

    const updatedPaymentStatus =
      updateData.paymentStatus !== undefined
        ? updateData.paymentStatus
        : old.paymentStatus;

    updateData.paymentStatus = updatedPaymentStatus;

    /* ======================================================
       STATUS RECALCULATION
    ====================================================== */

    updateData.status = calculateEnrollmentStatus(
      updatedPaymentStatus,
      endDate,
      batch?.endDate
    );

    /* ======================================================
       DOB + GENDER + AGE HANDLING
    ====================================================== */

    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);

      // Auto calculate age
      const diff = Date.now() - updateData.dateOfBirth.getTime();
      const ageDt = new Date(diff);
      updateData.age = Math.abs(ageDt.getUTCFullYear() - 1970);
    }

    if (updateData.gender) {
      updateData.gender = updateData.gender;
    }

    /* ======================================================
       SYNC USER DATA
    ====================================================== */

    if (old.userId) {
      const userUpdate = {};

      if (updateData.address)
        userUpdate.address = updateData.address;

      if (updateData.dateOfBirth)
        userUpdate.dateOfBirth = updateData.dateOfBirth;

      if (updateData.gender)
        userUpdate.gender = updateData.gender;

      if (updateData.age)
        userUpdate.age = updateData.age;

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(old.userId, userUpdate);
      }
    }

    /* ======================================================
       SAVE UPDATE
    ====================================================== */

    const updated = await Enrollment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);

  } catch (err) {
    console.error("UPDATE ENROLLMENT ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
/* ======================================================
   DELETE ENROLLMENT
====================================================== */
exports.deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ message: "Not found" });
    }

    if (enrollment.status === "active") {
      await Batch.findByIdAndUpdate(enrollment.batchId, {
        $inc: { enrolledCount: -1 },
      });
    }

    await enrollment.deleteOne();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
