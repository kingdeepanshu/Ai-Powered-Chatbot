const mongoose = require("mongoose");

const ApiKey = mongoose.model(
  "ApiKey",
  new mongoose.Schema(
    {
      key: {
        type: String,
        unique: true,
      },

      usage: {
        type: Number,
        default: 0,
      },

      limit: {
        type: Number,
        default: 5000,
      },

      userId: mongoose.Schema.Types.ObjectId,

      lastUsed: {
        type: Date,
        default: null,
      },

      active: {
        type: Boolean,
        default: true,
      },
    },
    { timestamps: true },
  ),
);

module.exports = ApiKey;