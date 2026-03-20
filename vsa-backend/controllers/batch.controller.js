const Batch = require("../models/Batch");
const Sport = require("../models/Sport");
const TurfRental = require("../models/TurfRental");

/* ======================================================
   UTILS
====================================================== */

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const overlaps = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && aEnd > bStart;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDays = (days = []) =>
  days.map((d) => DAY_NAMES[d]).join(", ");

const formatTime12h = (time) => {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
};

/* ======================================================
   GET ALL BATCHES
====================================================== */

exports.getBatches = async (req, res) => {
  try {

    const batches = await Batch.aggregate([

      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "batchId",
          as: "enrollments"
        }
      },

      {
        $addFields: {
          enrolledCount: {
            $size: {
              $filter: {
                input: "$enrollments",
                as: "e",
                cond: { $eq: ["$$e.status", "active"] }
              }
            }
          }
        }
      },

      {
        $project: {
          enrollments: 0
        }
      },

      { $sort: { createdAt: -1 } }

    ]);

    const populated = await Batch.populate(batches, [
      { path: "sportId", select: "name" },
      { path: "facilityId", select: "name type" }
    ]);

    res.json(populated);

  } catch (err) {

    console.error("GET BATCH ERROR:", err);

    res.status(500).json({
      message: "Failed to fetch batches"
    });

  }
};

/* ======================================================
   GET SINGLE BATCH
====================================================== */

exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate("sportId", "name")
      .populate("facilityId", "name type");

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    res.json(batch);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch batch",
    });
  }
};

/* ======================================================
   CREATE BATCH
====================================================== */

exports.createBatch = async (req, res) => {
  try {
    const {
      name,
      sportName,
      facilityId,
      daysOfWeek,
      startTime,
      endTime,
      monthlyFee,
      quarterlyFee,
      hasQuarterly,
      capacity,
      level,
      coachName,
      registrationFee,
    } = req.body;

    if (!facilityId || !daysOfWeek?.length || !startTime || !endTime) {
      return res.status(400).json({
        message: "Please select facility, days and time.",
      });
    }

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (endMin <= startMin) {
      return res.status(400).json({
        message: "End time must be after start time.",
      });
    }

    const sport = await Sport.findOne({ name: sportName });

    if (!sport) {
      return res.status(400).json({
        message: "Invalid sport selected.",
      });
    }

    /* ======================================================
       BATCH CONFLICT CHECK
    ====================================================== */

    const existingBatches = await Batch.find({
      facilityId,
      isActive: true,
    });

    for (const b of existingBatches) {
      const sameDay = b.daysOfWeek.some((d) =>
        daysOfWeek.includes(d)
      );

      if (!sameDay) continue;

      if (overlaps(startMin, endMin, b.startMin, b.endMin)) {
        return res.status(409).json({
          message: `This slot is already used by "${b.name}" batch (${formatTime12h(
            b.startTime
          )} - ${formatTime12h(b.endTime)}) on ${formatDays(
            b.daysOfWeek
          )}. Please choose another time.`,
        });
      }
    }

    /* ======================================================
       RENTAL CONFLICT CHECK
    ====================================================== */

    const today = new Date().toISOString().slice(0, 10);

    const rentals = await TurfRental.find({
      facilityId,
      rentalDate: { $gte: today },
      bookingStatus: { $ne: "cancelled" },
    });

    for (const r of rentals) {
      const dow = new Date(r.rentalDate).getDay();

      if (!daysOfWeek.includes(dow)) continue;

      if (overlaps(startMin, endMin, r.startMin, r.endMin)) {
        return res.status(409).json({
          message: `This time slot conflicts with an existing turf booking on ${DAY_NAMES[dow]
            } (${formatTime12h(r.startTime)} - ${formatTime12h(r.endTime)}).`,
        });
      }
    }

    /* ======================================================
       CREATE BATCH
    ====================================================== */

    const batch = await Batch.create({
      name,
      sportId: sport._id,
      facilityId,

      daysOfWeek,

      startTime,
      endTime,

      startMin,
      endMin,

      monthlyFee: Number(monthlyFee),

      hasQuarterly: !!hasQuarterly,

      registrationFee: Number(registrationFee || 0),

      quarterlyFee: hasQuarterly
        ? Number(quarterlyFee || 0)
        : 0,

      capacity,
      level,
      coachName,
    });

    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

/* ======================================================
   UPDATE BATCH
====================================================== */
exports.updateBatch = async (req, res) => {
  try {

    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found"
      });
    }

    const {
      name,
      sportName,
      facilityId,
      level,
      coachName,
      capacity,
      daysOfWeek,
      startTime,
      endTime,
      monthlyFee,
      registrationFee,
      quarterlyFee,
      hasQuarterly,
      isActive
    } = req.body;

    const startMin = toMinutes(startTime);
    const endMin = toMinutes(endTime);

    if (endMin <= startMin) {
      return res.status(400).json({
        message: "End time must be after start time"
      });
    }

    /* ===== SPORT ===== */

    if (sportName) {
      const sport = await Sport.findOne({ name: sportName });
      if (!sport) {
        return res.status(400).json({
          message: "Invalid sport"
        });
      }
      batch.sportId = sport._id;
    }

    /* ===== BATCH CONFLICT ===== */

    const existingBatches = await Batch.find({
      facilityId,
      isActive: true,
      _id: { $ne: batch._id }
    });

    for (const b of existingBatches) {

      const sameDay = b.daysOfWeek.some(d =>
        daysOfWeek.includes(d)
      );

      if (!sameDay) continue;

      if (overlaps(startMin, endMin, b.startMin, b.endMin)) {

        return res.status(409).json({
          message: `This slot is already used by "${b.name}" batch (${b.startTime} - ${b.endTime})`
        });

      }

    }

    /* ===== UPDATE FIELDS ===== */

    batch.name = name;
    batch.facilityId = facilityId;
    batch.level = level;
    batch.coachName = coachName;
    batch.capacity = Number(capacity);

    batch.daysOfWeek = daysOfWeek;

    batch.startTime = startTime;
    batch.endTime = endTime;

    batch.startMin = startMin;
    batch.endMin = endMin;

    batch.monthlyFee = Number(monthlyFee);
    batch.registrationFee = Number(registrationFee || 0);

    batch.hasQuarterly = !!hasQuarterly;
    batch.quarterlyFee = hasQuarterly
      ? Number(quarterlyFee || 0)
      : 0;

    batch.isActive = !!isActive;

    await batch.save();

    res.json(batch);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};
/* ======================================================
   DELETE BATCH
====================================================== */

exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    res.json({
      success: true,
      message: "Batch deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete batch",
    });
  }
};