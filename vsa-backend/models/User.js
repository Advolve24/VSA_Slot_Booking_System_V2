const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
{
  /* ================= BASIC ================= */

  fullName:{
    type:String,
    required:true,
    trim:true
  },

  password:{
    type:String,
    required:function(){
      return this.role === "admin" || this.role === "staff";
    },
    select:false
  },

  age:{
    type:Number,
    min:1,
    max:100
  },

  dateOfBirth:{
    type:Date,
    default:null
  },

  gender:{
    type:String,
    enum:["male","female","other"],
    default:null
  },

  /* ================= CONTACT ================= */

  mobile:{
    type:String,
    unique:true,
    sparse:true
  },

  email:{
    type:String,
    lowercase:true,
    trim:true
  },

  /* ================= ADDRESS ================= */

  address:{
    country:{type:String,default:"India"},
    state:{type:String,default:"Maharashtra"},
    city:{type:String,trim:true},
    localAddress:{type:String,trim:true}
  },

  /* ================= ROLE ================= */

  role:{
    type:String,
    enum:["player","admin","staff"],
    default:"player"
  },

  /* ================= USER TYPE ================= */

  userTypes:{
    type:[String],
    enum:["coaching","turf"],
    default:[]
  },

  /* ================= SPORTS ================= */

  sportsPlayed:[String],

  /* ================= STATUS ================= */

  isActive:{
    type:Boolean,
    default:true
  },

  profileImage:String,

  /* ================= META ================= */

  source:{
    type:String,
    enum:["enrollment","turf","admin"],
    default:"enrollment"
  },

  memberSince:{
    type:Date,
    default:Date.now
  }

},
{timestamps:true}
);

/* ================= INDEXES ================= */

userSchema.index({mobile:1});
userSchema.index({email:1});

module.exports = mongoose.model("User",userSchema);