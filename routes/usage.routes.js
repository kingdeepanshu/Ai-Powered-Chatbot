const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");

const apiKeyMiddleware = require("../middleware/apiKey.middleware");

const {
  getUsage,
  getUsageStats,
} = require("../controllers/usage.controller");

const router = express.Router();

router.get(
  "/usage",
  apiKeyMiddleware,
  getUsage,
);

router.get(
  "/usage-stats",
  authMiddleware,
  getUsageStats,
);

module.exports = router;