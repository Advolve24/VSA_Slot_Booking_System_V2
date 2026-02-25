const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    /* ================= USER LINK ================= */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* ================= PLAYER SNAPSHOT ================= */
    playerName: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      required: true,
    },

    mobile: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    /* ================= ADDRESS SNAPSHOT ================= */
    address: {
      country: { type: String, default: "India" },
      state: { type: String, default: "Maharashtra" },
      city: { type: String, trim: true },
      localAddress: { type: String, trim: true },
    },

    /* ================= BATCH SNAPSHOT ================= */
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },

    batchName: { type: String, required: true },
    sportName: { type: String, required: true },
    coachName: { type: String, required: true },

    /* ================= PLAN ================= */
    planType: {
      type: String,
      enum: ["monthly", "quarterly"],
      default: "monthly",
    },

    durationMonths: {
      type: Number,
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    /* ================= PAYMENT CALCULATION ================= */
    monthlyFee: {
      type: Number,
      required: true,
    },

    baseAmount: {
      type: Number,
      required: true,
    },

    /* ================= DISCOUNT STRUCTURE ================= */

    discounts: [
      {
        discountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Discount",
        },
        title: String, // Store title for invoice reference
        code: String,  // Can be null (for auto discount)
        type: {
          type: String,
          enum: ["percentage", "flat"],
        },
        value: Number,
        discountAmount: Number,
      },
    ],

    totalDiscountAmount: {
      type: Number,
      default: 0,
    },

    finalAmount: {
      type: Number,
      required: true,
    },

    /* ================= PAYMENT STATUS ================= */

    paymentMode: {
      type: String,
      enum: ["cash", "upi", "bank", "razorpay", "online"],
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "unpaid"],
      default: "unpaid",
    },

    /* ================= STATUS ================= */
    status: {
      type: String,
      enum: ["active", "pending", "expiring", "expired", "renewed"],
      default: "active",
    },

    /* ================= META ================= */
    source: {
      type: String,
      enum: ["website", "admin"],
      default: "website",
    },
  },
  { timestamps: true }
);

/* ======================================================
   🔒 CRITICAL UNIQUE INDEX (NO DUPLICATE ENROLLMENT)
====================================================== */

enrollmentSchema.index(
  { userId: 1, batchId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);
