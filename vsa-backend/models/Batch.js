const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sport",
    required: true
  },

  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Facility",
    required: true
  },

  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    required: true
  },

  coachName: {
    type: String,
    required: true,
    trim: true
  },

  /* ================= SCHEDULE ================= */

  daysOfWeek: {
    type: [Number],
    required: true
  },

  startTime: {
    type: String,
    required: true
  },

  endTime: {
    type: String,
    required: true
  },

  startMin: {
    type: Number,
    required: true
  },

  endMin: {
    type: Number,
    required: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  /* ================= PRICING ================= */

  monthlyFee: {
    type: Number,
    required: true
  },

  registrationFee: {
  type: Number,
  default: 0
},

  hasQuarterly: {
    type: Boolean,
    default: false
  },

  quarterlyFee: {
    type: Number,
    default: 0
  },

  capacity: {
    type: Number,
    required: true
  },

  enrolledCount: {
    type: Number,
    default: 0
  }

},
{ timestamps: true }
);

batchSchema.index({
  facilityId: 1,
  isActive: 1,
  daysOfWeek: 1,
  startMin: 1,
  endMin: 1
});

module.exports = mongoose.model("Batch", batchSchema);