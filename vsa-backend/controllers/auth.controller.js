const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../config/jwt");

/* ======================================================
   ADMIN LOGIN (EMAIL + PASSWORD)
====================================================== */
exports.adminLogin = async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email & password required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      role: { $in: ["admin", "staff"] }
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /* ================= STAFF ACTIVE CHECK ================= */

    if (user.role === "staff" && user.isActive === false) {
      return res.status(403).json({
        message: "Staff account is disabled by admin",
      });
    }

    const token = generateToken(user);

    res.json({
      message: `${user.role} login successful`,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
    });

  } catch (err) {

    console.error("Login Error:", err);

    res.status(500).json({
      message: "Server error",
    });

  }

};

/* ======================================================
   PLAYER LOGIN (OTP ALREADY VERIFIED ON FRONTEND)
   ❗ DOES NOT CREATE USER
====================================================== */
exports.playerLogin = async (req, res) => {
  try {
    const { mobile } = req.body;

    console.log("LOGIN MOBILE:", mobile);

    const user = await User.findOne({
      mobile: mobile.toString(),
      role: "player",
    });

    console.log("FOUND USER:", user);

    if (!user) {
      return res.json({ exists: false });
    }

    const token = generateToken(user);

    res.json({
      exists: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        age: user.age,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
        role: user.role,
      }
    });
  } catch (err) {
    console.error("Player Login Error:", err);
    res.status(500).json({ message: "Player login failed" });
  }
};

/* ======================================================
   GET LOGGED-IN PROFILE
====================================================== */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({
      message: "Failed to fetch profile",
    });
  }
};

/* ======================================================
   CREATE FIRST ADMIN (RUN ONCE)
====================================================== */
exports.createInitialAdmin = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    const exists = await User.findOne({
      email: email.toLowerCase(),
    });

    if (exists) {
      return res.status(400).json({
        message: "Admin already exists",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      fullName,
      email: email.toLowerCase(),
      password: hashed,
      role: "admin",
    });

    res.json({
      message: "Admin created successfully",
      admin: {
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (err) {
    console.error("Create Admin Error:", err);
    res.status(500).json({
      message: "Error creating admin",
    });
  }
};
