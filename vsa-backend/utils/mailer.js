const nodemailer = require("nodemailer");

/* =========================================================
   TRANSPORTER
========================================================= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =========================================================
   COMMON MOBILE WRAPPER
========================================================= */

const wrapTemplate = (content) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="420" cellpadding="0" cellspacing="0"
style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

${content}

<tr>
<td style="text-align:center;font-size:11px;color:#888;padding:14px;">
 © 2026 <b><a href="https://vidyanchalsportsacademy.com" style="color:#166534;text-decoration:none;">Vidyanchal Sports Academy</a></b><br/>
Powered by <b><a href="https://advolve.in" style="color:#166534;text-decoration:none;">ADVOLVE</a></b>
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
/* =========================================================
   HELPERS
========================================================= */

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d)) return "-";

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

const formatTime12h = (time) => {
  if (!time || !time.includes(":")) return "-";

  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;

  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};
/* =========================================================
   1️⃣ ENROLLMENT MAIL
========================================================= */
exports.sendEnrollmentMail = async ({
  to,
  enrollment,     // 👈 PASS FULL OBJECT (IMPORTANT)
  batch           // 👈 OPTIONAL (if you populate batch timings)
}) => {

  /* ================= SAFE DATA ================= */

  const playerName = enrollment.playerName || "-";
  const sportName = enrollment.sportName || "-";
  const batchName = enrollment.batchName || "-";
  const coachName = enrollment.coachName || "-";
  const planType = enrollment.planType || "-";

  const startDate = enrollment.startDate;
  const endDate = enrollment.endDate;

  const registrationFee = enrollment.registrationFee || 0;
  const finalAmount = enrollment.finalAmount || 0;

  /* ================= BATCH TIME ================= */

  // 👇 Try from batch (recommended)
  let batchTime = "-";

  if (batch?.startTime && batch?.endTime) {
    batchTime = `${formatTime12h(batch.startTime)} - ${formatTime12h(batch.endTime)}`;
  }

  // 👇 fallback if you store directly
  else if (enrollment.batchStartTime && enrollment.batchEndTime) {
    batchTime = `${formatTime12h(enrollment.batchStartTime)} - ${formatTime12h(enrollment.batchEndTime)}`;
  }

  /* ================= CONTENT ================= */

  const content = `

<tr>
<td style="background:#166534;padding:26px;text-align:center;color:#fff;">

<!-- LOGO UI -->
<div style="
  width:80px;
  height:80px;
  border-radius:50%;
  background: linear-gradient(135deg,#bbf7d0,#fde68a);
  display:flex;
  align-items:center;
  justify-content:center;
  margin:0 auto 12px;
">
  <img src="https://your-domain.com/VSA-Logo-1.png"
       style="width:42px;height:auto;" />
</div>

<div style="font-size:20px;font-weight:600;">
Enrollment Confirmed ✅
</div>

<div style="font-size:12px;margin-top:6px;">
Your batch registration has been successfully completed.
</div>

</td>
</tr>

<tr>
<td style="padding:20px;">

<div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:10px;">
ENROLLMENT INFORMATION
</div>

<table width="100%" style="font-size:13px;color:#111;line-height:1.8;">

<tr>
<td>Name</td>
<td align="right"><b>${playerName}</b></td>
</tr>

<tr>
<td>Sport</td>
<td align="right">${sportName}</td>
</tr>

<tr>
<td>Batch</td>
<td align="right">${batchName}</td>
</tr>

<tr>
<td>Coach</td>
<td align="right">${coachName}</td>
</tr>

<tr>
<td>Batch Time</td>
<td align="right">${batchTime}</td>
</tr>

<tr>
<td>Start Date</td>
<td align="right">${formatDate(startDate)}</td>
</tr>

<tr>
<td>End Date</td>
<td align="right">${formatDate(endDate)}</td>
</tr>

<tr>
<td>Plan Type</td>
<td align="right">${planType}</td>
</tr>

</table>

<!-- PAYMENT -->

<div style="margin-top:16px;font-size:11px;color:#6b7280;font-weight:700;">
PAYMENT SUMMARY
</div>

<div style="
  background:#f3f4f6;
  border-radius:10px;
  padding:12px;
  margin-top:8px;
">

<table width="100%" style="font-size:13px;line-height:1.8;">

${
  registrationFee > 0
    ? `<tr>
        <td>Registration Fee</td>
        <td align="right">₹${registrationFee}</td>
      </tr>`
    : ""
}

<tr>
<td><b>Total Paid</b></td>
<td align="right" style="color:#166534;">
<b>₹${finalAmount}</b>
</td>
</tr>

</table>

</div>

<div style="text-align:center;margin-top:16px;font-size:12px;color:#6b7280;">
We’re excited to have you train with us. See you on the field!
</div>

</td>
</tr>
`;

  /* ================= SEND ================= */

  await transporter.sendMail({
    from: `"Vidyanchal Sports Academy" <${process.env.SMTP_USER}>`,
    to,
    subject: "Enrollment Confirmed ✅",
    html: wrapTemplate(content),
  });
};

/* =========================================================
   2️⃣ TURF BOOKING MAIL
========================================================= */

exports.sendTurfBookingMail = async ({
  to,
  userName,
  facilityName,
  sportName,
  rentalDate,
  startTime,
  endTime,
  finalAmount,
  totalPaid,
  dueAmount,
}) => {

  const safeFinal = Number(finalAmount || 0);
  const safePaid = Number(totalPaid || 0);
  const safeDue =
    dueAmount !== undefined
      ? Number(dueAmount)
      : Math.max(0, safeFinal - safePaid);

  const content = `

<tr>
<td style="background:#166534;padding:26px;text-align:center;color:#fff;">

<img src="https://your-domain.com/logo.png" style="width:50px;margin-bottom:10px;" />

<div style="font-size:20px;font-weight:600;">Booking Confirmed ⚽</div>
<div style="font-size:12px;margin-top:6px;">
Your turf reservation has been successfully scheduled.
</div>

</td>
</tr>

<tr>
<td style="padding:20px;">

<div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:10px;">
BOOKING DETAILS
</div>

<table width="100%" style="font-size:13px;color:#111;">
<tr><td>Name</td><td align="right"><b>${userName}</b></td></tr>
<tr><td>Facility</td><td align="right">${facilityName}</td></tr>
<tr><td>Sport</td><td align="right">${sportName}</td></tr>

<tr>
<td>Date & Time</td>
<td align="right">
${formatDate(rentalDate)}, 
${formatTime12h(startTime)} - ${formatTime12h(endTime)}
</td>
</tr>
</table>

<div style="margin-top:16px;font-size:11px;color:#6b7280;font-weight:700;">
PAYMENT SUMMARY
</div>

<div style="background:#f3f4f6;border-radius:10px;padding:12px;margin-top:8px;">

<table width="100%" style="font-size:13px;">
<tr><td>Total Amount</td><td align="right">₹${safeFinal}</td></tr>
<tr><td>Paid Amount</td><td align="right">₹${safePaid}</td></tr>
<tr>
<td><b>Due Amount</b></td>
<td align="right" style="color:#166534;"><b>₹${safeDue}</b></td>
</tr>
</table>

</div>

<div style="text-align:center;margin-top:16px;font-size:12px;color:#6b7280;">
We look forward to hosting your game. Have a great match!
</div>

</td>
</tr>
`;

  await transporter.sendMail({
    from: `"Vidyanchal Sports Academy" <${process.env.SMTP_USER}>`,
    to,
    subject: "Booking Confirmed ⚽",
    html: wrapTemplate(content),
  });
};
/* =========================================================
   3️⃣ ENROLLMENT RENEWAL REMINDER MAIL
========================================================= */

exports.sendRenewalReminderMail = async ({
  to,
  playerName,
  batchName,
  planType,
  endDate,
  enrollmentId,
}) => {

  const portalBase =
    process.env.FRONTEND_URL || process.env.CLIENT_URL;

  const renewUrl =
    `${portalBase}/renew-enrollment/${enrollmentId}`;

  const callUrl = `tel:+919922143210`;

  const content = `

<tr>
<td style="background:linear-gradient(135deg,#1b0940,#2a0f66);
padding:32px;text-align:center;color:white;">

<h1 style="margin:0;font-size:20px;font-weight:600;">
Enrollment Expiring Soon ⏳
</h1>

<div style="margin-top:12px;background:white;color:#1b0940;
padding:6px 16px;border-radius:30px;font-size:12px;font-weight:bold;
display:inline-block;">

Continue Your Training Without Interruption

</div>

</td>
</tr>


<tr>
<td style="padding:24px;">

<p style="font-size:14px;margin-bottom:14px;">
Hi <b>${playerName}</b> 👋
</p>

<p style="font-size:14px;margin-bottom:14px;line-height:1.6;">
Your <strong>${planType}</strong> enrollment for 
<strong>${batchName}</strong> will expire on 
<strong>${formatDate(endDate)}</strong>.
</p>

<p style="font-size:13px;margin-bottom:20px;color:#555;line-height:1.6;">
To continue your coaching without interruption, you can renew your enrollment now.
If you plan to take a break, you may also apply for leave.
</p>


<!-- ACTION BUTTONS -->

<div style="text-align:center;margin:28px 0;">

<a href="${renewUrl}"
style="display:inline-block;background:#1b0940;color:white;
padding:12px 24px;border-radius:8px;text-decoration:none;
font-weight:bold;font-size:14px;margin-right:10px;
box-shadow:0 4px 10px rgba(0,0,0,0.15);">

Renew Now

</a>

<a href="${callUrl}"
style="display:inline-block;background:#16a34a;color:white;
padding:12px 24px;border-radius:8px;text-decoration:none;
font-weight:bold;font-size:14px;
box-shadow:0 4px 10px rgba(0,0,0,0.15);">

Call Academy

</a>

</div>


<div style="background:#f6f7fb;padding:14px;border-radius:10px;
font-size:12px;color:#555;margin-top:10px;line-height:1.6;">

If you successfully renew your enrollment or submit a leave request,
the links in this email will automatically become inactive to prevent duplicate actions.

</div>


<p style="margin-top:16px;font-size:12px;color:#777;">
Enrollment ID: <b>${enrollmentId}</b>
</p>

</td>
</tr>

`;

  await transporter.sendMail({
    from: `"Vidyanchal Sports Academy" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reminder: Your Enrollment is Expiring Soon ⏳",
    html: wrapTemplate(content),
  });

};

/* =========================================================
   4️⃣ ENROLLMENT RENEWAL SUCCESS MAIL
========================================================= */

exports.sendRenewalSuccessMail = async ({
  to,
  playerName,
  batchName,
  sportName,
  coachName,
  planType,
  startDate,
  endDate,
  amount,
  enrollmentId
}) => {

  const content = `

<tr>
<td style="background:linear-gradient(135deg,#ee7c00,#ff9a1f);
padding:32px;text-align:center;color:white;">

<h1 style="margin:0;font-size:20px;font-weight:600;">
Enrollment Renewed Successfully 🎉
</h1>

<div style="margin-top:12px;background:white;color:#ee7c00;
padding:6px 16px;border-radius:30px;font-size:12px;font-weight:bold;
display:inline-block;">

₹${amount} Paid

</div>

</td>
</tr>


<tr>
<td style="padding:24px;">

<p style="font-size:14px;margin-bottom:14px;">
Hi <b>${playerName}</b> 👋
</p>

<p style="font-size:14px;margin-bottom:18px;line-height:1.6;">
Your enrollment has been successfully renewed.
You can now continue your training without interruption.
</p>


<!-- PROGRAM CARD -->

<div style="background:#f7f7f9;padding:16px;border-radius:12px;margin-bottom:16px;line-height:1.6;">

<strong style="font-size:15px;color:#ee7c00;">
${sportName}
</strong><br/>

${batchName}<br/>

<span style="color:#555;">
Coach: ${coachName}
</span>

</div>


<div style="font-size:13px;margin-bottom:16px;">
<b>Plan:</b> ${planType?.toUpperCase()}
</div>


<!-- DATE TABLE -->

<table width="100%" cellpadding="8" cellspacing="0"
style="text-align:center;font-size:12px;margin-bottom:18px;">

<tr>

<td style="background:#f3f4f6;border-radius:8px;">
<small>Start Date</small><br/>
<strong>${formatDate(startDate)}</strong>
</td>

<td style="background:#f3f4f6;border-radius:8px;">
<small>End Date</small><br/>
<strong>${formatDate(endDate)}</strong>
</td>

</tr>

</table>


<div style="background:#fff7ed;padding:14px;border-radius:10px;
font-size:12px;color:#444;line-height:1.6;">

Your enrollment has been successfully renewed and your training will continue
seamlessly for the new plan duration.

</div>


<p style="margin-top:16px;font-size:12px;color:#777;">
Enrollment ID: <b>${enrollmentId}</b>
</p>

</td>
</tr>

`;

  await transporter.sendMail({
    from: `"Vidyanchal Sports Academy" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your Enrollment Renewal is Successful 🎉",
    html: wrapTemplate(content),
  });

};