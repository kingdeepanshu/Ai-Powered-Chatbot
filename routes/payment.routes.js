const express = require("express");

const expressRaw = express.raw({
  type: "application/json",
});

const authMiddleware = require("../middleware/auth.middleware");

const {
  createOrder,
  webhookHandler,
} = require("../controllers/payment.controller");

const router = express.Router();

router.post(
  "/create-order",
  authMiddleware,
  createOrder,
);

router.post(
  "/webhook",
  expressRaw,
  webhookHandler,
);

module.exports = router;