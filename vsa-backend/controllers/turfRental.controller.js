const TurfRental = require("../models/TurfRental");
const Facility = require("../models/Facility");
const Batch = require("../models/Batch");
const User = require("../models/User");
const Payment = require("../models/Payment");
const BlockedTime = require("../models/BlockedTime");
const { upsertUser } = require("../utils/upsertUser");

/* ================= UTIL ================= */

const normalizeDate = (d) => new Date(d).toISOString().slice(0, 10);

const toMinutes = (time) => {
  const [h, m] = String(time).split(":").map(Number);
  return h * 60 + m;
};

/* ================= PRICE CALCULATION ================= */

const calculatePrice = (facility, startMin, endMin) => {

  const duration = endMin - startMin;

  /* FLAT HOURLY */

  if (facility.pricingMode === "flat") {

    const ratePerMinute = facility.hourlyRate / 60;

    return Math.round(ratePerMinute * duration);

  }

  /* TIME BASED */

  let total = 0;

  for (const slot of facility.timeSlots) {

    const slotStart = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);

    const overlapStart = Math.max(startMin, slotStart);
    const overlapEnd = Math.min(endMin, slotEnd);

    if (overlapStart < overlapEnd) {

      const minutes = overlapEnd - overlapStart;

      total += (slot.price / 60) * minutes;

    }
  }

  return Math.round(total);
};

/* ================= CREATE RENTAL ================= */

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
      startTime,
      endTime,
      paymentType = "none",
      paymentMode = "cash"
    } = req.body;

    if (!userName || !phone || !facilityId || !sportId || !rentalDate || !startTime || !endTime) {

      return res.status(400).json({ message: "Missing fields" });

    }

    const date = normalizeDate(rentalDate);

    /* ================= CLEAN OLD PENDING BOOKINGS ================= */

    await TurfRental.deleteMany({
      facilityId,
      rentalDate: date,
      bookingStatus: "pending",
      createdAt: {
        $lt: new Date(Date.now() - 10 * 60 * 1000) // older than 10 min
      }
    });

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (endMin <= startMin)

      return res.status(400).json({ message: "End time must be after start time" });

    const durationMinutes = endMin - startMin;

    /* ================= FACILITY ================= */

    const facility = await Facility.findById(facilityId).populate("sports");

    if (!facility || facility.status !== "active")

      return res.status(409).json({ message: "Facility unavailable" });

    const allowedSport = facility.sports.find(

      (s) => s._id.toString() === sportId

    );

    if (!allowedSport)

      return res.status(400).json({ message: "Sport not allowed" });

    /* ================= USER ================= */

    const user = await upsertUser({

      fullName: userName,
      mobile: phone,
      email,

      address: {
        country: address?.country || "India",
        state: address?.state || "Maharashtra",
        city: address?.city || "",
        localAddress: address?.localAddress || ""
      },

      sourceType: "turf"

    });

    /* ================= SAME USER RETRY PROTECTION ================= */

    const existingPending = await TurfRental.findOne({

      userId: user._id,
      facilityId,
      rentalDate: date,
      startMin,
      endMin,
      bookingStatus: "pending"

    });

    if (existingPending) {

      return res.status(200).json(existingPending);

    }

    /* ================= SLOT CONFLICT ================= */

    const rentalConflict = await TurfRental.findOne({

      facilityId,
      rentalDate: date,
      bookingStatus: { $in: ["pending", "confirmed"] },
      startMin: { $lt: endMin },
      endMin: { $gt: startMin }

    });

    if (rentalConflict) {

      return res.status(409).json({
        message: "Selected time already booked"
      });

    }
    /* ================= BATCH CONFLICT ================= */

    const dow = new Date(date).getDay();

    const batchConflict = await Batch.findOne({

      facilityId,
      isActive: true,
      daysOfWeek: dow,
      startMin: { $lt: endMin },
      endMin: { $gt: startMin },

    });

    if (batchConflict)

      return res.status(409).json({

        message: "Selected time conflicts with coaching batch"

      });

    /* ================= BLOCKED SLOT CONFLICT ================= */

    const blockedConflict = await BlockedTime.findOne({

      facilityId,
      date,
      startMin: { $lt: endMin },
      endMin: { $gt: startMin },

    });

    if (blockedConflict)

      return res.status(409).json({

        message: "Selected time is blocked by admin"

      });

    /* ================= PRICE ================= */

    const baseAmount = calculatePrice(facility, startMin, endMin);

    const finalAmount = baseAmount;

    /* ================= ADVANCE ================= */

    let requiredAdvance = 0;

    if (facility.advanceType === "percent") {

      requiredAdvance = Math.round(

        (finalAmount * facility.advanceValue) / 100

      );

    } else {

      requiredAdvance = Number(facility.advanceValue || 0);

    }

    requiredAdvance = Math.min(requiredAdvance, finalAmount);

    /* ================= PAYMENT CALC ================= */

    let totalPaid = 0;

    if (paymentType === "advance")

      totalPaid = requiredAdvance;

    if (paymentType === "full")

      totalPaid = finalAmount;

    const dueAmount = finalAmount - totalPaid;

    /* ================= CREATE RENTAL ================= */

    const rental = await TurfRental.create({

      source,

      userId: user._id,
      userName,
      phone,
      email,
      notes,
      address,

      facilityId,
      facilityName: facility.name,
      facilityType: facility.type,

      sportId: allowedSport._id,
      sportName: allowedSport.name,

      rentalDate: date,

      startTime,
      endTime,

      startMin,
      endMin,

      durationMinutes,

      hourlyRate: facility.hourlyRate,

      baseAmount,
      finalAmount,

      requiredAdvance,
      totalPaid,
      dueAmount,

      bookingStatus: dueAmount === 0 ? "confirmed" : "pending"

    });

    res.status(201).json(rental);

  } catch (err) {

    console.error("Create TurfRental Error:", err);

    res.status(500).json({

      message: err.message

    });

  }

};

/* ======================================================
   GET ALL TURF RENTALS
====================================================== */
exports.getTurfRentals = async (req, res) => {
  try {

    const rentals = await TurfRental.find()
      .populate("facilityId", "name type status")
      .sort({ createdAt: -1 })
      .lean();

    const rentalIds = rentals.map(r => r._id);

    /* GET ALL PAYMENTS IN ONE QUERY */
    const payments = await Payment.find({
      purpose: "turf",
      turfRentalId: { $in: rentalIds },
      status: "paid"
    }).lean();

    /* GROUP PAYMENTS BY RENTAL */
    const paymentMap = {};

    payments.forEach(p => {

      const key = p.turfRentalId.toString();

      if (!paymentMap[key]) {
        paymentMap[key] = [];
      }

      paymentMap[key].push(p);

    });

    /* MERGE PAYMENT DATA INTO RENTALS */
    const result = rentals.map(r => {

      const key = r._id.toString();
      const p = paymentMap[key] || [];

      const totalPaid = p.reduce(
        (sum, pay) => sum + Number(pay.amount || 0),
        0
      );

      return {
        ...r,

        payments: p,

        totalPaid,

        dueAmount: Math.max(0, (r.finalAmount || 0) - totalPaid),

        paymentType: p.length ? p[0].paymentType : "none",

        paymentMode: p.length ? p[0].mode : null

      };

    });

    res.json(result);

  } catch (err) {

    console.error("Get TurfRentals Error:", err);

    res.status(500).json({
      message: "Server error"
    });

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
        message: "Turf rental not found"
      });
    }

    /* ================= GET PAYMENTS ================= */

    const payments = await Payment.find({
      purpose: "turf",
      turfRentalId: rental._id,
      status: "paid"
    })
      .sort({ createdAt: 1 })
      .lean();

    /* ================= CALCULATE TOTAL ================= */

    const totalPaid = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    const dueAmount = Math.max(
      0,
      (rental.finalAmount || 0) - totalPaid
    );

    /* ================= FORMAT PAYMENT HISTORY ================= */

    const paymentHistory = payments.map((p) => {

      const dateObj = new Date(p.createdAt);

      return {
        _id: p._id,
        payerName: p.payerName || rental.userName,
        mode: p.mode || "razorpay",
        amount: p.amount,
        paymentType: p.paymentType || "balance",

        date: dateObj.toLocaleDateString("en-IN"),
        time: dateObj.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit"
        }),

        createdAt: p.createdAt
      };
    });

    /* ================= FULL PAYMENT TIME ================= */

    let fullyPaidAt = null;

    if (dueAmount === 0 && payments.length) {
      fullyPaidAt = payments[payments.length - 1].createdAt;
    }

    /* ================= RESPONSE ================= */

    res.json({

      ...rental,

      payments: paymentHistory,

      totalPaid,

      dueAmount,

      paymentSummary: {
        totalAmount: rental.finalAmount,
        totalPaid,
        dueAmount,
        paymentCount: payments.length,
        fullyPaidAt
      }

    });

  } catch (err) {

    console.error("Get TurfRental Error:", err);

    res.status(500).json({
      message: "Server error"
    });

  }
};
/* ======================================================
   ADD PAYMENT (ADVANCE / BALANCE / FULL / SPLIT)
   This works for cash/upi also (admin adds later)
====================================================== */
exports.addTurfPayment = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      payerName = "Customer",
      amount,
      mode = "cash",
      paymentType = "balance"
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Invalid payment amount"
      });
    }

    /* ================= FIND BOOKING ================= */

    const rental = await TurfRental.findById(id);

    if (!rental) {
      return res.status(404).json({
        message: "Booking not found"
      });
    }

    /* ================= CHECK REMAINING ================= */

    const remaining = rental.finalAmount - rental.totalPaid;

    if (Number(amount) > remaining) {
      return res.status(400).json({
        message: `Payment exceeds due amount. Remaining: ₹${remaining}`
      });
    }

    /* ================= CREATE PAYMENT RECORD ================= */

    const payment = await Payment.create({

      purpose: "turf",
      turfRentalId: rental._id,

      payerName,
      mode,

      paymentType,
      amount: Number(amount),

      status: "paid"

    });

    /* ================= UPDATE BOOKING SNAPSHOT ================= */

    // rental.payments.push({

    //   payerName,
    //   mode,
    //   paymentType,
    //   amount: Number(amount),
    //   paymentId: payment._id

    // });

    /* ================= UPDATE TOTAL ================= */

    rental.totalPaid += Number(amount);

    rental.dueAmount = Math.max(
      0,
      rental.finalAmount - rental.totalPaid
    );

    /* ================= BOOKING STATUS ================= */

    if (rental.dueAmount === 0) {
      rental.bookingStatus = "confirmed";
    }

    await rental.save();

    /* ================= RESPONSE ================= */

    res.json({

      message: "Payment added successfully",

      payment,

      rental

    });

  } catch (err) {

    console.error("Add Turf Payment Error:", err);

    res.status(500).json({
      message: "Server error"
    });

  }

};
/* ======================================================
   UPDATE TURF RENTAL (time change)
   Re-check conflicts
====================================================== */
exports.updateTurfRental = async (req, res) => {
  try {
    const rental = await TurfRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Turf rental not found" });

    // do not allow update cancelled
    if (rental.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "Cancelled booking cannot be updated" });
    }

    const newStartTime = req.body.startTime ?? rental.startTime;
    const newEndTime = req.body.endTime ?? rental.endTime;

    const startMin = toMinutes(newStartTime);
    const endMin = toMinutes(newEndTime);
    const durationMinutes = endMin - startMin;

    if (durationMinutes < 60) {
      return res.status(400).json({ message: "Minimum 1 hour booking required" });
    }
    if (durationMinutes % 30 !== 0) {
      return res.status(400).json({ message: "Duration must be in 30 minute steps" });
    }
    if (endMin <= startMin) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const date = rental.rentalDate;

    // rental conflict
    const rentalConflict = await TurfRental.findOne({
      _id: { $ne: rental._id },
      facilityId: rental.facilityId,
      rentalDate: date,
      bookingStatus: { $ne: "cancelled" },
      startMin: { $lt: endMin },
      endMin: { $gt: startMin },
    });

    if (rentalConflict) {
      return res.status(409).json({ message: "Selected time already booked" });
    }

    // batch conflict
    const dow = new Date(date).getDay();
    const batchConflict = await Batch.findOne({
      facilityId: rental.facilityId,
      isActive: true,
      daysOfWeek: dow,
      startMin: { $lt: endMin },
      endMin: { $gt: startMin },
    });

    if (batchConflict) {
      return res.status(409).json({ message: "Selected time conflicts with coaching batch" });
    }

    // apply changes
    rental.startTime = newStartTime;
    rental.endTime = newEndTime;
    rental.startMin = startMin;
    rental.endMin = endMin;
    rental.durationMinutes = durationMinutes;

    // price recalc (same hourlyRate)
    const hours = durationMinutes / 60;
    rental.baseAmount = Math.round(rental.hourlyRate * hours);

    // discounts recalc (same logic)
    let running = rental.baseAmount;
    let totalDiscount = 0;

    const ds = rental.discounts || [];
    for (let d of ds) {
      let dv = d.type === "percentage" ? (running * d.value) / 100 : d.value;
      dv = Math.min(dv, running);
      running -= dv;
      totalDiscount += dv;
      d.discountAmount = Math.round(dv);
    }

    rental.totalDiscountAmount = Math.round(totalDiscount);
    rental.finalAmount = Math.max(0, Math.round(running));

    // requiredAdvance might change based on finalAmount and facility rule
    const facility = await Facility.findById(rental.facilityId);
    let requiredAdvance = 0;

    if (facility?.advanceType === "percent") {
      requiredAdvance = Math.round((rental.finalAmount * Number(facility.advanceValue || 0)) / 100);
    } else {
      requiredAdvance = Number(facility?.advanceValue || 0);
    }

    rental.requiredAdvance = Math.max(0, Math.min(requiredAdvance, rental.finalAmount));

    // update due based on already paid
    const paidPayments = await Payment.find({
      purpose: "turf",
      turfRentalId: rental._id,
      status: "paid",
    }).lean();

    const totalPaid = paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

    rental.totalPaid = totalPaid;
    rental.dueAmount = Math.max(0, rental.finalAmount - totalPaid);

    // status based on advance
    if (totalPaid >= rental.requiredAdvance) rental.bookingStatus = "confirmed";
    else rental.bookingStatus = "pending";

    await rental.save();
    res.json(rental);

  } catch (err) {
    console.error("Update TurfRental Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   PREVIEW TURF PRICE (USED IN ADMIN FORM)
====================================================== */

exports.previewTurfPrice = async (req, res) => {

  try {

    const { facilityId, startTime, endTime } = req.body;

    if (!facilityId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const facility = await Facility.findById(facilityId);

    if (!facility)
      return res.status(404).json({ message: "Facility not found" });

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (endMin <= startMin)
      return res.status(400).json({ message: "Invalid time range" });

    const baseAmount = calculatePrice(facility, startMin, endMin);

    const finalAmount = baseAmount;

    /* ================= ADVANCE ================= */

    let requiredAdvance = 0;

    if (facility.advanceType === "percent") {

      requiredAdvance = Math.round(
        (finalAmount * facility.advanceValue) / 100
      );

    } else {

      requiredAdvance = Number(facility.advanceValue || 0);

    }

    requiredAdvance = Math.min(requiredAdvance, finalAmount);

    res.json({
      baseAmount,
      finalAmount,
      requiredAdvance
    });

  } catch (err) {

    console.error("Preview Turf Price Error:", err);

    res.status(500).json({ message: "Server error" });

  }

};
/* ======================================================
   CANCEL TURF RENTAL
====================================================== */
exports.cancelTurfRental = async (req, res) => {

  try {

    const { source = "user" } = req.body;
    // source can be "admin" or "user"

    const rental = await TurfRental.findById(req.params.id);

    if (!rental)
      return res.status(404).json({ message: "Turf rental not found" });

    if (rental.bookingStatus === "cancelled")
      return res.status(400).json({ message: "Booking already cancelled" });

    /* ================= CHECK 6 HOUR POLICY (ONLY USER) ================= */

    if (source === "user") {

      const bookingDateTime = new Date(
        `${rental.rentalDate}T${rental.startTime}:00`
      );

      const now = new Date();

      const diffHours = (bookingDateTime - now) / (1000 * 60 * 60);

      if (diffHours < 6) {

        return res.status(400).json({
          message: "Cancellation allowed only before 6 hours of booking time"
        });

      }

    }

    /* ================= CANCEL BOOKING ================= */

    rental.bookingStatus = "cancelled";

    rental.cancellationSource = source;

    rental.cancelledAt = new Date();

    /* ================= REFUND LOGIC ================= */

    if (rental.totalPaid > 0) {

      rental.refundAmount = rental.totalPaid;

      if (source === "admin") {

        /* ADMIN CANCEL → AUTO APPROVE */

        rental.refundStatus = "approved";
        rental.refundApprovedAt = new Date();

      } else {

        /* USER CANCEL → ADMIN APPROVAL REQUIRED */

        rental.refundStatus = "pending";

      }

    }

    await rental.save();

    res.json({

      message: "Booking cancelled successfully",

      cancellationSource: rental.cancellationSource,
      refundStatus: rental.refundStatus,
      refundAmount: rental.refundAmount

    });

  } catch (err) {

    console.error("Cancel TurfRental Error:", err);

    res.status(500).json({ message: "Server error" });

  }

};

exports.approveRefund = async (req, res) => {

  try {

    const rental = await TurfRental.findById(req.params.id);

    if (!rental)
      return res.status(404).json({ message: "Booking not found" });

    if (rental.refundStatus !== "pending")
      return res.status(400).json({ message: "No refund pending" });

    rental.refundStatus = "approved";

    rental.refundApprovedAt = new Date();

    await rental.save();

    res.json({
      message: "Refund approved successfully"
    });

  } catch (err) {

    console.error("Approve Refund Error:", err);

    res.status(500).json({ message: "Server error" });

  }

};
/* ======================================================
   DELETE TURF RENTAL
====================================================== */
exports.deleteTurfRental = async (req, res) => {
  try {
    const rental = await TurfRental.findByIdAndDelete(req.params.id);
    if (!rental) return res.status(404).json({ message: "Turf rental not found" });

    // optional: also delete payments
    await Payment.deleteMany({
      purpose: "turf",
      turfRentalId: rental._id,
    });

    res.json({ message: "Turf rental deleted successfully" });
  } catch (err) {
    console.error("Delete TurfRental Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};