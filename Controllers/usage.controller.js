const mongoose = require("mongoose");

const Usage = require("../models/Usage");

const getUsage = (req, res) => {
  res.json({
    used: req.apiKey.usage,
    limit: req.apiKey.limit,
    remaining:
      req.apiKey.limit -
      req.apiKey.usage,
  });
};

const getUsageStats = async (req, res) => {
  try {
    const data = await Usage.aggregate([
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
          _id: {
            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },

            day: {
              $dayOfMonth: "$createdAt",
            },
          },

          totalTokens: {
            $sum: "$totalTokens",
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
          "_id.day": 1,
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    console.error(
      "Usage stats error:",
      err,
    );

    res.status(500).json({
      error: "Failed to fetch usage stats",
    });
  }
};

module.exports = {
  getUsage,
  getUsageStats,
};