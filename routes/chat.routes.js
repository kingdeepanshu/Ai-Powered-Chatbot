const express = require("express");

const apiKeyMiddleware = require("../middleware/apiKey.middleware");

const {
  aiLimiter,
} = require("../middleware/rateLimit.middleware");

const {
  chat,
  streamChat,
  getHistory,
} = require("../controllers/chat.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/chat",
  aiLimiter,
  apiKeyMiddleware,
  chat,
);

router.post(
  "/chat-stream",
  aiLimiter,
  apiKeyMiddleware,
  streamChat,
);

router.get(
  "/history/:userId",
  authMiddleware,
  getHistory,
);

module.exports = router;