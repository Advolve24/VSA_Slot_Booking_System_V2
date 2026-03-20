const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

// ROUTES
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const sportRoutes = require("./routes/sport.routes");
const facilityRoutes = require("./routes/facility.routes");
const batchRoutes = require("./routes/batch.routes");
const enrollmentRoutes = require("./routes/enrollment.routes");
const paymentRoutes = require("./routes/payment.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const turfRentalRoutes = require("./routes/turfRental.routes");
const reportsRoutes = require("./routes/reports.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const settingsRoutes = require("./routes/settings.routes");
const discountRoutes = require("./routes/discount.routes");
const blockedTimeRoutes = require("./routes/blockedTime.routes");


const app = express();

// -------------------------------------------
// GLOBAL MIDDLEWARES
// -------------------------------------------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://vsa-slot-booking-system.vercel.app",
      "https://vsa-admin-system.vercel.app",
    ],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// -------------------------------------------
// STATIC UPLOADS
// -------------------------------------------
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// -------------------------------------------
// HEALTH CHECK
// -------------------------------------------
app.get("/", (_, res) => {
  res.send("VSA Backend API Running 🚀");
});

app.get("/api/health", (_, res) => {
  res.json({ status: "ok", time: new Date() });
});

// -------------------------------------------
// API ROUTES
// -------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sports", sportRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/turf-rentals", turfRentalRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/discounts", discountRoutes); 
app.use("/api/blocked-times", blockedTimeRoutes);

// -------------------------------------------
// 404 HANDLER
// -------------------------------------------
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// -------------------------------------------
// ERROR HANDLER
// -------------------------------------------
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
