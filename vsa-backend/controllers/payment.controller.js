const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const TurfRental = require("../models/TurfRental");
const Batch = require("../models/Batch");
const FacilitySlot = require("../models/FacilitySlot");
const {
  sendEnrollmentMail,
  sendTurfBookingMail,
} = require("../utils/mailer");

/* ======================================================
   CREATE RAZORPAY ORDER
====================================================== */
exports.createOrder = async (req, res) => {
  try {
    const { purpose, enrollmentId, turfRentalId } = req.body;

    if (!purpose) {
      return res.status(400).json({ message: "Purpose required" });
    }

    let amount = 0;

    /* ================= ENROLLMENT ================= */
    if (purpose === "enrollment") {
      const enrollment = await Enrollment.findById(enrollmentId);

      if (!enrollment)
        return res.status(404).json({ message: "Enrollment not found" });

      if (enrollment.paymentStatus === "paid") {
        return res.status(400).json({ message: "Already paid" });
      }

      amount = enrollment.finalAmount;
    }

    /* ================= TURF ================= */
    if (purpose === "turf") {
      const rental = await TurfRental.findById(turfRentalId);

      if (!rental)
        return res.status(404).json({ message: "Turf booking not found" });

      if (rental.paymentStatus === "paid") {
        return res.status(400).json({ message: "Already paid" });
      }

      amount = rental.finalAmount || rental.totalAmount;
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    const payment = await Payment.create({
      razorpayOrderId: order.id,
      amount,
      purpose,
      enrollmentId,
      turfRentalId,
      status: "created",
    });

    res.json({
      orderId: order.id,
      amount,
      key: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
    });

  } catch (err) {
    console.error("Create Order Error:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
};

/* ======================================================
   VERIFY PAYMENT
====================================================== */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId,
    } = req.body;

    /* ================= SIGNATURE VERIFY ================= */
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    /* ======================================================
       🔒 IDEMPOTENCY CHECK (CRITICAL)
    ====================================================== */

    if (payment.status === "paid") {
      return res.json({ success: true });
    }

    /* ================= UPDATE PAYMENT ================= */

    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    await payment.save();

    /* ======================================================
       🔥 ENROLLMENT PAYMENT SUCCESS (SAFE VERSION)
    ====================================================== */

    if (payment.purpose === "enrollment") {

      const enrollment = await Enrollment.findById(
        payment.enrollmentId
      ).populate("batchId");

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      /* 🔒 IMPORTANT:
         Only update if NOT already paid
         Prevents duplicate seat increment
      */

      if (enrollment.paymentStatus !== "paid") {

        enrollment.paymentStatus = "paid";
        enrollment.paymentMode = "razorpay";
        enrollment.status = "active";
        await enrollment.save();

        /* 🔒 SAFE SEAT INCREMENT */
        await Batch.findOneAndUpdate(
          {
            _id: enrollment.batchId._id,
            enrolledCount: { $lt: enrollment.batchId.capacity },
          },
          { $inc: { enrolledCount: 1 } }
        );

        /* ================= SLOT RESOLUTION ================= */

        let slotTime = "Not Assigned";

        if (enrollment.batchId?.slotId) {
          const slotDoc = await FacilitySlot.findOne({
            facilityId: enrollment.batchId.facilityId,
          }).lean();

          if (slotDoc?.slots?.length) {
            const slot = slotDoc.slots.find(
              (s) =>
                String(s._id) === String(enrollment.batchId.slotId)
            );

            if (slot) {
              slotTime =
                slot.label ||
                `${slot.startTime} – ${slot.endTime}`;
            }
          }
        }

        /* 🔥 FIRE & FORGET EMAIL */
        if (enrollment.email) {
          sendEnrollmentMail({
            to: enrollment.email,
            playerName: enrollment.playerName,
            sportName: enrollment.sportName,
            batchName: enrollment.batchName,
            coachName: enrollment.coachName,
            planType: enrollment.planType,
            schedule: enrollment.batchId.schedule,
            slotTime,
            batchStartDate: enrollment.batchId.startDate,
            batchEndDate: enrollment.batchId.endDate,
            enrollmentStartDate: enrollment.startDate,
            enrollmentEndDate: enrollment.endDate,
            baseAmount: enrollment.baseAmount,
            totalDiscountAmount: enrollment.totalDiscountAmount,
            finalAmount: enrollment.finalAmount,
            enrollmentId: enrollment._id,
          }).catch((err) =>
            console.error("Enrollment Mail Error:", err)
          );
        }
      }
    }

    /* ======================================================
        TURF BOOKING PAYMENT SUCCESS (SAFE VERSION)
    ====================================================== */

    if (payment.purpose === "turf") {

      const rental = await TurfRental.findById(
        payment.turfRentalId
      );

      if (!rental) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (rental.paymentStatus !== "paid") {

        rental.paymentStatus = "paid";
        rental.paymentMode = "razorpay";
        rental.bookingStatus = "confirmed";
        await rental.save();

        if (rental.email) {
          sendTurfBookingMail({
            to: rental.email,
            userName: rental.userName,
            facilityName: rental.facilityName,
            sportName: rental.sportName,
            rentalDate: rental.rentalDate,
            slots: rental.slots,
            baseAmount: rental.baseAmount,
            totalDiscountAmount: rental.totalDiscountAmount,
            finalAmount: rental.finalAmount || rental.totalAmount,
            bookingId: rental._id,
          }).catch((err) =>
            console.error("Turf Mail Error:", err)
          );
        }
      }
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("Verify Payment Error:", err);
    return res.status(500).json({
      message: "Payment verification failed",
    });
  }
};