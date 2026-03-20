const Enrollment = require("../models/Enrollment");
const Batch = require("../models/Batch");
const User = require("../models/User");
const { applyDiscount } = require("../utils/discountService");
const Discount = require("../models/Discount");
const { upsertUser } = require("../utils/upsertUser");

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
   DATE HELPERS
====================================================== */

const normalizeDate = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const activatePendingRenewal = async (enrollment) => {

  if (!enrollment?.pendingRenewal?.startDate) return enrollment;

  const today = normalizeDate(new Date());
  const start = normalizeDate(enrollment.pendingRenewal.startDate);

  if (today >= start) {

    enrollment.startDate = enrollment.pendingRenewal.startDate;
    enrollment.endDate = enrollment.pendingRenewal.endDate;
    enrollment.planType = enrollment.pendingRenewal.planType;
    enrollment.durationMonths = enrollment.pendingRenewal.durationMonths;

    enrollment.baseAmount = enrollment.pendingRenewal.amount;
    enrollment.finalAmount = enrollment.pendingRenewal.amount;

    enrollment.pendingRenewal = null;

    await enrollment.save();

  }

  return enrollment;
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
      discountCodes = [],
      discounts = []
    } = req.body;

    if (!playerName || !mobile || !dateOfBirth || !gender || !batchId || !startDate) {

      return res.status(400).json({
        message: "Complete player details required"
      });

    }

    const batch = await Batch.findOne({ _id: batchId }).populate("sportId", "name endDate");

    if (!batch)
      return res.status(400).json({ message: "Invalid batch" });

    if (batch.enrolledCount >= batch.capacity)
      return res.status(400).json({ message: "Batch is full" });

    /* ================= PLAN ================= */

    let durationMonths = 1;
    let planAmount = 0;

    if (planType === "quarterly") {

      durationMonths = 3;

      if (!batch.hasQuarterly || !batch.quarterlyFee) {

        return res.status(400).json({
          message: "Quarterly plan not available for this batch"
        });

      }

      planAmount = batch.quarterlyFee;

    } else {

      durationMonths = 1;
      planAmount = batch.monthlyFee;

    }

    /* ================= REGISTRATION FEE ================= */

    const registrationFee = Number(batch.registrationFee || 0);

    /* ================= BASE AMOUNT ================= */

    const baseAmount = planAmount;

    /* ================= END DATE ================= */

    const endDate = calculateEndDate(startDate, durationMonths);

    /* ================= USER UPSERT ================= */

    const user = await upsertUser({

      fullName: playerName,
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
        localAddress: address?.localAddress || ""
      },

      sourceType: "coaching"

    });

    /* ================= CLEAN UNPAID ENROLLMENTS ================= */

    await Enrollment.deleteMany({
      userId: user._id,
      batchId: batch._id,
      paymentStatus: { $ne: "paid" }
    });

    /* ================= BLOCK DUPLICATE ================= */

    const existingEnrollment = await Enrollment.findOne({
      userId: user._id,
      batchId: batch._id,
      paymentStatus: "paid",
      status: { $ne: "expired" }
    });

    if (existingEnrollment) {
      return res.status(400).json({
        message: "You are already enrolled in this batch."
      });
    }

    /* ================= APPLY DISCOUNTS ================= */

    let runningAmount = planAmount;
    let totalDiscountAmount = 0;
    let appliedDiscounts = [];

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
          discountAmount: Math.round(discountValue)
        });

      }

    }

    /* ================= FINAL AMOUNT ================= */

    const finalAmount = Math.max(
      0,
      Math.round(runningAmount + registrationFee)
    );

    /* ================= PAYMENT STATUS ================= */

    const finalPaymentStatus =
      paymentStatus ||
      (paymentMode === "cash" ? "paid" : "unpaid");

    /* ================= STATUS ================= */

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
      quarterlyFee: batch.quarterlyFee || null,

      baseAmount,

      registrationFee,
      registrationFeeApplied: registrationFee > 0,

      discounts: appliedDiscounts,

      totalDiscountAmount: Math.round(totalDiscountAmount),

      finalAmount,

      paymentMode,
      paymentStatus: finalPaymentStatus,

      status: finalStatus,

      source

    });

    res.status(201).json(enrollment);

  } catch (err) {

    console.error("CREATE ENROLLMENT ERROR:", err);

    if (err.code === 11000 || err.message.includes("duplicate key")) {

      return res.status(400).json({
        message: "This player is already enrolled in this batch."
      });

    }

    res.status(500).json({
      message: "Something went wrong. Please try again."
    });

  }

};
/* ======================================================
   GET ALL ENROLLMENTS (ADMIN)
====================================================== */
exports.getEnrollments = async (req, res) => {
  try {

    const enrollments = await Enrollment.find()
      .populate("batchId")
      .sort({ createdAt: -1 });

    const final = [];

    for (const e of enrollments) {

      await activatePendingRenewal(e);

      const status = calculateEnrollmentStatus(
        e.paymentStatus,
        e.endDate,
        e.batchId?.endDate
      );

      final.push({
        ...e.toObject(),
        status,
        batchEnded:
          e.batchId?.endDate &&
          new Date(e.batchId.endDate) < new Date()
      });

    }

    res.json(final);

  } catch (err) {

    console.error("GET ENROLLMENTS ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch enrollments"
    });

  }
};

/* ======================================================
   GET SINGLE ENROLLMENT
====================================================== */

exports.getEnrollmentById = async (req, res) => {

  try {

    const enrollment = await Enrollment
      .findById(req.params.id)
      .populate("batchId");

    if (!enrollment) {
      return res.status(404).json({ message: "Not found" });
    }

    await activatePendingRenewal(enrollment);

    const status = calculateEnrollmentStatus(
      enrollment.paymentStatus,
      enrollment.endDate,
      enrollment.batchId?.endDate
    );

    res.json({
      ...enrollment.toObject(),
      status,
      batchEnded:
        enrollment.batchId?.endDate &&
        new Date(enrollment.batchId.endDate) < new Date()
    });

  } catch (err) {

    console.error("GET ENROLLMENT ERROR:", err);

    res.status(500).json({
      message: "Error fetching enrollment"
    });

  }

};

/* ======================================================
   UPDATE ENROLLMENT
====================================================== */
exports.updateEnrollment = async (req, res) => {

  try {

    const old = await Enrollment.findById(req.params.id);

    if (!old)
      return res.status(404).json({ message: "Enrollment not found" });

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
        $inc: { enrolledCount: -1 }
      });

      await Batch.findByIdAndUpdate(updateData.batchId, {
        $inc: { enrolledCount: 1 }
      });

      batch = newBatch;

      updateData.batchName = newBatch.name;
      updateData.coachName = newBatch.coachName;
      updateData.sportName = newBatch.sportId?.name;

    }

    /* ======================================================
       PLAN / DATE UPDATE
    ====================================================== */

    const planType = updateData.planType || old.planType;
    const startDate = updateData.startDate || old.startDate;

    const durationMonths = planType === "quarterly" ? 3 : 1;

    const endDate = calculateEndDate(startDate, durationMonths);

    updateData.planType = planType;
    updateData.durationMonths = durationMonths;
    updateData.startDate = startDate;
    updateData.endDate = endDate;

    /* ======================================================
       BASE AMOUNT
    ====================================================== */

    const monthlyFee = batch?.monthlyFee || old.monthlyFee;
    const quarterlyFee = batch?.quarterlyFee || null;

    let baseAmount = 0;

    if (planType === "quarterly") {

      if (!batch?.hasQuarterly || !batch?.quarterlyFee) {

        return res.status(400).json({
          message: "Quarterly plan not available for this batch"
        });

      }

      baseAmount = batch.quarterlyFee;

    } else {

      baseAmount = monthlyFee;

    }

    updateData.monthlyFee = monthlyFee;
    updateData.quarterlyFee = quarterlyFee;
    updateData.baseAmount = baseAmount;

    /* ======================================================
       DISCOUNT CALCULATION
    ====================================================== */

    const discounts = updateData.discounts || old.discounts || [];

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
       DOB + AGE AUTO CALCULATION
    ====================================================== */

    if (updateData.dateOfBirth) {

      updateData.dateOfBirth = new Date(updateData.dateOfBirth);

      const diff = Date.now() - updateData.dateOfBirth.getTime();
      const ageDt = new Date(diff);

      updateData.age = Math.abs(ageDt.getUTCFullYear() - 1970);

    }

    /* ======================================================
       SYNC USER PROFILE
    ====================================================== */

    if (old.userId) {

      const userUpdate = {};

      if (updateData.playerName)
        userUpdate.fullName = updateData.playerName;

      if (updateData.mobile)
        userUpdate.mobile = updateData.mobile;

      if (updateData.email)
        userUpdate.email = updateData.email;

      if (updateData.address)
        userUpdate.address = updateData.address;

      if (updateData.dateOfBirth)
        userUpdate.dateOfBirth = updateData.dateOfBirth;

      if (updateData.gender)
        userUpdate.gender = updateData.gender;

      if (updateData.age)
        userUpdate.age = updateData.age;

      if (batch?.sportId?.name) {

        userUpdate.$addToSet = {
          sportsPlayed: batch.sportId.name,
          userTypes: "coaching"
        };

      }

      if (Object.keys(userUpdate).length > 0) {

        await User.findByIdAndUpdate(
          old.userId,
          userUpdate
        );

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

    res.status(500).json({
      message: err.message
    });

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

/* ======================================================
   RENEW ENROLLMENT (USER + ADMIN)
====================================================== */

exports.renewEnrollment = async (req, res) => {

  try {

    const { planType } = req.body;

    const enrollment = await Enrollment
      .findById(req.params.id)
      .populate("batchId");

    if (!enrollment)
      return res.status(404).json({
        message: "Enrollment not found"
      });

    if (!enrollment.renewLinkActive)
      return res.status(400).json({
        message: "This action link is no longer active"
      });

    const batch = enrollment.batchId;

    let durationMonths = 1;
    let planAmount = batch.monthlyFee;

    if (planType === "quarterly") {

      if (!batch.hasQuarterly)
        return res.status(400).json({
          message: "Quarterly plan not available"
        });

      durationMonths = 3;
      planAmount = batch.quarterlyFee;

    }

    const today = normalizeDate(new Date());
    const currentEnd = normalizeDate(enrollment.endDate);

    let newStartDate;

    /* ================= START DATE ================= */

    if (enrollment.renewalLeave?.endDate) {

      newStartDate = normalizeDate(enrollment.renewalLeave.endDate);

    }
    else if (today > currentEnd) {

      newStartDate = today;

    }
    else {

      newStartDate = currentEnd;

    }

    const newEndDate = calculateEndDate(
      newStartDate,
      durationMonths
    );

    /* ======================================================
       IF CURRENT PLAN STILL ACTIVE → SCHEDULE
    ====================================================== */

    if (today < currentEnd) {

      enrollment.pendingRenewal = {
        startDate: newStartDate,
        endDate: newEndDate,
        planType,
        durationMonths,
        amount: planAmount,
        createdAt: new Date()
      };

    }
    else {

      enrollment.startDate = newStartDate;
      enrollment.endDate = newEndDate;

      enrollment.planType = planType;
      enrollment.durationMonths = durationMonths;

      enrollment.baseAmount = planAmount;
      enrollment.finalAmount = planAmount;

    }

    enrollment.paymentStatus = "paid";

    enrollment.status = calculateEnrollmentStatus(
      "paid",
      today < currentEnd ? enrollment.endDate : newEndDate,
      batch.endDate
    );

    enrollment.renewalHistory.push({
      startDate: newStartDate,
      endDate: newEndDate,
      planType,
      amount: planAmount,
      renewedAt: new Date()
    });

    enrollment.renewalLeave = null;
    enrollment.renewLinkActive = false;

    await enrollment.save();

    res.json({
      message:
        today < currentEnd
          ? "Renewal scheduled successfully"
          : "Enrollment renewed successfully",
      enrollment
    });

  } catch (err) {

    console.error("RENEW ENROLLMENT ERROR:", err);

    res.status(500).json({
      message: "Failed to renew enrollment"
    });

  }

};


exports.adminRenewEnrollment = async (req, res) => {
  try {

    const enrollment = await Enrollment
      .findById(req.params.id)
      .populate("batchId");

    if (!enrollment)
      return res.status(404).json({ message: "Enrollment not found" });

    const batch = enrollment.batchId;

    if (!batch)
      return res.status(400).json({ message: "Batch not found" });

    const planType = req.body.planType || enrollment.planType;

    let durationMonths = 1;
    let amount = batch.monthlyFee;

    if (planType === "quarterly") {
      durationMonths = 3;
      amount = batch.quarterlyFee;
    }

    const today = new Date();

    const startDate =
      today > enrollment.endDate
        ? today
        : enrollment.endDate;

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    /* ================= UPDATE ================= */

    enrollment.startDate = startDate;
    enrollment.endDate = endDate;

    enrollment.planType = planType;
    enrollment.durationMonths = durationMonths;

    enrollment.paymentStatus = "paid";
    enrollment.paymentMode = req.body.paymentMode || "cash";
    enrollment.status = "active";

    enrollment.baseAmount = amount;
    enrollment.finalAmount = amount;

    enrollment.renewLinkActive = false;

    /* ================= HISTORY ================= */

    enrollment.renewalHistory.push({
      startDate,
      endDate,
      planType,
      amount,
      renewedAt: new Date(),
      renewedBy: "admin"
    });

    await enrollment.save();

    res.json({
      message: "Enrollment renewed successfully",
      enrollment
    });

  } catch (err) {

    console.error("Admin Renew Error:", err);

    res.status(500).json({
      message: "Server error"
    });

  }
};
/* ======================================================
   TOGGLE LEAVE
====================================================== */

exports.applyLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;

    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        message: "Enrollment not found"
      });
    }

    if (enrollment.leaveActive) {
      return res.status(400).json({
        message: "Leave already active"
      });
    }

    const leaveStart = new Date(startDate);
    const leaveEnd = new Date(endDate);

    const enrollmentStart = new Date(enrollment.startDate);
    const enrollmentEnd = new Date(enrollment.endDate);

    // ================= VALIDATIONS =================

    if (leaveEnd < leaveStart) {
      return res.status(400).json({
        message: "End date must be after start date"
      });
    }

    // ❌ Leave before enrollment start
    if (leaveStart < enrollmentStart) {
      return res.status(400).json({
        message: "Leave cannot start before enrollment start date"
      });
    }

    // ❌ Leave after enrollment end
    if (leaveEnd > enrollmentEnd) {
      return res.status(400).json({
        message: "Leave cannot exceed enrollment end date"
      });
    }

    // ================= CALCULATE DAYS =================

    const diffDays =
      Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;

    // ================= APPLY LEAVE =================

    enrollment.leaveActive = true;
    enrollment.leaveStartDate = leaveStart;
    enrollment.leaveEndDate = leaveEnd;
    enrollment.leaveReason = reason;

    // store total leave used
    enrollment.leaveDays = (enrollment.leaveDays || 0) + diffDays;

    // ================= EXTEND END DATE =================

    const newEndDate = new Date(enrollment.endDate);
    newEndDate.setDate(newEndDate.getDate() + diffDays);

    enrollment.endDate = newEndDate;

    await enrollment.save();

    res.json({
      message: "Leave applied successfully",
      leaveDays: diffDays,
      newEndDate
    });

  } catch (err) {
    console.error("APPLY LEAVE ERROR:", err);

    res.status(500).json({
      message: "Failed to apply leave"
    });
  }
};


exports.cancelLeave = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);

    if (!enrollment) {
      return res.status(404).json({
        message: "Enrollment not found"
      });
    }

    if (!enrollment.leaveActive || !enrollment.leaveStartDate || !enrollment.leaveEndDate) {
      return res.status(400).json({
        message: "No active leave to cancel"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leaveStart = new Date(enrollment.leaveStartDate);
    leaveStart.setHours(0, 0, 0, 0);

    const leaveEnd = new Date(enrollment.leaveEndDate);
    leaveEnd.setHours(0, 0, 0, 0);

    let cancelledDays = 0;

    /* ======================================================
       CASE 1: CANCEL BEFORE LEAVE START → FULL CANCEL
    ====================================================== */
    if (today < leaveStart) {
      cancelledDays =
        Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;

      enrollment.leaveActive = false;
      enrollment.leaveStartDate = null;
      enrollment.leaveEndDate = null;
      enrollment.leaveReason = null;
    }

    /* ======================================================
       CASE 2: CANCEL DURING LEAVE → PARTIAL CANCEL
    ====================================================== */
    else if (today >= leaveStart && today <= leaveEnd) {
      cancelledDays =
        Math.ceil((leaveEnd - today) / (1000 * 60 * 60 * 24)) + 1;

      // keep used leave till yesterday
      const newLeaveEnd = new Date(today);
      newLeaveEnd.setDate(today.getDate() - 1);

      enrollment.leaveEndDate = newLeaveEnd;

      // if only 1 day used → still active
      if (newLeaveEnd < leaveStart) {
        enrollment.leaveActive = false;
        enrollment.leaveStartDate = null;
        enrollment.leaveEndDate = null;
        enrollment.leaveReason = null;
      }
    }

    /* ======================================================
       CASE 3: CANCEL AFTER LEAVE → DO NOTHING
    ====================================================== */
    else {
      return res.status(400).json({
        message: "Leave already completed, cannot cancel"
      });
    }

    /* ======================================================
       UPDATE LEAVE DAYS
    ====================================================== */
    enrollment.leaveDays = Math.max(
      0,
      (enrollment.leaveDays || 0) - cancelledDays
    );

    /* ======================================================
       REVERT END DATE
    ====================================================== */
    const newEndDate = new Date(enrollment.endDate);
    newEndDate.setDate(newEndDate.getDate() - cancelledDays);

    enrollment.endDate = newEndDate;

    await enrollment.save();

    res.json({
      message: "Leave updated successfully",
      cancelledDays,
      newLeaveEndDate: enrollment.leaveEndDate,
      newEndDate
    });

  } catch (err) {
    console.error("CANCEL LEAVE ERROR:", err);

    res.status(500).json({
      message: "Failed to cancel leave"
    });
  }
};



exports.getEnrollmentPublic = async (req, res) => {

  try {

    const enrollment = await Enrollment
      .findById(req.params.id)
      .populate("batchId");

    if (!enrollment) {
      return res.status(404).json({
        message: "Enrollment not found"
      });
    }

    /* ================= BLOCK PAGE IF LINK USED ================= */

    if (!enrollment.renewLinkActive) {

      return res.status(400).json({
        message: "This link is no longer active. Please contact academy."
      });

    }

    res.json({
      enrollment,
      batch: enrollment.batchId
    });

  } catch (err) {

    res.status(500).json({
      message: "Failed to fetch enrollment"
    });

  }

};