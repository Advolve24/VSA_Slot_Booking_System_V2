const cron = require("node-cron");
const Enrollment = require("../models/Enrollment");
const { sendRenewalReminderMail } = require("../utils/mailer");

/* ================= DATE HELPERS ================= */

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (from, to) => {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
};

/* ================= REMINDER LOGIC ================= */

const runEnrollmentRenewalReminder = async () => {
  try {
    const enrollments = await Enrollment.find({
      paymentStatus: "paid",
      email: { $exists: true, $ne: "" },
      endDate: { $exists: true },
    });

    // Send reminder on these days before expiry
    const reminderDays = [7, 3, 1];

    for (const enrollment of enrollments) {
      const daysLeft = daysBetween(new Date(), enrollment.endDate);

      if (!reminderDays.includes(daysLeft)) continue;

      /* ================= PREVENT DUPLICATE REMINDERS ================= */

      const alreadySentForSameEndDate =
        enrollment.renewalReminder?.sentForEndDate &&
        startOfDay(enrollment.renewalReminder.sentForEndDate).getTime() ===
          startOfDay(enrollment.endDate).getTime();

      if (alreadySentForSameEndDate) continue;

      /* ================= SKIP IF RENEWAL ALREADY OPEN ================= */

      const hasOpenRenewal =
        enrollment.renewalRequests?.some((r) =>
          ["pending", "approved", "paid"].includes(r.status)
        );

      if (hasOpenRenewal) continue;

      /* ================= SEND EMAIL ================= */

      await sendRenewalReminderMail({
        to: enrollment.email,
        playerName: enrollment.playerName,
        batchName: enrollment.batchName,
        planType: enrollment.planType,
        endDate: enrollment.endDate,
        enrollmentId: enrollment._id,
      });

      /* ================= UPDATE REMINDER INFO ================= */

      enrollment.renewalReminder = {
        lastSentAt: new Date(),
        sentForEndDate: new Date(enrollment.endDate),
        reminderDaysLeft: daysLeft,
      };

      await enrollment.save();

      console.log(
        `📧 Renewal reminder sent to ${enrollment.email} (${daysLeft} days left)`
      );
    }

    console.log("✅ Enrollment renewal reminder job executed successfully");
  } catch (err) {
    console.error(
      "❌ Enrollment renewal reminder job error:",
      err.message
    );
  }
};

/* ================= CRON START ================= */

const startEnrollmentRenewalReminderJob = () => {
  // Runs every day at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    await runEnrollmentRenewalReminder();
  });

  console.log("✅ Enrollment renewal reminder cron started");
};

module.exports = {
  startEnrollmentRenewalReminderJob,
  runEnrollmentRenewalReminder,
};