const Facility = require("../models/Facility");

/* =================== HELPERS =================== */
function calculateFacilityTiming(timeSlots) {
  if (!timeSlots || !timeSlots.length) return { openingTime: null, closingTime: null };
  const starts = timeSlots.map((t) => t.start).sort();
  const ends = timeSlots.map((t) => t.end).sort();
  return { openingTime: starts[0], closingTime: ends[ends.length - 1] };
}

/* =================== CREATE =================== */
exports.createFacility = async (req, res) => {
  try {
    let {
      name, type, pricingMode, hourlyRate, timeSlots, status,
      advanceType, advanceValue, minBookingMinutes, bookingStepMinutes,
      openingTime, closingTime
    } = req.body;

    let sports = req.body.sports || req.body["sports[]"];
    if (!sports) sports = [];
    if (!Array.isArray(sports)) sports = [sports];

    if (!name || !type || sports.length === 0)
      return res.status(400).json({ message: "Name, type and at least one sport required" });

    /* ===== AUTO TIMING FOR TIME-BASED ===== */
    if (pricingMode === "time-based") {
      const timing = calculateFacilityTiming(timeSlots);
      openingTime = timing.openingTime;
      closingTime = timing.closingTime;
    }

    const facility = await Facility.create({
      name, type, sports, status: status || "active",
      pricingMode: pricingMode || "flat",
      hourlyRate: pricingMode === "flat" ? hourlyRate : undefined,
      timeSlots: pricingMode === "time-based" ? timeSlots : [],
      advanceType: advanceType || "fixed",
      advanceValue,
      minBookingMinutes: minBookingMinutes || 60,
      bookingStepMinutes: bookingStepMinutes || 30,
      openingTime,
      closingTime,
    });

    res.status(201).json(facility);
  } catch (err) {
    console.error("Create Facility Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =================== UPDATE =================== */
exports.updateFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });

    const {
      name, type, pricingMode, hourlyRate, timeSlots, status,
      advanceType, advanceValue, minBookingMinutes, bookingStepMinutes
    } = req.body;

    if (name !== undefined) facility.name = name;
    if (type !== undefined) facility.type = type;
    if (status !== undefined) facility.status = status;
    if (pricingMode !== undefined) facility.pricingMode = pricingMode;

    if (pricingMode === "flat") {
      if (hourlyRate !== undefined) facility.hourlyRate = hourlyRate;
      facility.timeSlots = [];
    }

    if (pricingMode === "time-based" && timeSlots !== undefined) {
      facility.timeSlots = timeSlots;
      const timing = calculateFacilityTiming(timeSlots);
      facility.openingTime = timing.openingTime;
      facility.closingTime = timing.closingTime;
      facility.hourlyRate = undefined;
    }

    if (advanceType !== undefined) facility.advanceType = advanceType;
    if (advanceValue !== undefined) facility.advanceValue = advanceValue;
    if (minBookingMinutes !== undefined) facility.minBookingMinutes = minBookingMinutes;
    if (bookingStepMinutes !== undefined) facility.bookingStepMinutes = bookingStepMinutes;

    await facility.save();
    res.json(facility);
  } catch (err) {
    console.error("Update Facility Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =================== GET ALL =================== */
exports.getFacilities = async (req, res) => {
  try {
    const facilities = await Facility.find().populate("sports", "name").sort({ createdAt: -1 });
    res.json(facilities);
  } catch (err) {
    console.error("Get Facilities Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =================== GET ONE =================== */
exports.getFacilityById = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id).populate("sports", "name");
    if (!facility) return res.status(404).json({ message: "Facility not found" });
    res.json(facility);
  } catch (err) {
    console.error("Get Facility Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =================== DELETE =================== */
exports.deleteFacility = async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ message: "Facility not found" });
    await facility.deleteOne();
    res.json({ message: "Facility deleted successfully" });
  } catch (err) {
    console.error("Delete Facility Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};