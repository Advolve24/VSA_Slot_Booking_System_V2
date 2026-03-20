const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
{
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    index:true
  },

  playerName:{ type:String, required:true },
  age:{ type:Number, required:true },
  dateOfBirth:{ type:Date, required:true },

  gender:{
    type:String,
    enum:["male","female","other"]
  },

  mobile:{ type:String, required:true },
  email:String,

  address:{
    country:{ type:String, default:"India" },
    state:{ type:String, default:"Maharashtra" },
    city:String,
    localAddress:String
  },

  batchId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Batch",
    required:true,
    index:true
  },

  batchName:String,
  sportName:String,
  coachName:String,

  /* ================= PLAN ================= */

  planType:{
    type:String,
    enum:["monthly","quarterly"],
    default:"monthly"
  },

  durationMonths:Number,

  startDate:Date,
  endDate:Date,

  /* ================= REGULAR LEAVE ================= */

  leaveActive: { type: Boolean, default: false },

leaveStartDate: Date,
leaveEndDate: Date,

leaveDays: { type: Number, default: 0 },

leaveReason: String,
  /* ================= RENEWAL EMAIL CONTROL ================= */

  renewLinkActive:{
    type:Boolean,
    default:true
  },

  renewalCompleted:{
    type:Boolean,
    default:false
  },

  /* ================= PENDING RENEWAL ================= */

  pendingRenewal:{
    startDate:Date,
    endDate:Date,
    planType:{
      type:String,
      enum:["monthly","quarterly"]
    },
    durationMonths:Number,
    amount:Number,
    createdAt:Date
  },

  /* ================= PAYMENT ================= */

  monthlyFee:Number,
  quarterlyFee:Number,

  baseAmount:Number,
  registrationFee:Number,

  registrationFeeApplied:{
    type:Boolean,
    default:false
  },

  discounts:[],
  totalDiscountAmount:{ type:Number, default:0 },

  finalAmount:Number,

  paymentMode:{
    type:String,
    enum:["cash","upi","bank","razorpay","online"]
  },

  paymentStatus:{
    type:String,
    enum:["paid","pending","unpaid"],
    default:"unpaid"
  },

  status:{
    type:String,
    enum:["active","pending","expiring","expired"],
    default:"active",
    index:true
  },

  /* ================= RENEWAL HISTORY ================= */

  renewalHistory:[
    {
      startDate:Date,
      endDate:Date,
      planType:String,
      amount:Number,
      renewedAt:Date
    }
  ],

  /* ================= SOURCE ================= */

  source:{
    type:String,
    enum:["website","admin"],
    default:"website"
  }

},
{ timestamps:true }
);

/* ================= UNIQUE INDEX ================= */

enrollmentSchema.index(
  { userId:1, batchId:1 },
  { unique:true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);