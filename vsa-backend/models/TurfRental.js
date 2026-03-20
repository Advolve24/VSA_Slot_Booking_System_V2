const mongoose = require("mongoose");

const turfRentalSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  source: {
    type: String,
    enum: ["website", "admin"],
    default: "website",
  },

  userName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: "" },

  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Facility",
    required: true,
  },

  facilityName: String,
  facilityType: String,

  sportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sport",
    required: true,
  },

  sportName: String,

  rentalDate: {
    type: String,
    required: true,
  },

  startTime: String,
  endTime: String,

  startMin: Number,
  endMin: Number,

  durationMinutes: Number,

  hourlyRate: Number,
  baseAmount: Number,

  finalAmount: Number,

  requiredAdvance: Number,

  totalPaid: {
    type: Number,
    default: 0,
  },

  dueAmount: Number,

  bookingStatus: {
    type: String,
    enum: ["confirmed", "pending", "cancelled"],
    default: "pending",
  },

  refundStatus: {
  type: String,
  enum: ["none", "pending", "approved", "rejected"],
  default: "none"
},

refundAmount: {
  type: Number,
  default: 0
},

refundApprovedAt: Date,

cancellationSource: {
  type: String,
  enum: ["admin", "user"],
  default: null
},

cancelledAt: Date,

  payments: [
{
  payerName: String,
  mode: {
    type: String,
    enum: ["cash","upi","card","razorpay"]
  },
  amount: Number,
  paymentType: {
    type: String,
    enum:["advance","balance","full"]
  },
  paymentId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:"Payment"
  },
  createdAt:{
    type: Date,
    default: Date.now
  }
}
]

},
{ timestamps: true }
);

turfRentalSchema.index({
  facilityId: 1,
  rentalDate: 1,
  bookingStatus: 1,
  startMin: 1,
  endMin: 1,
});

module.exports = mongoose.model("TurfRental", turfRentalSchema);