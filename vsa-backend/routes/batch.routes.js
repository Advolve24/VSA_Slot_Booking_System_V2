const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const role = require("../middleware/role");

const batchController = require("../controllers/batch.controller");


/* ================= PUBLIC ================= */

router.get("/", batchController.getBatches);

router.get("/:id", batchController.getBatchById);


/* ================= ADMIN ================= */

router.post(
  "/",
  auth,
  role(["admin"]),
  batchController.createBatch
);

router.patch(
  "/:id",
  auth,
  role(["admin"]),
  batchController.updateBatch
);

router.delete(
  "/:id",
  auth,
  role(["admin"]),
  batchController.deleteBatch
);

module.exports = router;