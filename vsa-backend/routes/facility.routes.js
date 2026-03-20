const express = require("express");
const router = express.Router();
const { getFacilityUnavailableTimes } = require("../controllers/slotAvailability.controller");
const {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
} = require("../controllers/facility.controller");


/* PUBLIC */
router.get("/", getFacilities);
router.get("/:id", getFacilityById);
router.get("/:id/unavailable", getFacilityUnavailableTimes);


/* ADMIN */
router.post("/", createFacility);
router.put("/:id", updateFacility);
router.delete("/:id", deleteFacility);

module.exports = router;