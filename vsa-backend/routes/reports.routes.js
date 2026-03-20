const express = require("express");

const router = express.Router();

const {
  getMonthlyReport,
  downloadFullReportCSV,
  downloadEnrollmentsCSV,
  downloadTurfCSV,
  downloadRevenueCSV,
} = require("../controllers/reports.controller");

/* ======================================================
REPORT DATA
====================================================== */

router.get("/monthly", getMonthlyReport);

/* ======================================================
FULL PDF REPORT
====================================================== */

/* ======================================================
FULL CSV REPORT (ENROLLMENTS + TURF + REVENUE)
====================================================== */

router.get("/download-full-csv", downloadFullReportCSV);

/* ======================================================
ENROLLMENTS CSV
====================================================== */

router.get("/download-enrollments", downloadEnrollmentsCSV);

/* ======================================================
TURF BOOKINGS CSV
====================================================== */

router.get("/download-turf", downloadTurfCSV);

/* ======================================================
REVENUE BREAKDOWN CSV
====================================================== */

router.get("/download-revenue", downloadRevenueCSV);

module.exports = router;