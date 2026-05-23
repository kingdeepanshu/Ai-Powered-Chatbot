const mongoose = require("mongoose");

const Usage = mongoose.model(
  "Usage",
  new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,

      model: String,

      provider: String,

      endpoint: String,

      promptTokens: Number,

      completionTokens: Number,

      totalTokens: Number,

      estimatedCost: Number,

      latency: Number,
    },
    { timestamps: true },
  ),
);

module.exports = Usage;