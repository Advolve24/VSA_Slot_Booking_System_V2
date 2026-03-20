const mongoose = require("mongoose");

const time12hRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
const time24hRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const blockedTimeSchema = new mongoose.Schema(
{
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Facility",
    required: true,
  },

  date: {
    type: String, // YYYY-MM-DD
    required: true,
  },

  startTime: {
    type: String,
    required: true,
    validate: {
      validator: (v) => time12hRegex.test(v) || time24hRegex.test(v),
      message: "Invalid start time",
    },
  },

  endTime: {
    type: String,
    required: true,
    validate: {
      validator: (v) => time12hRegex.test(v) || time24hRegex.test(v),
      message: "Invalid end time",
    },
  },

  startMin: Number,
  endMin: Number,

  reason: {
    type: String,
    enum: ["coaching", "maintenance", "event", "admin"],
    default: "admin",
  },

},
{ timestamps: true }
);

blockedTimeSchema.index({
  facilityId: 1,
  date: 1,
  startMin: 1,
  endMin: 1,
});

module.exports = mongoose.model("BlockedTime", blockedTimeSchema);