const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const {
  globalLimiter,
} = require("./middleware/rateLimit.middleware");

const authRoutes = require("./routes/auth.routes");
const apiKeyRoutes = require("./routes/apiKey.routes");
const promptRoutes = require("./routes/prompt.routes");
const chatRoutes = require("./routes/chat.routes");
const usageRoutes = require("./routes/usage.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const paymentRoutes = require("./routes/payment.routes");
const healthRoutes = require("./routes/health.routes");

const app = express();

process.on(
  "unhandledRejection",
  (reason, promise) => {
    console.error(
      "Unhandled Rejection at:",
      promise,
      "reason:",
      reason,
    );
  },
);

process.on("uncaughtException", (err) => {
  console.error(
    "Uncaught Exception:",
    err,
  );

  process.exit(1);
});

const corsOptions = {
  origin:
    process.env.ALLOWED_ORIGIN || "*",
};

app.set("trust proxy", 1);

app.use(cors(corsOptions));

app.use(globalLimiter);

app.use("/webhook", express.raw({
  type: "application/json",
}));

app.use(express.json());

connectDB();

app.use(authRoutes);

app.use(apiKeyRoutes);

app.use(promptRoutes);

app.use(chatRoutes);

app.use(usageRoutes);

app.use(analyticsRoutes);

app.use(paymentRoutes);

app.use(healthRoutes);

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(
    `🚀 Server running on port ${PORT}`,
  ),
);
