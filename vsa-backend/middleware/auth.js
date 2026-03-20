const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).lean();

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // ✅ SET COMPLETE USER OBJECT
    req.user = {
      id: user._id,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
    };

    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};