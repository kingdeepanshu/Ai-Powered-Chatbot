const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");

const {
  promptRunLimiter,
} = require("../middleware/rateLimit.middleware");

const {
  createPrompt,
  getPrompts,
  deletePrompt,
  runPrompt,
} = require("../controllers/prompt.controller");

const router = express.Router();

router.post(
  "/prompts",
  authMiddleware,
  createPrompt,
);

router.get(
  "/prompts",
  authMiddleware,
  getPrompts,
);

router.delete(
  "/prompts/:id",
  authMiddleware,
  deletePrompt,
);

router.post(
  "/prompts/:id/run",
  authMiddleware,
  promptRunLimiter,
  runPrompt,
);

module.exports = router;