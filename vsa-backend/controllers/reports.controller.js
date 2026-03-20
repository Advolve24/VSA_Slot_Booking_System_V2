const Enrollment = require("../models/Enrollment");
const TurfRental = require("../models/TurfRental");
const { Parser } = require("json2csv");

const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");
const ExcelJS = require("exceljs");

const isProduction =
  process.env.NODE_ENV === "production" || !!process.env.VERCEL;

/* ======================================================
BROWSER LAUNCH
====================================================== */

const launchBrowser = async () => {
  if (isProduction) {
    return await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  return await puppeteer.launch({
    headless: true,
  });
};

/* ======================================================
GET NUMBER OF WEEKS IN MONTH
====================================================== */

function getWeeksInMonth(year, month) {

  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const used = firstDay.getDay() + lastDay.getDate();

  return Math.ceil(used / 7);
}

/* ======================================================
BUILD REPORT DATA
====================================================== */

async function buildMonthlyReport({ month, year, from, to }) {

  /* ================= DATE RANGE ================= */

  let start, end;

  if (from && to) {

    start = new Date(from);
    end = new Date(to);

    // ❌ Invalid date protection
    if (isNaN(start) || isNaN(end)) {
      throw new Error("Invalid date range");
    }

    end.setHours(23, 59, 59, 999);

  } else {

    if (!month || !year) {
      const now = new Date();
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }

    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0, 23, 59, 59);
  }

  /* ================= FETCH DATA ================= */

  const enrollments = await Enrollment.find({
    startDate: { $gte: start, $lte: end },
  })
    .populate({
      path: "batchId",
      populate: { path: "sportId" },
    })
    .populate("userId");

 const turfBookings = await TurfRental.find({
  rentalDate: {
    $gte: start.toISOString().split("T")[0],
    $lte: end.toISOString().split("T")[0],
  },
});

  /* ================= STATS ================= */

  const totalEnrollments = enrollments.length;

  const activeStudents = enrollments.filter(
    (e) => String(e.status).toLowerCase() === "active"
  ).length;

  const turfBookingsCount = turfBookings.length;

  const coachingRevenue = enrollments.reduce(
    (sum, e) => sum + (e.finalAmount || 0),
    0
  );

  const turfRevenue = turfBookings.reduce(
    (sum, t) => sum + (t.finalAmount || 0),
    0
  );

  const totalRevenue = coachingRevenue + turfRevenue;

  /* ================= WEEKLY BREAKDOWN ================= */

  const totalDays =
    Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const weeksCount = Math.max(Math.ceil(totalDays / 7), 1);

  const weeks = Array.from({ length: weeksCount }, (_, i) => ({
    week: `Week ${i + 1}`,
    coaching: 0,
    turf: 0,
  }));

  /* ================= SAFE WEEK CALCULATION ================= */

  enrollments.forEach((e) => {

    const diffDays = Math.floor(
      (new Date(e.startDate) - start) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) return;

    const weekIndex = Math.floor(diffDays / 7);

    if (weeks[weekIndex]) {
      weeks[weekIndex].coaching += e.finalAmount || 0;
    }

  });

  turfBookings.forEach((t) => {

    const diffDays = Math.floor(
      (new Date(t.rentalDate) - start) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) return;

    const weekIndex = Math.floor(diffDays / 7);

    if (weeks[weekIndex]) {
      weeks[weekIndex].turf += t.finalAmount || 0;
    }

  });

  /* ================= SPORT DISTRIBUTION ================= */

  const sportMap = {};

  enrollments.forEach((e) => {
    const sport = e.batchId?.sportId?.name || "Other";
    sportMap[sport] = (sportMap[sport] || 0) + 1;
  });

  const distribution = Object.keys(sportMap).map((sport) => ({
    sport,
    count: sportMap[sport],
  }));

  /* ================= ENROLLMENT TABLE ================= */

  const enrollmentTable = enrollments.map((e) => ({
    studentName: e.userId?.fullName || "-",
    age: e.userId?.age || "-",
    sport: e.batchId?.sportId?.name || "-",
    batch: e.batchId?.name || "-",
    coach: e.batchId?.coachName || "-",
    startDate: e.startDate
      ? new Date(e.startDate).toISOString().split("T")[0]
      : "-",
    fee: e.monthlyFee || 0,
    registrationFee: e.registrationFee || 0,
    totalFee: e.finalAmount || 0,
    status: e.status || "-",
  }));

  /* ================= TURF TABLE ================= */

  const turfTable = turfBookings.map((t) => ({
    customer: t.userName || "-",
    facility: t.facilityName || "-",
    sport: t.sportName || "-",
    date: t.rentalDate
      ? new Date(t.rentalDate).toISOString().split("T")[0]
      : "-",
    time: `${t.startTime || ""} - ${t.endTime || ""}`,
    total: t.finalAmount || 0,
    paid: t.totalPaid || 0,
    due: t.dueAmount || 0,
    status: t.bookingStatus || "-",
  }));

  /* ================= FINAL RESPONSE ================= */

  return {
    stats: {
      totalEnrollments,
      activeStudents,
      turfBookings: turfBookingsCount,
      totalRevenue,
      coachingRevenue,
      turfRevenue,
    },
    revenueBreakdown: weeks,
    distribution,
    enrollmentTable,
    turfTable,
  };
}
/* ======================================================
GET MONTHLY REPORT DATA
====================================================== */

exports.getMonthlyReport = async (req, res) => {
  try {

    let { month, year, from, to } = req.query;

    /* ================= DEFAULT ================= */

    if (!from && !to && (!month || !year)) {
      const now = new Date();
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }

    /* ================= FIXED CALL ================= */

    const report = await buildMonthlyReport({
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null,
      from,
      to,
    });

    res.json(report);

  } catch (err) {

    console.error("REPORT ERROR:", err);

    res.status(500).json({
      message: err.message || "Report generation failed",
    });

  }
};

/* ======================================================
DOWNLOAD FULL REPORT CSV
====================================================== */
exports.downloadFullReportCSV = async (req, res) => {
  try {

    let { month, year, from, to } = req.query;

    /* ================= VALIDATION / DEFAULT ================= */

    if (!from && !to && (!month || !year)) {
      const now = new Date();
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }

    /* ================= BUILD REPORT ================= */

    const report = await buildMonthlyReport({
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null,
      from,
      to,
    });

    /* ================= WORKBOOK ================= */

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Academy System";

    /* ================= SUMMARY SHEET ================= */

    const summarySheet = workbook.addWorksheet("Summary");

    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 25 },
      { header: "Value", key: "value", width: 20 },
    ];

    summarySheet.addRows([
      { metric: "Total Enrollments", value: report.stats.totalEnrollments },
      { metric: "Active Students", value: report.stats.activeStudents },
      { metric: "Turf Bookings", value: report.stats.turfBookings },
      { metric: "Coaching Revenue", value: report.stats.coachingRevenue },
      { metric: "Turf Revenue", value: report.stats.turfRevenue },
      { metric: "Total Revenue", value: report.stats.totalRevenue },
    ]);

    /* ================= ENROLLMENTS ================= */

    const enrollSheet = workbook.addWorksheet("Enrollments");

    enrollSheet.columns = [
      { header: "Student Name", key: "studentName", width: 25 },
      { header: "Age", key: "age", width: 10 },
      { header: "Sport", key: "sport", width: 18 },
      { header: "Batch", key: "batch", width: 25 },
      { header: "Coach", key: "coach", width: 20 },
      { header: "Start Date", key: "startDate", width: 15 },
      { header: "Monthly Fee", key: "fee", width: 15 },
      { header: "Registration Fee", key: "registrationFee", width: 18 },
      { header: "Total Fee", key: "totalFee", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];

    enrollSheet.addRows(report.enrollmentTable);

    /* ================= TURF BOOKINGS ================= */

    const turfSheet = workbook.addWorksheet("Turf Bookings");

    turfSheet.columns = [
      { header: "Customer", key: "customer", width: 25 },
      { header: "Facility", key: "facility", width: 20 },
      { header: "Sport", key: "sport", width: 15 },
      { header: "Date", key: "date", width: 15 },
      { header: "Time", key: "time", width: 20 },
      { header: "Total", key: "total", width: 15 },
      { header: "Paid", key: "paid", width: 15 },
      { header: "Due", key: "due", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];

    turfSheet.addRows(report.turfTable);

    /* ================= REVENUE BREAKDOWN ================= */

    const revenueSheet = workbook.addWorksheet("Revenue Breakdown");

    revenueSheet.columns = [
      { header: "Week", key: "week", width: 15 },
      { header: "Coaching Revenue", key: "coaching", width: 20 },
      { header: "Turf Revenue", key: "turf", width: 20 },
    ];

    revenueSheet.addRows(report.revenueBreakdown);

    /* ================= FILE NAME ================= */

    let fileName = "academy-report";

    if (from && to) {
      fileName += `-${from}_to_${to}`;
    } else {
      fileName += `-${month}-${year}`;
    }

    /* ================= RESPONSE ================= */

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {

    console.error("Excel Error:", err);

    res.status(500).json({
      message: "Excel generation failed",
    });

  }
};

/* ======================================================
DOWNLOAD ENROLLMENTS CSV
====================================================== */

exports.downloadEnrollmentsCSV = async (req, res) => {
  try {

    let { month, year, from, to } = req.query;

    /* ================= VALIDATION / DEFAULT ================= */

    if (!from && !to && (!month || !year)) {
      const now = new Date();
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }

    /* ================= BUILD REPORT ================= */

    const report = await buildMonthlyReport({
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null,
      from,
      to,
    });

    /* ================= CSV GENERATION ================= */

    const parser = new Parser();
    const csv = parser.parse(report.enrollmentTable);

    /* ================= FILE NAME ================= */

    let fileName = "enrollments";

    if (from && to) {
      fileName += `-${from}_to_${to}`;
    } else {
      fileName += `-${month}-${year}`;
    }

    /* ================= RESPONSE ================= */

    res.header("Content-Type", "text/csv");
    res.attachment(`${fileName}.csv`);
    res.send(csv);

  } catch (err) {

    console.error("Enrollments CSV Error:", err);

    res.status(500).json({
      message: "CSV generation failed",
    });

  }
};
/* ======================================================
DOWNLOAD TURF BOOKINGS CSV
====================================================== */

exports.downloadTurfCSV = async (req, res) => {
  try {

    let { month, year, from, to } = req.query;

    /* ================= VALIDATION / DEFAULT ================= */

    if (!from && !to && (!month || !year)) {
      const now = new Date();
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }

    /* ================= BUILD REPORT ================= */

    const report = await buildMonthlyReport({
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null,
      from,
      to,
    });

    /* ================= CSV GENERATION ================= */

    const parser = new Parser();
    const csv = parser.parse(report.turfTable);

    /* ================= FILE NAME ================= */

    let fileName = "turf-bookings";

    if (from && to) {
      fileName += `-${from}_to_${to}`;
    } else {
      fileName += `-${month}-${year}`;
    }

    /* ================= RESPONSE ================= */

    res.header("Content-Type", "text/csv");
    res.attachment(`${fileName}.csv`);
    res.send(csv);

  } catch (err) {

    console.error("Turf CSV Error:", err);

    res.status(500).json({
      message: "CSV generation failed",
    });

  }
};
/* ======================================================
DOWNLOAD REVENUE BREAKDOWN CSV
====================================================== */

exports.downloadRevenueCSV = async (req, res) => {

  try {

    const { month, year } = req.query;

    const report = await buildMonthlyReport(month, year);

    const parser = new Parser();

    const csv = parser.parse(report.revenueBreakdown);

    res.header("Content-Type", "text/csv");

    res.attachment(`revenue-${month}-${year}.csv`);

    res.send(csv);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: "CSV generation failed",
    });

  }

};