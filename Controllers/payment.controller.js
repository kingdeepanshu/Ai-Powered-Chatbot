const crypto = require("crypto");

const mongoose = require("mongoose");

const razorpay = require("../config/razorpay");

const Order = require("../models/Order");
const ApiKey = require("../models/ApiKey");

const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

    if (
      !amount ||
      typeof amount !== "number" ||
      amount < 1 ||
      !Number.isInteger(amount)
    ) {
      return res.status(400).json({
        error:
          "amount must be a positive integer (INR)",
      });
    }

    const existingOrder =
      await Order.findOne({
        userId: req.user.id,
        status: "PENDING",
      });

    if (existingOrder) {
      return res.json({
        orderId:
          existingOrder.razorpayOrderId,

        amount:
          existingOrder.amount * 100,
      });
    }

    let razorOrder;

    try {
      razorOrder =
        await razorpay.orders.create({
          amount: amount * 100,
          currency: "INR",
        });
    } catch (razorErr) {
      console.error(
        "Razorpay error:",
        razorErr,
      );

      return res.status(502).json({
        error: "Payment provider error",
      });
    }

    await Order.create({
      userId: req.user.id,

      razorpayOrderId: razorOrder.id,

      amount,
    });

    res.json({
      orderId: razorOrder.id,
      amount: amount * 100,
    });
  } catch (err) {
    console.error(
      "Create order error:",
      err,
    );

    res.status(500).json({
      error: "Failed to create order",
    });
  }
};

const webhookHandler = async (req, res) => {
  const signature =
    req.headers["x-razorpay-signature"];

  const expected = crypto
    .createHmac(
      "sha256",
      process.env.RAZORPAY_WEBHOOK_SECRET,
    )
    .update(req.body)
    .digest("hex");

  if (signature !== expected) {
    return res
      .status(400)
      .send("Invalid signature");
  }

  const event = JSON.parse(req.body);

  if (event.event === "payment.captured") {
    const payment =
      event.payload.payment.entity;

    try {
      const order = await Order.findOne({
        razorpayOrderId:
          payment.order_id,
      });

      if (
        !order ||
        order.status === "PAID"
      ) {
        return res.sendStatus(200);
      }

      order.status = "PAID";

      order.razorpayPaymentId =
        payment.id;

      await order.save();

      await ApiKey.updateMany(
        {
          userId: order.userId,
        },
        {
          $inc: {
            limit: 10000,
          },
        },
      );
    } catch (err) {
      console.error(
        "Webhook DB error:",
        err,
      );

      return res
        .status(500)
        .send("Internal error");
    }
  }

  res.sendStatus(200);
};

module.exports = {
  createOrder,
  webhookHandler,
};