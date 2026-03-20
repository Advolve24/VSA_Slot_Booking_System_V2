const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/auth.controller");

// Create initial admin (run once only)
router.post("/create-admin", ctrl.createInitialAdmin);

// Admin login (email + password)
router.post("/admin-login", ctrl.adminLogin);

// Player login / auto-register (after Firebase OTP success)
router.post("/player-login", ctrl.playerLogin);

// Get logged-in user profile (admin / player)
router.get("/me", auth, ctrl.getProfile);

module.exports = router;
