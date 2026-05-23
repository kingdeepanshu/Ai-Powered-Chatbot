const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");

const {
  getOverview,
  getModels,
} = require("../controllers/analytics.controller");

const router = express.Router();

router.get(
  "/analytics/overview",
  authMiddleware,
  getOverview,
);

router.get(
  "/analytics/models",
  authMiddleware,
  getModels,
);

module.exports = router;