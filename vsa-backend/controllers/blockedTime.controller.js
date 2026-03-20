const BlockedTime = require("../models/BlockedTime");
const TurfRental = require("../models/TurfRental");
const Batch = require("../models/Batch");

/* ================= TIME CONVERT ================= */

function toMinutes(time) {

  if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {

    const [timePart, modifier] = time.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);

    if (modifier.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}


/* ================= BLOCK TIME ================= */

exports.blockTime = async (req, res) => {

  try {

    const { facilityId, date, startTime, endTime, reason } = req.body;

    if (!facilityId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (startMin >= endMin) {
      return res.status(400).json({ message: "Invalid time range" });
    }

    /* ---------- CHECK BLOCKED ---------- */

    const existingBlock = await BlockedTime.findOne({
      facilityId,
      date,
      startMin: { $lt: endMin },
      endMin: { $gt: startMin },
    });

    if (existingBlock) {
      return res.status(409).json({
        message: "Slot already blocked",
      });
    }

    /* ---------- CHECK BOOKINGS ---------- */

    const existingBooking = await TurfRental.findOne({
      facilityId,
      rentalDate: date,
      startMin: { $lt: endMin },
      endMin: { $gt: startMin },
      status: { $ne: "cancelled" }
    });

    if (existingBooking) {
      return res.status(409).json({
        message: "Cannot block slot. Booking exists.",
      });
    }

    /* ---------- CHECK COACHING BATCH ---------- */

    const existingBatch = await Batch.findOne({
      facilityId,
      startMin: { $lt: endMin },
      endMin: { $gt: startMin },
      status: "active"
    });

    if (existingBatch) {
      return res.status(409).json({
        message: "Cannot block slot. Coaching batch exists.",
      });
    }

    /* ---------- CREATE BLOCK ---------- */

    const blocked = await BlockedTime.create({
      facilityId,
      date,
      startTime,
      endTime,
      startMin,
      endMin,
      reason,
    });

    res.status(201).json(blocked);

  } catch (err) {

    console.error("Block Time Error:", err);
    res.status(500).json({ message: err.message });

  }
};


/* ================= GET ALL BLOCKED ================= */

exports.getBlockedTimes = async (req, res) => {

  try {

    const { facilityId, date } = req.query;

    let query = {};

    if (facilityId) query.facilityId = facilityId;
    if (date) query.date = date;

    const blocked = await BlockedTime
      .find(query)
      .populate("facilityId", "name")
      .sort({ date: -1, startMin: 1 });

    res.json(blocked);

  } catch (err) {

    console.error("Get Blocked Times Error:", err);

    res.status(500).json({
      message: "Failed to fetch blocked times",
    });

  }
};


/* ================= GET BLOCKED BY ID ================= */

exports.getBlockedTimeById = async (req, res) => {

  try {

    const block = await BlockedTime
      .findById(req.params.id)
      .populate("facilityId", "name");

    if (!block) {
      return res.status(404).json({
        message: "Blocked slot not found",
      });
    }

    res.json(block);

  } catch (err) {

    console.error("Get Block By ID Error:", err);

    res.status(500).json({
      message: "Failed to fetch blocked slot",
    });

  }

};


/* ================= DELETE BLOCK ================= */

exports.deleteBlockedTime = async (req, res) => {

  try {

    const block = await BlockedTime.findById(req.params.id);

    if (!block) {
      return res.status(404).json({
        message: "Blocked slot not found",
      });
    }

    await block.deleteOne();

    res.json({
      message: "Blocked slot deleted successfully",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "Server error",
    });

  }

};