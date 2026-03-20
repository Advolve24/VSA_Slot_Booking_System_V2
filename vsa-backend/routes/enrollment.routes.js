const router = require("express").Router();

const auth = require("../middleware/auth");
const role = require("../middleware/role");
const ctrl = require("../controllers/enrollment.controller");

/* ======================================================
   PUBLIC / WEBSITE
====================================================== */

// Website enrollment (no auth)
router.post("/website", ctrl.createEnrollment);

// Public fetch (renew page / email link)
router.get("/public/:id", ctrl.getEnrollmentPublic);



/* ======================================================
   ADMIN ENROLLMENT MANAGEMENT
====================================================== */

// Create enrollment (admin)
router.post("/", auth, role(["admin"]), ctrl.createEnrollment);

// Get all enrollments
router.get("/", auth, role(["admin"]), ctrl.getEnrollments);

// Get single enrollment
router.get("/:id", auth, role(["admin"]), ctrl.getEnrollmentById);

// Update enrollment
router.put("/:id", auth, role(["admin"]), ctrl.updateEnrollment);

// Delete enrollment
router.delete("/:id", auth, role(["admin"]), ctrl.deleteEnrollment);


/* ======================================================
   RENEWAL
====================================================== */

// User renewal
router.patch("/:id/renew", auth, ctrl.renewEnrollment);

// Admin force renewal
router.patch(
  "/admin/:id/renew",
  auth,
  role(["admin"]),
  ctrl.adminRenewEnrollment
);


/* ======================================================
   LEAVE MANAGEMENT
====================================================== */

// User apply leave
router.post("/:id/leave", auth, ctrl.applyLeave);

// Admin apply leave
router.post(
  "/admin/:id/leave",
  auth,
  role(["admin"]),
  ctrl.applyLeave
);

router.patch(
  "/admin/:id/cancel-leave",
  auth,
  role(["admin"]),
  ctrl.cancelLeave
);


module.exports = router;