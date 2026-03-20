const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const role = require("../middleware/role");

const {
  createTurfRental,
  getTurfRentals,
  getTurfRentalById,
  updateTurfRental,
  cancelTurfRental,
  deleteTurfRental,
  addTurfPayment,
  previewTurfPrice,
  approveRefund
} = require("../controllers/turfRental.controller");


/* ======================================================
   PUBLIC ROUTES (WEBSITE BOOKING)
====================================================== */

/* PRICE PREVIEW (PUBLIC) */
router.post("/preview-price", previewTurfPrice);

/* CREATE TURF BOOKING (PUBLIC WEBSITE USER) */
router.post("/", createTurfRental);

/* USER CANCEL BOOKING */
router.patch("/:id/cancel", auth, cancelTurfRental);


/* ======================================================
   ADMIN ROUTES
====================================================== */

/* UPDATE BOOKING */
router.patch("/:id", auth, role(["admin"]), updateTurfRental);

/* DELETE BOOKING */
router.delete("/:id", auth, role(["admin"]), deleteTurfRental);

/* APPROVE REFUND */
router.patch(
  "/:id/approve-refund",
  auth,
  role(["admin"]),
  approveRefund
);


/* ======================================================
   STAFF + ADMIN
   (VIEW BOOKINGS)
====================================================== */

router.get("/", auth, role(["admin", "staff"]), getTurfRentals);

router.get("/:id", auth, role(["admin", "staff"]), getTurfRentalById);


/* ======================================================
   STAFF PAYMENT COLLECTION
====================================================== */

router.post(
  "/:id/payments",
  auth,
  role(["admin", "staff"]),
  addTurfPayment
);


module.exports = router;