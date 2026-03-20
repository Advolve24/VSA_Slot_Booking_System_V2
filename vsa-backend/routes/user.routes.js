const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const ctrl = require("../controllers/user.controller");

router.get("/me", auth, ctrl.getMyProfile);

router.put("/update", auth, ctrl.updateProfile);

router.get("/my-enrollments", auth, ctrl.getMyEnrollments);

router.get("/my-turf-bookings", auth, ctrl.getMyTurfBookings);

router.get("/my-invoices", auth, ctrl.getMyInvoices);

router.get("/check-mobile/:mobile", ctrl.checkMobile);

router.post("/create-staff", auth, role(["admin"]), ctrl.createStaff);

router.get("/all", auth, role(["admin"]), ctrl.getAllUsers);

router.put("/:id", auth, role(["admin"]), ctrl.adminUpdateUser);

router.delete("/:id", auth, role(["admin"]), ctrl.deleteUser);

router.get("/:id", auth, role(["admin"]), ctrl.getUserById);


module.exports = router;