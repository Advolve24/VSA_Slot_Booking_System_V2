const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
{
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,

  payerName: String,

  mode:{
    type:String,
    enum:["cash","upi","card","razorpay"]
  },

  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },

  purpose: {
    type: String,
    enum: ["enrollment", "turf", "renewal"],
    required: true,
  },

  /* 🔥 NEW FIELD */
  paymentType: {
    type: String,
    enum: ["advance", "balance", "full"],
  },

  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Enrollment",
  },

  turfRentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TurfRental",
  },

  status: {
    type: String,
    enum: ["created", "paid", "failed"],
    default: "created",
  },
},
{ timestamps: true }
);

paymentSchema.index({ turfRentalId: 1, purpose: 1 });
paymentSchema.index({ enrollmentId: 1, purpose: 1 });

module.exports = mongoose.model("Payment", paymentSchema);