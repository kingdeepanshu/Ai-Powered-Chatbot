const mongoose = require("mongoose");

const Usage = require("../models/Usage");

const getOverview = async (req, res) => {
  try {
    const stats = await Usage.aggregate([
      {
        $match: {
          userId:
            new mongoose.Types.ObjectId(
              req.user.id,
            ),
        },
      },

      {
        $group: {
          _id: null,

          totalTokens: {
            $sum: "$totalTokens",
          },

          totalCost: {
            $sum: "$estimatedCost",
          },

          requests: {
            $sum: 1,
          },

          avgLatency: {
            $avg: "$latency",
          },
        },
      },
    ]);

    res.json(
      stats[0] || {
        totalTokens: 0,
        totalCost: 0,
        requests: 0,
        avgLatency: 0,
      },
    );
  } catch (err) {
    console.error(
      "Analytics overview error:",
      err,
    );

    res.status(500).json({
      error: "Failed to fetch analytics",
    });
  }
};

const getModels = async (req, res) => {
  try {
    const stats = await Usage.aggregate([
      {
        $match: {
          userId:
            new mongoose.Types.ObjectId(
              req.user.id,
            ),
        },
      },

      {
        $group: {
          _id: "$model",

          requests: {
            $sum: 1,
          },

          tokens: {
            $sum: "$totalTokens",
          },

          cost: {
            $sum: "$estimatedCost",
          },
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    console.error(
      "Analytics models error:",
      err,
    );

    res.status(500).json({
      error: "Failed to fetch model analytics",
    });
  }
};

module.exports = {
  getOverview,
  getModels,
};