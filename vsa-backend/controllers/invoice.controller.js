const Enrollment = require("../models/Enrollment");
const TurfRental = require("../models/TurfRental");
const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");
const { format } = require("date-fns");
const fs = require("fs");
const path = require("path");

/* ============================================================
   ENV DETECTION
============================================================ */

const isProduction =
  process.env.NODE_ENV === "production" ||
  !!process.env.VERCEL;

/* ============================================================
   BROWSER LAUNCH
============================================================ */

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

/* ============================================================
   LOAD LOGO
============================================================ */

const logoBase64 = fs.readFileSync(
  path.join(__dirname, "../uploads/VSA-Logo-1.png"),
  "base64"
);

const logoSrc = `data:image/png;base64,${logoBase64}`;

/* ============================================================
   HELPERS
============================================================ */

const generateInvoiceNo = (id, prefix) =>
  `${prefix}-${id.toString().slice(-6).toUpperCase()}`;

const formatDate = (d) =>
  d ? format(new Date(d), "dd MMM yyyy") : "-";

const formatAddress = (address) =>
  address
    ? [
        address.localAddress,
        address.city,
        address.state,
        address.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

/* ============================================================
   GET ENROLLMENT INVOICE (JSON)
============================================================ */

const getEnrollmentInvoice = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id).lean();

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // 🔒 SECURITY CHECK
    if (
      String(enrollment.userId) !== String(req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "You are not allowed to view this invoice",
      });
    }

    res.json({
      success: true,
      type: "enrollment",
      data: enrollment,
    });

  } catch (err) {
    console.error("Enrollment Invoice Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   GET TURF INVOICE (JSON)
============================================================ */

const getTurfInvoice = async (req, res) => {
  try {
    const rental = await TurfRental.findById(req.params.id).lean();

    if (!rental)
      return res.status(404).json({ message: "Turf booking not found" });

     // 🔒 SECURITY CHECK
    if (
      String(rental.userId) !== String(req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "You are not allowed to view this invoice",
      });
    }


    res.json({
      success: true,
      type: "turf",
      data: rental,
    });

  } catch (err) {
    console.error("Turf Invoice Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
   COMMON INVOICE HTML BUILDER (ADMIN EXACT LAYOUT)
============================================================ */

const buildInvoiceHTML = ({
  invoiceNo,
  status,
  billedTo,
  itemDescription,
  qty,
  rate,
  subTotal,
  discount,
  discountRows = "",
  grandTotal,
  paymentMode,
  createdAt,
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#f3f4f6;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;
  padding:40px;
  color:#111827;
}

.card{
  background:#ffffff;
  max-width:950px;
  margin:auto;
  border-radius:16px;
  box-shadow:0 4px 20px rgba(0,0,0,0.05);
  overflow:hidden;
}

/* ================= HEADER ================= */

.header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:28px 32px;
  border-bottom:1px solid #e5e7eb;
}

.brand{
  display:flex;
  align-items:center;
  gap:14px;
}

.brand img{
  height:48px;
}

.company-name{
  font-size:20px;
  font-weight:600;
}

.invoice-right{
  text-align:right;
}

.invoice-title{
  font-size:24px;
  font-weight:700;
  letter-spacing:1px;
}

.invoice-no{
  font-size:13px;
  color:#059669;
  margin-top:4px;
}

.badge{
  display:inline-block;
  margin-top:8px;
  padding:5px 14px;
  border-radius:999px;
  font-size:11px;
  font-weight:600;
  background:#d1fae5;
  color:#065f46;
}

/* ================= BILL SECTION ================= */

.section{
  padding:28px 32px;
  border-bottom:1px solid #e5e7eb;
}

.row{
  display:flex;
  justify-content:space-between;
  gap:40px;
}

.column{
  width:48%;
  font-size:14px;
}

.section-title{
  font-size:12px;
  font-weight:600;
  color:#6b7280;
  margin-bottom:8px;
  letter-spacing:.5px;
}

.column p{
  margin:4px 0;
}

/* ================= TABLE ================= */

table{
  width:100%;
  border-collapse:collapse;
  font-size:14px;
}

thead{
  background:#f9fafb;
}

th{
  text-align:left;
  padding:12px;
  font-size:12px;
  text-transform:uppercase;
  color:#6b7280;
  font-weight:600;
}

td{
  padding:14px 12px;
  border-bottom:1px solid #f1f5f9;
}

.right{
  text-align:right;
}

/* ================= TOTALS ================= */

.totals{
  width:380px;
  margin-left:auto;
  margin-top:30px;
  font-size:14px;
}

.totals div{
  display:flex;
  justify-content:space-between;
  margin-bottom:8px;
}

.discount-row{
  color:#dc2626;
}

.grand{
  font-weight:700;
  font-size:18px;
  color:#059669;
  border-top:1px solid #e5e7eb;
  padding-top:10px;
  margin-top:10px;
}

/* ================= PAYMENT ================= */

.payment-section{
  padding:24px 32px;
  border-bottom:1px solid #e5e7eb;
  font-size:14px;
}

/* ================= FOOTER ================= */

.footer{
  text-align:center;
  padding:20px;
  font-size:12px;
  color:#6b7280;
}
</style>

</head>

<body>

<div class="card">

  <!-- HEADER -->
  <div class="header">
    <div class="brand">
      <img src="${logoSrc}" />
      <div class="company-name">
        Vidyanchal Sports Academy
      </div>
    </div>

    <div class="invoice-right">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-no">${invoiceNo}</div>
      <div class="badge">${status}</div>
    </div>
  </div>

  <!-- BILL SECTION -->
  <div class="section">
    <div class="row">
      <div class="column">
        <div class="section-title">BILLED FROM</div>
        <p><strong>Vidyanchal Sports Academy</strong></p>
        <p>Vidyanchal School Sr. No. 259 Balaji Park</p>
        <p>Baner, Pune, Maharashtra - 411007</p>
        <p>+91 9922143210</p>
        <p>vidyanchalsportsacademy@gmail.com</p>
        <p>GSTIN: 29ABCDE1234F1Z5</p>
      </div>

      <div class="column" style="text-align:right;">
        <div class="section-title">BILLED TO</div>
        <p><strong>${billedTo.name}</strong></p>
        <p>${billedTo.mobile}</p>
        <p>${billedTo.email || ""}</p>
        <p>${billedTo.address || ""}</p>
        <p style="margin-top:10px;">
          Payment Date: <strong>${formatDate(createdAt)}</strong>
        </p>
      </div>
    </div>
  </div>

  <!-- ITEMS -->
  <div class="section">
    <div class="section-title">ITEMS & SERVICES</div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th class="right">Qty</th>
          <th class="right">Rate</th>
          <th class="right">Amount</th>
        </tr>
      </thead>

      <tbody>
        <tr>
          <td>1</td>
          <td>${itemDescription}</td>
          <td class="right">${qty}</td>
          <td class="right">₹${rate}</td>
          <td class="right">₹${subTotal}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div>
        <span>Subtotal</span>
        <span>₹${subTotal}</span>
      </div>

      ${discountRows}

      <div class="discount-row">
        <span>Total Discount</span>
        <span>- ₹${discount}</span>
      </div>

      <div class="grand">
        <span>Grand Total</span>
        <span>₹${grandTotal}</span>
      </div>
    </div>
  </div>

  <!-- PAYMENT INFO -->
  <div class="payment-section">
    <div class="section-title">PAYMENT INFORMATION</div>
    <p>Method: ${paymentMode?.toUpperCase()}</p>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    Thank you for choosing Vidyanchal Sports Academy.<br/>
    For queries contact vidyanchalsportsacademy@gmail.com
  </div>

</div>

</body>
</html>
`;
};


/* ============================================================
   DOWNLOAD ENROLLMENT PDF
============================================================ */

const downloadEnrollmentInvoicePDF = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id).lean();
    if (!enrollment)
      return res.status(404).send("Enrollment not found");

    /* ================= SECURITY CHECK ================= */
    if (
      String(enrollment.userId) !== String(req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "You are not allowed to download this invoice",
      });
    }

    const invoiceNo = generateInvoiceNo(enrollment._id, "ENR");

    const discountRows = (enrollment.discounts || [])
      .map(
        (d) => `
        <div>
          <span>${d.title || d.code || "Discount"}</span>
          <span>- ₹${d.discountAmount || 0}</span>
        </div>
      `
      )
      .join("");

    const html = buildInvoiceHTML({
      invoiceNo,
      status: enrollment.paymentStatus?.toUpperCase() || "PAID",
      billedTo: {
        name: enrollment.playerName,
        mobile: enrollment.mobile,
        email: enrollment.email,
        address: formatAddress(enrollment.address),
      },
      itemDescription: `${enrollment.sportName} - ${enrollment.batchName}`,
      qty: enrollment.durationMonths || 1,
      rate: enrollment.monthlyFee || 0,
      subTotal: enrollment.baseAmount || 0,
      discount: enrollment.totalDiscountAmount || 0,
      discountRows,
      grandTotal: enrollment.finalAmount || 0,
      paymentMode: enrollment.paymentMode,
      createdAt: enrollment.createdAt,
    });

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoiceNo}.pdf`
    );

    return res.end(pdf);

  } catch (err) {
    console.error("Enrollment PDF error:", err);
    res.status(500).send(err.message);
  }
};

/* ============================================================
   DOWNLOAD TURF PDF
============================================================ */

const downloadTurfInvoicePDF = async (req, res) => {
  try {
    const rental = await TurfRental.findById(req.params.id).lean();

    if (!rental)
      return res.status(404).send("Turf booking not found");

    /* ================= SECURITY CHECK ================= */
    if (
      String(rental.userId) !== String(req.user.id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        message: "You are not allowed to download this invoice",
      });
    }

    const invoiceNo = generateInvoiceNo(rental._id, "TRF");

    /* ================= NEW DISCOUNT LOGIC ================= */

    const discountRows = (rental.discounts || [])
      .map(
        (d) => `
        <div>
          <span>${d.title || d.code || "Discount"} ${
            d.type === "percentage"
              ? `(${d.value}%)`
              : `(₹${d.value})`
          }</span>
          <span>- ₹${d.discountAmount || 0}</span>
        </div>
      `
      )
      .join("");

    const html = buildInvoiceHTML({
      invoiceNo,
      status: rental.paymentStatus?.toUpperCase() || "PAID",

      billedTo: {
        name: rental.userName,
        mobile: rental.phone,
        email: rental.email,
      },

      itemDescription: `${rental.sportName} - ${rental.facilityName}`,

      qty: rental.slots?.length || 1,

      // ⚠️ IMPORTANT FIXES
      rate:
        rental.hourlyRate || 
        (rental.baseAmount / (rental.slots?.length || 1)) || 0,

      subTotal: rental.baseAmount || 0,

      discount: rental.totalDiscountAmount || 0,

      discountRows,

      grandTotal: rental.finalAmount || 0,

      paymentMode: rental.paymentMode,
      createdAt: rental.createdAt,
    });

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoiceNo}.pdf`
    );

    return res.end(pdf);

  } catch (err) {
    console.error("Turf PDF error:", err);
    res.status(500).send(err.message);
  }
};

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  getEnrollmentInvoice,
  getTurfInvoice,
  downloadEnrollmentInvoicePDF,
  downloadTurfInvoicePDF,
};
