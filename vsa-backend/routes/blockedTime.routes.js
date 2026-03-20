const router = require("express").Router();
const ctrl = require("../controllers/blockedTime.controller");

/* ================= CREATE BLOCK ================= */

router.post("/", ctrl.blockTime);

/* ================= GET ALL BLOCKS ================= */

router.get("/", ctrl.getBlockedTimes);

/* ================= GET BLOCK BY ID ================= */

router.get("/:id", ctrl.getBlockedTimeById);

/* ================= DELETE BLOCK ================= */

router.delete("/:id", ctrl.deleteBlockedTime);

module.exports = router;