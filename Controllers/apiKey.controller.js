const crypto = require("crypto");

const ApiKey = require("../models/ApiKey");

const hashKey = require("../helpers/hashKey");

const MAX_KEYS_PER_USER = 5;

const createKey = async (req, res) => {
  try {
    const existingCount =
      await ApiKey.countDocuments({
        userId: req.user.id,
      });

    if (existingCount >= MAX_KEYS_PER_USER) {
      return res.status(400).json({
        error: `Maximum of ${MAX_KEYS_PER_USER} API keys allowed per account`,
      });
    }

    const rawKey =
      "sk_" +
      crypto.randomBytes(16).toString("hex");

    await ApiKey.create({
      key: hashKey(rawKey),
      userId: req.user.id,
    });

    res.json({
      apiKey: rawKey,
    });
  } catch (err) {
    console.error("Create key error:", err);

    res.status(500).json({
      error: "Failed to create API key",
    });
  }
};

const getMyKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find(
      {
        userId: req.user.id,
      },
      {
        key: 0,
      },
    );

    res.json(keys);
  } catch (err) {
    console.error("My keys error:", err);

    res.status(500).json({
      error: "Failed to fetch keys",
    });
  }
};

module.exports = {
  createKey,
  getMyKeys,
};