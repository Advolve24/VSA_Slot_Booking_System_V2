const crypto = require("crypto");
const razorpay = require("../config/razorpay");

const Payment = require("../models/Payment");
const Enrollment = require("../models/Enrollment");
const TurfRental = require("../models/TurfRental");
const Batch = require("../models/Batch");
const Invoice = require("../models/Invoice");

const {
  sendEnrollmentMail,
  sendTurfBookingMail
} = require("../utils/mailer");

const generateInvoiceNo = (id) =>
  `INV-${new Date().getFullYear()}-${id.toString().slice(-6).toUpperCase()}`;

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
   CREATE RAZORPAY ORDER
====================================================== */

exports.createOrder = async (req, res) => {

  try {

    const {
      purpose,
      enrollmentId,
      turfRentalId,
      amount,
      paymentType
    } = req.body;

    if (!purpose)
      return res.status(400).json({ message: "Purpose required" });

    let payableAmount = 0;


    /* ======================================================
       ENROLLMENT
    ====================================================== */

    if (purpose === "enrollment") {

      const enrollment = await Enrollment.findById(enrollmentId)
        .populate("batchId");

      if (!enrollment)
        return res.status(404).json({ message: "Enrollment not found" });

      if (enrollment.paymentStatus === "paid")
        return res.status(400).json({ message: "Already paid" });

      payableAmount = enrollment.finalAmount;

    }

    /* ======================================================
   RENEWAL
====================================================== */

    if (purpose === "renewal") {

      const enrollment = await Enrollment
        .findById(enrollmentId)
        .populate("batchId");

      if (!enrollment)
        return res.status(404).json({ message: "Enrollment not found" });

      const batch = enrollment.batchId;

      if (!batch)
        return res.status(400).json({ message: "Batch not found" });

      if (paymentType === "quarterly")
        payableAmount = batch.quarterlyFee;
      else
        payableAmount = batch.monthlyFee;

    }

    /* ======================================================
       TURF BOOKING
    ====================================================== */

    if (purpose === "turf") {

      const rental = await TurfRental.findById(turfRentalId);

      if (!rental)
        return res.status(404).json({ message: "Booking not found" });

      if (rental.bookingStatus === "cancelled")
        return res.status(400).json({ message: "Booking cancelled" });


      const paidPayments = await Payment.find({
        purpose: "turf",
        turfRentalId,
        status: "paid"
      });

      const totalPaid = paidPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );

      const remaining = rental.finalAmount - totalPaid;

      if (remaining <= 0)
        return res.status(400).json({ message: "Already fully paid" });

      payableAmount = amount ? Number(amount) : remaining;

      if (payableAmount > remaining)
        payableAmount = remaining;

    }


    if (!payableAmount || payableAmount <= 0)
      return res.status(400).json({ message: "Invalid amount" });


    /* ======================================================
       CREATE RAZORPAY ORDER
    ====================================================== */

    const order = await razorpay.orders.create({

      amount: Math.round(payableAmount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`

    });


    const payment = await Payment.create({

      razorpayOrderId: order.id,
      amount: payableAmount,
      purpose,
      paymentType,
      enrollmentId,
      turfRentalId,
      status: "created"

    });


    res.json({

      orderId: order.id,
      amount: payableAmount,
      key: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id

    });

  }

  catch (err) {

    console.error("Create Order Error:", err);

    res.status(500).json({
      message: "Failed to create order"
    });

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
      paymentId
    } = req.body;

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

    if (payment.status === "paid") {
      return res.json({ success: true });
    }

    /* ================= UPDATE PAYMENT ================= */

    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;

    await payment.save();

    /* ================= PREVENT DUPLICATE INVOICE ================= */

    const existingInvoice = await Invoice.findOne({
      paymentId: payment._id
    });

    if (existingInvoice) {
      return res.json({ success: true });
    }

    /* ======================================================
       ENROLLMENT
    ====================================================== */

    if (payment.purpose === "enrollment") {

      const enrollment = await Enrollment
        .findById(payment.enrollmentId)
        .populate("batchId");

      if (enrollment) {

        enrollment.paymentStatus = "paid";
        enrollment.paymentMode = "razorpay";

        const status = calculateEnrollmentStatus(
          "paid",
          enrollment.endDate,
          enrollment.batchId?.endDate
        );

        enrollment.status = status;
        await enrollment.save();

        await Batch.findOneAndUpdate(
          {
            _id: enrollment.batchId._id,
            enrolledCount: { $lt: enrollment.batchId.capacity }
          },
          { $inc: { enrolledCount: 1 } }
        );

        await sendEnrollmentMail({
          to: enrollment.email,
          enrollment,
          batch: enrollment.batchId
        });

        /* ✅ CREATE INVOICE */
        await Invoice.create({
          invoiceNo: generateInvoiceNo(payment._id),
          type: "enrollment",
          user: {
            name: enrollment.playerName,
            mobile: enrollment.mobile,
            email: enrollment.email,
          },
          enrollmentId: enrollment._id,
          paymentId: payment._id,
          itemDescription: `${enrollment.sportName} - ${enrollment.batchName}`,
          qty: enrollment.durationMonths || 1,
          subTotal: enrollment.baseAmount,
          discount: enrollment.totalDiscountAmount || 0,
          total: enrollment.finalAmount,
          paymentMode: "razorpay",
          status: "paid",
        });
      }
    }

    /* ======================================================
       RENEWAL
    ====================================================== */

    if (payment.purpose === "renewal") {

      const enrollment = await Enrollment
        .findById(payment.enrollmentId)
        .populate("batchId");

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      const batch = enrollment.batchId;

      const planType = payment.paymentType || enrollment.planType;

      let durationMonths = planType === "quarterly" ? 3 : 1;
      let planAmount = planType === "quarterly"
        ? batch.quarterlyFee
        : batch.monthlyFee;

      const today = new Date();

      const startDate =
        today > enrollment.endDate ? today : enrollment.endDate;

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      enrollment.startDate = startDate;
      enrollment.endDate = endDate;
      enrollment.planType = planType;
      enrollment.durationMonths = durationMonths;

      enrollment.paymentStatus = "paid";
      enrollment.paymentMode = "razorpay";
      enrollment.status = "active";

      enrollment.baseAmount = planAmount;
      enrollment.finalAmount = planAmount;

      enrollment.renewLinkActive = false;

      enrollment.renewalHistory.push({
        startDate,
        endDate,
        planType,
        amount: planAmount,
        renewedAt: new Date()
      });

      await enrollment.save();

      /* ✅ CREATE INVOICE */
      await Invoice.create({
        invoiceNo: generateInvoiceNo(payment._id),
        type: "renewal",
        user: {
          name: enrollment.playerName,
          mobile: enrollment.mobile,
          email: enrollment.email,
        },
        enrollmentId: enrollment._id,
        paymentId: payment._id,
        itemDescription: `Renewal - ${enrollment.sportName} (${planType})`,
        qty: durationMonths,
        subTotal: planAmount,
        discount: 0,
        total: planAmount,
        paymentMode: "razorpay",
        status: "paid",
      });
    }

    /* ======================================================
       TURF
    ====================================================== */

    if (payment.purpose === "turf") {

      const rental = await TurfRental.findById(payment.turfRentalId);

      if (!rental) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const paidPayments = await Payment.find({
        purpose: "turf",
        turfRentalId: rental._id,
        status: "paid"
      });

      const totalPaid = paidPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );

      rental.totalPaid = totalPaid;
      rental.dueAmount = rental.finalAmount - totalPaid;

      rental.payments.push({
        payerName: payment.payerName || "Customer",
        mode: "razorpay",
        amount: payment.amount,
        paymentType: payment.paymentType,
        paymentId: payment._id
      });

      if (totalPaid >= rental.requiredAdvance) {
        rental.bookingStatus = "confirmed";
      }

      await rental.save();

      await sendTurfBookingMail({
        to: rental.email,
        userName: rental.userName,
        facilityName: rental.facilityName,
        sportName: rental.sportName,
        rentalDate: rental.rentalDate,
        startTime: rental.startTime,
        endTime: rental.endTime,
        finalAmount: rental.finalAmount,
        totalPaid: rental.totalPaid,
        dueAmount: rental.dueAmount,
      });

      /* ✅ CREATE INVOICE */
      await Invoice.create({
        invoiceNo: generateInvoiceNo(payment._id),
        type: "turf",
        user: {
          name: rental.userName,
          mobile: rental.phone,
          email: rental.email,
        },
        turfRentalId: rental._id,
        paymentId: payment._id,
        itemDescription: `${rental.sportName} - ${rental.facilityName}`,
        qty: rental.slots?.length || 1,
        subTotal: payment.amount,
        discount: 0,
        total: payment.amount,
        paymentMode: "razorpay",
        status: "paid",
      });
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("Verify Payment Error:", err);
    return res.status(500).json({
      message: "Payment verification failed"
    });
  }
};

/* ======================================================
   HANDLE PAYMENT CANCELLED
====================================================== */

exports.cancelPayment = async (req, res) => {
  try {

    const { paymentId } = req.body;

    const payment = await Payment.findById(paymentId);

    if (!payment)
      return res.status(404).json({ message: "Payment not found" });

    payment.status = "cancelled";
    await payment.save();

    /* ================= DELETE ENROLLMENT IF PAYMENT CANCELLED ================= */

    if (payment.purpose === "enrollment") {

      const enrollment = await Enrollment.findById(payment.enrollmentId);

      if (enrollment && enrollment.paymentStatus !== "paid") {

        await Enrollment.deleteOne({ _id: enrollment._id });

      }

    }
    /* ================= CANCEL TURF BOOKING ================= */

    if (payment.purpose === "turf") {

      const rental = await TurfRental.findById(payment.turfRentalId);

      if (rental && rental.bookingStatus !== "confirmed") {

        // Delete temporary booking so slot becomes available again
        await TurfRental.deleteOne({ _id: rental._id });

      }

    }

    return res.json({ success: true });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      message: "Cancel payment failed"
    });

  }
};