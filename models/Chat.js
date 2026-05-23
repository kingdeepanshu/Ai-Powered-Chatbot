const mongoose = require("mongoose");

const Chat = mongoose.model(
  "Chat",
  new mongoose.Schema(
    {
      userId: String,

      messages: [
        {
          role: String,
          content: String,
        },
      ],
    },
    { timestamps: true },
  ),
);

module.exports = Chat;