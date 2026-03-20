const Invoice = require("../models/Invoice");
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
  process.env.NODE_ENV === "production" || !!process.env.VERCEL;

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

  return await puppeteer.launch({ headless: true });
};

/* ============================================================
LOAD LOGO
============================================================ */

const logoBase64 = fs.readFileSync(
  path.join(__dirname, "../uploads/VSA-Logo-1.png"),
  "base64"
);

const logoSrc = `data:image/png;base64,${logoBase64}`;

const formatDate = (d) =>
  d ? format(new Date(d), "dd MMM yyyy") : "-";

/* ============================================================
INVOICE HTML BUILDER (UPDATED)
============================================================ */
const buildInvoiceHTML = ({ invoice, enrollment, rental }) => {
  const showDiscount = invoice.discount > 0;
  const registrationFee = enrollment?.registrationFee || 0;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>

body {
  font-family:'Poppins', sans-serif;
  padding: 20px;
}

.card {
  background: #fff;
  border-radius: 14px;
  max-width: 1000px;
  margin: auto;
  border: 1px solid #e5e7eb;
}

/* HEADER */
.header {
  display: flex;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid #eee;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo img {
  height: 36px;
}

.logo h2 {
  font-size: 18px;
  margin: 0;
}

.invoice-title {
  text-align: right;
}

.invoice-title h2 {
  margin: 0;
}

.invoice-no {
  color: #16a34a;
  font-size: 12px;
}

.badge {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #dcfce7;
  color: #15803d;
}

/* BILL SECTION */
.section {
  padding: 24px;
  border-bottom: 1px solid #eee;
}

.row {
  display: flex;
  justify-content: space-between;
}

.label {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
}

.bold {
  font-weight: 600;
}

/* TABLE */
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

thead {
  background: #f3f4f6;
  font-size: 12px;
  text-transform: uppercase;
  color: #6b7280;
}

th, td {
  padding: 12px;
}

td {
  border-top: 1px solid #eee;
}

.right {
  text-align: right;
}

/* TAG */
.tag {
  font-size: 10px;
  background: #dcfce7;
  color: #16a34a;
  padding: 3px 6px;
  border-radius: 6px;
  margin-left: 6px;
}

/* TOTALS */
.totals {
  width: 320px;
  margin-left: auto;
  margin-top: 20px;
}

.totals div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.reg {
  color: #2563eb;
}

.discount {
  color: #dc2626;
}

.grand {
  border-top: 1px solid #ddd;
  padding-top: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #16a34a;
}

/* FOOTER */
.footer {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  padding: 16px;
}

</style>
</head>

<body>

<div class="card">

  <!-- HEADER -->
  <div class="header">
    <div class="logo">
      <img src="${logoSrc}" />
      <h2>Vidyanchal Sports Academy</h2>
    </div>

    <div class="invoice-title">
      <h2>INVOICE</h2>
      <div class="invoice-no">${invoice.invoiceNo}</div>
      <div class="badge">${invoice.status.toUpperCase()}</div>
    </div>
  </div>

  <!-- BILL -->
  <div class="section row">

    <div>
      <div class="label">BILLED FROM</div>
      <div class="bold">Vidyanchal Sports Academy</div>
      <div>Baner, Pune, Maharashtra - 411007</div>
      <div>+91 9922143210</div>
      <div>vidyanchalsportsacademy@gmail.com</div>
      <div>GSTIN: 29ABCDE1234F1Z5</div>
    </div>

    <div style="text-align:right">
      <div class="label">BILLED TO</div>
      <div class="bold">${invoice.user?.name}</div>
      <div>${invoice.user?.mobile}</div>
      <div>${invoice.user?.email || ""}</div>
      <br/>
      <div>Payment Date: <strong>${formatDate(invoice.createdAt)}</strong></div>
    </div>

  </div>

  <!-- TABLE -->
  <div class="section">

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
          <td>
            ${invoice.itemDescription}
            <span class="tag">${invoice.type.toUpperCase()}</span>
          </td>
          <td class="right">${invoice.qty || 1}</td>
          <td class="right">₹${invoice.subTotal}</td>
          <td class="right">₹${invoice.subTotal}</td>
        </tr>
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="totals">

      ${
        registrationFee > 0
          ? `<div class="reg"><span>Registration Fee</span><span>₹${registrationFee}</span></div>`
          : ""
      }

      <div>
        <span>Subtotal</span>
        <span>₹${invoice.subTotal}</span>
      </div>

      ${
        showDiscount
          ? `<div class="discount"><span>Discount</span><span>- ₹${invoice.discount}</span></div>`
          : ""
      }

      <div class="grand">
        <span>Grand Total</span>
        <span>₹${invoice.total}</span>
      </div>

    </div>

  </div>

  <!-- PAYMENT -->
  <div class="section">
    <strong>Payment Method:</strong> ${invoice.paymentMode?.toUpperCase()}
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
GET ALL INVOICES (LIST)
============================================================ */
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });

    const formatted = invoices.map((i) => ({
      _id: i._id, // ✅ FIXED (CRITICAL)
      invoiceNo: i.invoiceNo,
      user: i.user, // ✅ keep full user object
      type: i.type,
      total: i.total,
      createdAt: i.createdAt,
      status: i.status,
    }));

    res.json({
      success: true,
      data: formatted,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ============================================================
DOWNLOAD INVOICE PDF (MAIN)
============================================================ */

const downloadInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();

    if (!invoice)
      return res.status(404).send("Invoice not found");

    let enrollment = null;
    let rental = null;

    if (invoice.enrollmentId) {
      enrollment = await Enrollment.findById(invoice.enrollmentId).lean();
    }

    if (invoice.turfRentalId) {
      rental = await TurfRental.findById(invoice.turfRentalId).lean();
    }

    const html = buildInvoiceHTML({
      invoice,
      enrollment,
      rental,
    });

    const browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setContent(html);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoice.invoiceNo}.pdf`
    );

    res.end(pdf);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id).lean();

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    let enrollment = null;

    if (invoice.enrollmentId) {
      enrollment = await Enrollment.findById(invoice.enrollmentId).lean();
    }

    res.json({
      success: true,
      data: {
        ...invoice,
        registrationFee: enrollment?.registrationFee || 0, 
      },
    });

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
};

/* ============================================================
EXPORTS
============================================================ */

module.exports = {
  getInvoices,
  getInvoiceById,
  downloadInvoicePDF,
};