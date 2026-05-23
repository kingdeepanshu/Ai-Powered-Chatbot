const ApiKey = require("../models/ApiKey");
const hashKey = require("../helpers/hashKey");

const apiKeyMiddleware = async (req, res, next) => {
  const key = req.headers["x-api-key"];

  if (!key) {
    return res.status(401).json({
      error: "API key missing",
    });
  }

  try {
    const apiKey = await ApiKey.findOne({
      key: hashKey(key),
    });

    if (!apiKey) {
      return res.status(403).json({
        error: "Invalid API key",
      });
    }

    if (!apiKey.active) {
      return res.status(403).json({
        error: "API key disabled",
      });
    }

    if (apiKey.usage >= apiKey.limit) {
      return res.status(403).json({
        error: "Quota exceeded",
      });
    }

    req.apiKey = apiKey;

    next();
  } catch (err) {
    console.error("apiKeyMiddleware error:", err);

    res.status(500).json({
      error: "Internal server error",
    });
  }
};

module.exports = apiKeyMiddleware;