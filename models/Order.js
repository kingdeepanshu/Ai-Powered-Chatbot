const mongoose = require("mongoose");

const Order = mongoose.model(
  "Order",
  new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,

      razorpayOrderId: String,

      razorpayPaymentId: String,

      amount: Number,

      status: {
        type: String,
        default: "PENDING",
      },
    },
    { timestamps: true },
  ),
);

module.exports = Order;