const rateLimit = require("express-rate-limit");

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

const promptRunLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

module.exports = {
  globalLimiter,
  aiLimiter,
  promptRunLimiter,
};