const Enrollment = require("../models/Enrollment");
const TurfRental = require("../models/TurfRental");
const Facility = require("../models/Facility");
const Payment = require("../models/Payment");

exports.adminDashboard = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const year = now.getFullYear();

    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0);

    const upcomingEnd = new Date();
    upcomingEnd.setDate(now.getDate() + 3);

    /* ======================================================
       COUNTS
    ====================================================== */

    const [
      totalEnrollments,
      activeEnrollments,
      todaysTurfRentals,
      totalTurfRentals,
      facilities
    ] = await Promise.all([
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: "active" }),
      TurfRental.countDocuments({
        rentalDate: today,
        bookingStatus: { $ne: "cancelled" }
      }),
      TurfRental.countDocuments({
        bookingStatus: { $ne: "cancelled" }
      }),
      Facility.find().lean()
    ]);

    /* ======================================================
       ENROLLMENT REVENUE
    ====================================================== */

    const [
      enrollmentTotal,
      enrollmentMonthly
    ] = await Promise.all([

      Enrollment.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } }
      ]),

      Enrollment.aggregate([
        {
          $match: {
            paymentStatus: "paid",
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }
        },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } }
      ])
    ]);

    const totalEnrollmentRevenue = enrollmentTotal[0]?.total || 0;
    const monthlyEnrollmentRevenue = enrollmentMonthly[0]?.total || 0;

    /* ======================================================
       TURF REVENUE (FROM PAYMENTS COLLECTION)
    ====================================================== */

    const [
      turfTotal,
      turfMonthly
    ] = await Promise.all([

      Payment.aggregate([
        {
          $match: {
            purpose: "turf",
            status: "paid"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ]),

      Payment.aggregate([
        {
          $match: {
            purpose: "turf",
            status: "paid",
            createdAt: { $gte: monthStart, $lte: monthEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" }
          }
        }
      ])
    ]);

    const totalTurfRevenue = turfTotal[0]?.total || 0;
    const monthlyTurfRevenue = turfMonthly[0]?.total || 0;

    /* ======================================================
       MONTHLY REVENUE SERIES
    ====================================================== */

    const months = [
      "Jan","Feb","Mar","Apr","May","Jun",
      "Jul","Aug","Sep","Oct","Nov","Dec"
    ];

    const revenueSeries = await Promise.all(
      months.map(async (label, i) => {

        const start = new Date(year, i, 1);
        const end = new Date(year, i + 1, 0);

        const [e, t] = await Promise.all([

          Enrollment.aggregate([
            {
              $match: {
                paymentStatus: "paid",
                createdAt: { $gte: start, $lte: end }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$finalAmount" }
              }
            }
          ]),

          Payment.aggregate([
            {
              $match: {
                purpose: "turf",
                status: "paid",
                createdAt: { $gte: start, $lte: end }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" }
              }
            }
          ])
        ]);

        return {
          month: label,
          coaching: e[0]?.total || 0,
          turf: t[0]?.total || 0
        };

      })
    );

    /* ======================================================
       UPCOMING TURF BOOKINGS
    ====================================================== */

    const upcomingSlots = await TurfRental.find({
      rentalDate: {
        $gte: today,
        $lte: upcomingEnd.toISOString().slice(0, 10)
      },
      bookingStatus: { $ne: "cancelled" }
    })
      .sort({ rentalDate: 1 })
      .limit(10)
      .lean();

    /* ======================================================
       FACILITY UTILIZATION
    ====================================================== */

    const MAX_DAILY_SLOTS = 16;

    const facilityUtilization = await Promise.all(
      facilities.map(async (f) => {

        const bookings = await TurfRental.countDocuments({
          facilityId: f._id,
          bookingStatus: { $ne: "cancelled" }
        });

        const utilization = Math.min(
          Math.round((bookings / MAX_DAILY_SLOTS) * 100),
          100
        );

        return {
          facilityId: f._id,
          name: f.name,
          utilization
        };

      })
    );

    const turfUtilization = facilityUtilization.length
      ? Math.round(
          facilityUtilization.reduce(
            (s, f) => s + f.utilization,
            0
          ) / facilityUtilization.length
        )
      : 0;

    /* ======================================================
       RESPONSE
    ====================================================== */

    res.json({

      totalEnrollments,
      activeEnrollments,

      todaysTurfRentals,
      totalTurfRentals,

      monthlyRevenue:
        monthlyEnrollmentRevenue + monthlyTurfRevenue,

      monthlyRevenueBreakup: {
        coaching: monthlyEnrollmentRevenue,
        turf: monthlyTurfRevenue
      },

      totalRevenue:
        totalEnrollmentRevenue + totalTurfRevenue,

      revenueSeries,

      upcomingSlots,

      turfUtilization,
      facilityUtilization

    });

  }

  catch (err) {

    console.error("Admin dashboard error:", err);

    res.status(500).json({
      message: "Admin dashboard error"
    });

  }
};