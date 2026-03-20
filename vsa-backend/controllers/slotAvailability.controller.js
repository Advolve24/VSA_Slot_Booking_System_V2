const TurfRental = require("../models/TurfRental");
const Batch = require("../models/Batch");
const Facility = require("../models/Facility");
const BlockedTime = require("../models/BlockedTime");

/* ================= GET UNAVAILABLE TIMES ================= */

exports.getFacilityUnavailableTimes = async (req, res) => {

  try {

    const { id: facilityId } = req.params;
    const { date } = req.query;

    if (!facilityId || !date) {
      return res.status(400).json({
        message: "facilityId and date are required"
      });
    }

    /* ================= FACILITY ================= */

    const facility = await Facility.findById(facilityId);

    if (!facility) {
      return res.status(404).json({
        message: "Facility not found"
      });
    }

    if (["maintenance", "disabled"].includes(facility.status)) {
      return res.json([]);
    }

    const result = [];

    const selectedDate = new Date(date);
    const dow = selectedDate.getDay(); // 0=Sun ... 6=Sat

    /* ================= TURF BOOKINGS ================= */

    const bookings = await TurfRental.find({
      facilityId,
      rentalDate: date,
      bookingStatus: { $ne: "cancelled" }
    }).select("startTime endTime");

    bookings.forEach(b => {

      result.push({
        startTime: b.startTime,
        endTime: b.endTime,
        type: "booking",
        source: "turfRental"
      });

    });

    /* ================= COACHING BATCHES ================= */

    const batches = await Batch.find({
      facilityId,
      isActive: true
    }).select("startTime endTime daysOfWeek name");

    batches.forEach(batch => {

      /* Only block slot if batch runs on this day */

      if (batch.daysOfWeek?.includes(dow)) {

        result.push({
          startTime: batch.startTime,
          endTime: batch.endTime,
          type: "batch",
          batchName: batch.name,
          source: "coaching"
        });

      }

    });

    /* ================= ADMIN BLOCKED TIMES ================= */

    const blocked = await BlockedTime.find({
      facilityId,
      date
    }).select("startTime endTime reason");

    blocked.forEach(b => {

      result.push({
        startTime: b.startTime,
        endTime: b.endTime,
        type: "blocked",
        reason: b.reason || "Admin blocked",
        source: "admin"
      });

    });

    /* ================= SORT TIMES ================= */

    result.sort((a, b) => {

      const aTime = a.startTime.split(":").map(Number);
      const bTime = b.startTime.split(":").map(Number);

      const aMinutes = aTime[0] * 60 + aTime[1];
      const bMinutes = bTime[0] * 60 + bTime[1];

      return aMinutes - bMinutes;

    });

    return res.json(result);

  } catch (err) {

    console.error("Unavailable Time Error:", err);

    res.status(500).json({
      message: "Server error"
    });

  }

};