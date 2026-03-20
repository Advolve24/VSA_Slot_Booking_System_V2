const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
{
  invoiceNo: {
    type: String,
    unique: true,
  },

  type: {
    type: String,
    enum: ["enrollment", "renewal", "turf"],
    required: true,
  },

  user: {
    name: String,
    mobile: String,
    email: String,
  },

  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Enrollment",
  },

  turfRentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TurfRental",
  },

  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
    required: true,
  },

  itemDescription: String,

  qty: Number,

  subTotal: Number,
  discount: { type: Number, default: 0 },
  total: Number,

  paymentMode: String,

  status: {
    type: String,
    enum: ["paid", "pending"],
    default: "paid",
  },

}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);