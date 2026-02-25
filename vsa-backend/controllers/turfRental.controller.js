const TurfRental = require("../models/TurfRental");
const Facility = require("../models/Facility");
const FacilitySlot = require("../models/FacilitySlot");
const BlockedSlot = require("../models/BlockedSlot");
const User = require("../models/User");
const Discount = require("../models/Discount");

/* ======================================================
   UTIL
====================================================== */

const normalizeDate = (d) =>
  new Date(d).toISOString().slice(0, 10);

/* ======================================================
   USER UPSERT
====================================================== */

const findOrCreateRentalUser = async ({
  userName,
  phone,
  email,
  address,
}) => {

  const normalizedAddress = {
    country: address?.country || "India",
    state: address?.state || "Maharashtra",
    city: address?.city || "",
    localAddress: address?.localAddress || "",
  };

  let user = await User.findOne({
    mobile: phone,
    role: "player",
  });

  if (!user) {
    return await User.create({
      fullName: userName,
      mobile: phone,
      email,
      role: "player",
      address: normalizedAddress,
      source: "turf",
      memberSince: new Date(),
    });
  }

  /* ================= UPDATE EXISTING USER ================= */

  await User.findByIdAndUpdate(user._id, {
    fullName: userName,
    email,
    address: normalizedAddress,  // 🔥 FULL ADDRESS SYNC
  });

  return user;
};

/* ======================================================
   CREATE TURF RENTAL (MULTI-DISCOUNT VERSION)
====================================================== */

exports.createTurfRental = async (req, res) => {
  try {
    const {
      source = "website",
      userName,
      phone,
      email = "",
      notes = "",
      address,
      facilityId,
      sportId,
      rentalDate,
      slots,
      paymentMode = "razorpay",

      // WEBSITE COUPONS
      discountCodes = [],

      // ADMIN DIRECT DISCOUNTS
      discounts = [],
    } = req.body;

    if (
      !userName ||
      !phone ||
      !facilityId ||
      !sportId ||
      !rentalDate ||
      !slots?.length
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const date = normalizeDate(rentalDate);

    /* ================= FACILITY VALIDATION ================= */

    const facility = await Facility.findById(facilityId).populate("sports");

    if (!facility || facility.status !== "active") {
      return res.status(409).json({ message: "Facility unavailable" });
    }

    const allowedSport = facility.sports.find(
      (s) => s._id.toString() === sportId
    );

    if (!allowedSport) {
      return res.status(400).json({ message: "Sport not allowed" });
    }

    const slotDoc = await FacilitySlot.findOne({ facilityId });

    if (!slotDoc) {
      return res.status(409).json({ message: "Slots not defined" });
    }

    const activeSlots = slotDoc.slots
      .filter((s) => s.isActive)
      .map((s) => s.startTime);

    if (slots.some((s) => !activeSlots.includes(s))) {
      return res.status(409).json({ message: "Invalid slot selected" });
    }

    const blocked = await BlockedSlot.findOne({
      facilityId,
      date,
      "slots.startTime": { $in: slots },
    });

    if (blocked) {
      return res.status(409).json({ message: "Selected slot is blocked" });
    }

    const conflict = await TurfRental.findOne({
      facilityId,
      rentalDate: date,
      bookingStatus: { $ne: "cancelled" },
      slots: { $in: slots },
    });

    if (conflict) {
      return res.status(409).json({ message: "Slot already booked" });
    }

    /* ================= USER ================= */

    const user = await findOrCreateRentalUser({
      userName,
      phone,
      email,
      address: {
  country: address?.country || "India",
  state: address?.state || "Maharashtra",
  city: address?.city || "",
  localAddress: address?.localAddress || "",
},
    });

    /* ================= AMOUNT CALCULATION ================= */

    const durationHours = slots.length;
    const hourlyRate = facility.hourlyRate;
    const baseAmount = hourlyRate * durationHours;

    let runningAmount = baseAmount;
    let totalDiscountAmount = 0;
    let appliedDiscounts = [];

    /* ======================================================
       ADMIN DIRECT DISCOUNTS
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
       WEBSITE COUPONS
    ====================================================== */

    else if (discountCodes.length > 0) {
      const today = new Date();

      const discountDocs = await Discount.find({
        code: { $in: discountCodes },
        applicableFor: "turf",
        isActive: true,
        $or: [{ validFrom: null }, { validFrom: { $lte: today } }],
        $and: [
          {
            $or: [{ validTill: null }, { validTill: { $gte: today } }],
          },
        ],
      });

      for (let discount of discountDocs) {
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
          code: discount.code,
          type: discount.type,
          value: discount.value,
          discountAmount: Math.round(discountValue),
        });
      }
    }

    const finalAmount = Math.max(0, Math.round(runningAmount));

    /* ================= PAYMENT LOGIC ================= */

    let paymentStatus = "unpaid";
    let bookingStatus = "pending";

    if (source === "admin") {
      paymentStatus = "paid";
      bookingStatus = "confirmed";
    }

    /* ================= CREATE RECORD ================= */

    const rental = await TurfRental.create({
      source,
      userId: user._id,

      userName,
      phone,
      email,
      notes,

      address: address || {
        country: "India",
        state: "Maharashtra",
      },

      facilityId,
      facilityName: facility.name,
      facilityType: facility.type,

      sportId: allowedSport._id,
      sportName: allowedSport.name,

      rentalDate: date,
      slots,
      durationHours,
      hourlyRate,

      baseAmount,
      discounts: appliedDiscounts,
      totalDiscountAmount: Math.round(totalDiscountAmount),
      finalAmount,

      paymentMode,
      paymentStatus,
      bookingStatus,
    });

    res.status(201).json(rental);

  } catch (err) {
    console.error("Create TurfRental Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   GET ALL TURF RENTALS
====================================================== */

exports.getTurfRentals = async (req, res) => {
  try {
    const rentals = await TurfRental.find()
      .populate("facilityId", "name type status")
      .sort({ createdAt: -1 });

    res.json(rentals);
  } catch (err) {
    console.error("Get TurfRentals Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET SINGLE TURF RENTAL
====================================================== */

exports.getTurfRentalById = async (req, res) => {
  try {
    const rental = await TurfRental.findById(req.params.id)
      .populate("facilityId", "name type status")
      .lean();

    if (!rental) {
      return res.status(404).json({
        message: "Turf rental not found",
      });
    }

    rental.baseAmount = rental.baseAmount || 0;
    rental.totalDiscountAmount = rental.totalDiscountAmount || 0;
    rental.finalAmount = rental.finalAmount || 0;
    rental.discounts = rental.discounts || [];

    res.json(rental);
  } catch (err) {
    console.error("Get TurfRental Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   UPDATE TURF RENTAL
====================================================== */

exports.updateTurfRental = async (req, res) => {
  try {
    const rental = await TurfRental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({
        message: "Turf rental not found",
      });
    }

    Object.assign(rental, req.body);

    /* SLOT RECALC */
    if (req.body.slots) {
      rental.durationHours = req.body.slots.length;
      rental.baseAmount =
        rental.hourlyRate * rental.durationHours;
    }

    /* DISCOUNT RECALC */
    let runningTotal = rental.baseAmount;
    let totalDiscountAmount = 0;

    const discounts = rental.discounts || [];

    discounts.forEach((d) => {
      let discountValue =
        d.type === "percentage"
          ? (runningTotal * d.value) / 100
          : d.value;

      discountValue = Math.min(discountValue, runningTotal);

      runningTotal -= discountValue;
      totalDiscountAmount += discountValue;
    });

    rental.totalDiscountAmount = Math.round(totalDiscountAmount);
    rental.finalAmount = Math.max(0, Math.round(runningTotal));

    /* SYNC USER ADDRESS */
    if (req.body.address && rental.userId) {
      await User.findByIdAndUpdate(rental.userId, {
        address: req.body.address,
      });
    }

    await rental.save();

    res.json(rental);
  } catch (err) {
    console.error("Update TurfRental Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CANCEL TURF RENTAL
====================================================== */

exports.cancelTurfRental = async (req, res) => {
  try {
    const rental = await TurfRental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({
        message: "Turf rental not found",
      });
    }

    rental.bookingStatus = "cancelled";
    rental.paymentStatus = "unpaid";

    await rental.save();

    res.json({
      message: "Booking cancelled successfully",
    });
  } catch (err) {
    console.error("Cancel TurfRental Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   DELETE TURF RENTAL
====================================================== */

exports.deleteTurfRental = async (req, res) => {
  try {
    const rental = await TurfRental.findByIdAndDelete(req.params.id);

    if (!rental) {
      return res.status(404).json({
        message: "Turf rental not found",
      });
    }

    res.json({
      message: "Turf rental deleted successfully",
    });
  } catch (err) {
    console.error("Delete TurfRental Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
