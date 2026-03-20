const express = require("express");
const router = express.Router();

const {
  getInvoices,
  getInvoiceById,
  downloadInvoicePDF,
} = require("../controllers/invoice.controller");

const authRequired = require("../middleware/auth");

router.get("/", authRequired, getInvoices);

router.get("/:id", authRequired, getInvoiceById);

router.get("/:id/download", authRequired, downloadInvoicePDF);

module.exports = router;