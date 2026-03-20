require("dotenv").config();
const mongoose = require("mongoose");

/* ================================
   CONNECT DATABASE
================================ */
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    const app = require("./app");

    /* ================================
       IMPORT CRON JOB
    ================================= */

   const {
      startEnrollmentRenewalReminderJob,
    } = require("./jobs/enrollmentRenewalReminder");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, "0.0.0.0", async () => {

      console.log(`🚀 Server running on port ${PORT}`);

      /* ================================
         START CRON
      ================================= */
      startEnrollmentRenewalReminderJob();

      console.log("⏰ Cron started");
    });

  })
  .catch((err) => {
    console.error("❌ DB error:", err);
    process.exit(1);
  });