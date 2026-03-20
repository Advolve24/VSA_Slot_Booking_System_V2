const mongoose = require("mongoose");

const time12hRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
const time24hRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // optional 24h support

/* ================= TIME SLOT ================= */
const timeSlotSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: true,
      validate: {
        validator: (v) => time12hRegex.test(v) || time24hRegex.test(v),
        message: "Start time must be hh:mm AM/PM or 24h hh:mm",
      },
    },
    end: {
      type: String,
      required: true,
      validate: {
        validator: (v) => time12hRegex.test(v) || time24hRegex.test(v),
        message: "End time must be hh:mm AM/PM or 24h hh:mm",
      },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/* ================= FACILITY ================= */
const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "maintenance", "disabled"],
      default: "active",
    },
    sports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sport",
        required: true,
      },
    ],
    pricingMode: { type: String, enum: ["flat", "time-based"], default: "flat" },
    hourlyRate: { type: Number, min: 0 },
    timeSlots: { type: [timeSlotSchema], default: [] },
    advanceType: { type: String, enum: ["fixed", "percent"], default: "fixed" },
    advanceValue: { type: Number, required: true, min: 0 },
    minBookingMinutes: { type: Number, default: 60 },
    bookingStepMinutes: { type: Number, default: 30 },
    openingTime: {
      type: String,
      validate: {
        validator: (v) => !v || time12hRegex.test(v) || time24hRegex.test(v),
      },
    },
    closingTime: {
      type: String,
      validate: {
        validator: (v) => !v || time12hRegex.test(v) || time24hRegex.test(v),
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Facility", facilitySchema);