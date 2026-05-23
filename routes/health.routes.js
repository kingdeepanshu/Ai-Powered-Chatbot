const express = require("express");

const {
  healthCheck,
  home,
} = require("../controllers/health.controller");

const router = express.Router();

router.get("/health", healthCheck);

router.get("/", home);

module.exports = router;