const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* ================= BASIC ================= */
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.role === "admin";
      },
      select: false,
    },

    age: {
      type: Number,
      min: 1,
      max: 100,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },

    /* ================= CONTACT ================= */
    mobile: {
      type: String,
      unique: true,
      sparse: true, // allows admin/staff without mobile
      default: undefined,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    /* ================= ADDRESS (HUMAN READABLE) ================= */
    address: {
      country: {
        type: String,
        default: "India",
      },
      state: {
        type: String,
        default: "Maharashtra",
      },
      city: {
        type: String,
        trim: true,
      },
      localAddress: {
        type: String,
        trim: true,
      },
    },

    /* ================= ROLE & AUTH ================= */
    role: {
      type: String,
      enum: ["player", "admin", "staff"],
      default: "player",
    },

    profileImage: String,

    /* ================= PLAYER DATA ================= */
    sportsPlayed: [String],

    /* ================= RELATIONS ================= */
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* ================= META ================= */
    source: {
      type: String,
      enum: ["enrollment", "turf", "admin"],
      default: "enrollment",
    },

    memberSince: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
