const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");

const {
  createKey,
  getMyKeys,
} = require("../controllers/apiKey.controller");

const router = express.Router();

router.post(
  "/create-key",
  authMiddleware,
  createKey,
);

router.get(
  "/my-keys",
  authMiddleware,
  getMyKeys,
);

module.exports = router;