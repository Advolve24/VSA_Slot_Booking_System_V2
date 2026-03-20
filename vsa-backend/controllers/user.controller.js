const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const TurfRental = require("../models/TurfRental");
const Invoice = require("../models/Invoice");

/* ======================================================
   HELPER: SYNC USER SNAPSHOT DATA
====================================================== */

async function syncUserSnapshot(updatedUser) {

  const filter = {
    userId: updatedUser._id
  };

  const updateData = {
    playerName: updatedUser.fullName,
    mobile: updatedUser.mobile,
    email: updatedUser.email,
    address: updatedUser.address
  };

  await Promise.all([
    Enrollment.updateMany(filter, { $set: updateData }),
    TurfRental.updateMany(filter, { $set: updateData })
  ]);

}

/* ======================================================
   GET MY PROFILE
====================================================== */

exports.getMyProfile = async (req, res) => {

  try {

    const user = await User.findById(req.user.id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);

  } catch (err) {

    console.error("GET PROFILE ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch profile",
    });

  }

};

/* ======================================================
   UPDATE PROFILE
====================================================== */

exports.updateProfile = async (req, res) => {

  try {

    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await syncUserSnapshot(updatedUser);

    res.json({
      message: "Profile updated",
      user: updatedUser,
    });

  } catch (err) {

    console.error("PROFILE UPDATE ERROR:", err);

    res.status(500).json({
      message: "Update failed",
    });

  }

};

/* ======================================================
   GET MY ENROLLMENTS
====================================================== */

exports.getMyEnrollments = async (req, res) => {

  try {

    const enrollments = await Enrollment.find({
      userId: req.user.id
    })
      .populate({
        path: "batchId",
        select: "name startTime endTime coachName facilityId"
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = enrollments.map((e) => {

      const batchTime = e.batchId
        ? `${e.batchId.startTime} - ${e.batchId.endTime}`
        : null;

      return {
        ...e,
        batchTime
      };

    });

    res.json(formatted);

  } catch (err) {

    console.error("MY ENROLLMENTS ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch enrollments"
    });

  }

};

/* ======================================================
   GET MY TURF BOOKINGS
====================================================== */

exports.getMyTurfBookings = async (req, res) => {

  try {

    const bookings = await TurfRental.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(bookings);

  } catch (err) {

    console.error("MY TURF BOOKINGS ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch turf bookings"
    });

  }

};

/* ======================================================
   GET MY INVOICES
====================================================== */

exports.getMyInvoices = async (req, res) => {

  try {

    const user = req.user;

    if (!user || !user.mobile) {
      return res.status(400).json({
        message: "User mobile not found"
      });
    }

    const invoices = await Invoice.find({
      "user.mobile": user.mobile // ✅ IMPORTANT FIX
    })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = invoices.map((inv) => ({
      _id: inv._id,
      invoiceNo: inv.invoiceNo,
      type: inv.type,
      total: inv.total,
      status: inv.status,
      createdAt: inv.createdAt
    }));

    res.json(formatted);

  } catch (err) {

    console.error("GET MY INVOICES ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch invoice"
    });

  }

};

/* ======================================================
   CHECK MOBILE
====================================================== */

exports.checkMobile = async (req, res) => {

  try {

    const { mobile } = req.params;

    const user = await User.findOne({
      mobile,
      role: "player"
    }).select("-password");

    if (!user) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      user
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};

/* ======================================================
   ADMIN GET ALL USERS
====================================================== */

exports.getAllUsers = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    const { search, role, type } = req.query;

    let filter = {};

    if (role) filter.role = role;

    if (type) filter.userTypes = type;

    if (search) {

      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } }
      ];

    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    res.json(users);

  } catch (err) {

    console.error("GET ALL USERS ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch users"
    });

  }

};

/* ======================================================
   ADMIN GET USER
====================================================== */

exports.getUserById = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = req.params.id;

    const user = await User.findById(userId)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const enrollments = await Enrollment.find({ userId })
      .populate({
        path: "batchId",
        select: "name startTime endTime coachName"
      })
      .sort({ createdAt: -1 })
      .lean();

    const turfBookings = await TurfRental.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      user,
      enrollments,
      turfBookings
    });

  } catch (err) {
    console.error("GET USER DETAILS ERROR:", err);
    res.status(500).json({
      message: "Failed to fetch user details"
    });
  }
};

/* ======================================================
   ADMIN UPDATE USER
====================================================== */

exports.adminUpdateUser = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { password, ...updateData } = req.body;

    /* ================= HANDLE PASSWORD ================= */

    if (password) {
      const bcrypt = require("bcryptjs");
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await syncUserSnapshot(updatedUser);

    res.json({
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (err) {

    console.error("ADMIN UPDATE USER ERROR:", err);

    res.status(500).json({
      message: "Failed to update user"
    });

  }

};
/* ======================================================
   ADMIN CREATE STAFF
====================================================== */

exports.createStaff = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can create staff"
      });
    }

    const { fullName, email, password, mobile, isActive } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email and password required"
      });
    }

    const exists = await User.findOne({
      email: email.toLowerCase()
    });

    if (exists) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const bcrypt = require("bcryptjs");

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await User.create({

      fullName,
      email: email.toLowerCase(),
      mobile,
      password: hashedPassword,
      role: "staff",
      source: "admin",
      userTypes: ["turf"],
      isActive: isActive ?? true

    });

    res.json({

      message: "Staff created successfully",

      user: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive
      }

    });

  } catch (err) {

    console.error("CREATE STAFF ERROR:", err);

    res.status(500).json({
      message: "Failed to create staff"
    });

  }

};

/* ======================================================
   DELETE USER (SAFE DELETE)
====================================================== */

exports.deleteUser = async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (String(user._id) === String(req.user.id)) {

      return res.status(400).json({
        message: "You cannot delete your own account"
      });

    }

    /* ================= DETACH USER FROM HISTORY ================= */

    await Enrollment.updateMany(
      { userId: user._id },
      { $set: { userId: null } }
    );

    await TurfRental.updateMany(
      { userId: user._id },
      { $set: { userId: null } }
    );

    /* ================= DELETE USER ================= */

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: "User deleted but historical bookings preserved"
    });

  } catch (err) {

    console.error("DELETE USER ERROR:", err);

    res.status(500).json({
      message: "Failed to delete user"
    });

  }

};