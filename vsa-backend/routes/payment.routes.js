const router = require("express").Router();
const controller = require("../controllers/payment.controller");

router.post("/create-order", controller.createOrder);
router.post("/verify", controller.verifyPayment);


module.exports = router;