// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const crypto = require("crypto");
// const rateLimit = require("express-rate-limit");
// require("dotenv").config();
// const Razorpay = require("razorpay");
// const OpenAI = require("openai");

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// const client = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   baseURL: "https://api.groq.com/openai/v1",
// });

// const app = express();

// function estimateTokens(text) {
//   const words = text.trim().split(/\s+/).length;
//   return Math.ceil(words * 1.3);
// }

// const globalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 min
//   max: 100,
//   message: {
//     error: "Too many requests, try again later",
//   },
// });

// const aiLimiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 10,
// });

// //webhook
// app.post(
//   "/webhook",
//   express.raw({ type: "application/json" }),
//   async (req, res) => {
//     try {
//       console.log("🔥 WEBHOOK HIT");

//       const signature = req.headers["x-razorpay-signature"];

//       const expected = crypto
//         .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
//         .update(req.body)
//         .digest("hex");

//       if (signature !== expected) {
//         console.log("❌ SIGNATURE FAILED");
//         return res.status(400).send("Invalid signature");
//       }

//       console.log("✅ VERIFIED");

//       const event = JSON.parse(req.body);

//       if (event.event === "payment.captured") {
//         console.log("💰 PAYMENT CAPTURED");

//         const payment = event.payload.payment.entity;

//         const order = await Order.findOne({
//           razorpayOrderId: payment.order_id,
//         });

//         // safety
//         if (!order) {
//           console.log("❌ ORDER NOT FOUND");
//           return res.sendStatus(200);
//         }

//         // prevent duplicate
//         if (order.status === "PAID") {
//           console.log("⚠️ Already processed");
//           return res.sendStatus(200);
//         }

//         // update order
//         order.status = "PAID";
//         order.razorpayPaymentId = payment.id;
//         await order.save();

//         console.log("✅ ORDER UPDATED");

//         // 🚀 MAIN LOGIC (IMPORTANT)
//         // 👉 Increase API limits instead of products

//         await ApiKey.updateMany(
//           { userId: order.userId },
//           { $inc: { limit: 10000 } } // tokens add
//         );

//         console.log("🚀 API LIMIT INCREASED");

//       }

//       res.sendStatus(200);

//     } catch (err) {
//       console.error(err);
//       res.sendStatus(500);
//     }
//   }
// );

// app.use("/chat", aiLimiter);
// app.use("/chat-stream", aiLimiter);

// app.use(globalLimiter);

// //entities
// // USER SCHEMA
// const userSchema = new mongoose.Schema(
//   {
//     email: { type: String, unique: true },
//     password: String,
//   },
//   { timestamps: true }
// );

// const User = mongoose.model("User", userSchema);

// // API KEY SCHEMA
// const apiKeySchema = new mongoose.Schema(
//   {
//     key: { type: String, unique: true },
//     usage: { type: Number, default: 0 },
//     limit: { type: Number, default: 5000 },
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   },
//   { timestamps: true }
// );

// const ApiKey = mongoose.model("ApiKey", apiKeySchema);

// const chatSchema = new mongoose.Schema(
//   {
//     userId: String,
//     messages: [
//       {
//         role: String,
//         content: String,
//       },
//     ],
//   },
//   { timestamps: true }
// );

// const Chat = mongoose.model("Chat", chatSchema);

// const usageSchema = new mongoose.Schema(
//   {
//     userId: mongoose.Schema.Types.ObjectId,
//     tokens: Number,
//   },
//   { timestamps: true }
// );

// const Usage = mongoose.model("Usage", usageSchema);

// const orderSchema = new mongoose.Schema(
//   {
//     userId: mongoose.Schema.Types.ObjectId,
//     razorpayOrderId: String,
//     razorpayPaymentId: String,
//     amount: Number,
//     status: { type: String, default: "PENDING" },
//   },
//   { timestamps: true }
// );

// const Order = mongoose.model("Order", orderSchema);

// // Middleware
// app.use(cors());
// app.use(express.json());

// app.set("trust proxy", 1);

// const authMiddleware = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) return res.status(401).json({ error: "No token" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch {
//     res.status(401).json({ error: "Invalid token" });
//   }
// };

// const apiKeyMiddleware = async (req, res, next) => {
//   const key = req.headers["x-api-key"];

//   if (!key) return res.status(401).json({ error: "API key missing" });

//   const apiKey = await ApiKey.findOne({ key });

//   if (!apiKey) return res.status(403).json({ error: "Invalid API key" });

//   if (apiKey.usage >= apiKey.limit) {
//     return res.status(403).json({ error: "Quota exceeded" });
//   }

//   req.apiKey = apiKey;
//   next();
// };

// // MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ MongoDB Connected"))
//   .catch((err) => console.error("❌ DB Error:", err));

// //routes
// app.post("/signup", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // basic validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//     if (!emailRegex.test(email) || password.length < 6) {
//     return res.status(400).json({ error: "Invalid email or weak password" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//     return res.status(400).json({ error: "User already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       email,
//       password: hashedPassword,
//     });

//     res.json({ message: "User created" });
//   } catch (err) {
//     res.status(500).json({ error: "Signup failed", err });
//   }
// });

// app.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ error: "User not found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ error: "Wrong password" });

//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });

//     res.json({ token });
//   } catch (err) {
//     res.status(500).json({ error: "Login failed" });
//   }
// });

// //API routes

// app.post("/create-key", authMiddleware, async (req, res) => {
//   try {
//     const key = "sk_" + crypto.randomBytes(16).toString("hex");

//     const apiKey = await ApiKey.create({
//       key,
//       userId: req.user.id,
//     });

//     res.json({ apiKey: apiKey.key });
//   } catch {
//     res.status(500).json({ error: "Failed to create key" });
//   }
// });

// app.get("/protected", apiKeyMiddleware, (req, res) => {
//   res.json({ message: "Access granted" });
// });

// //chat routes

// app.post("/chat", apiKeyMiddleware, async (req, res) => {
//   try {
//     const { message, userId } = req.body;

//     if (!message) {
//       return res.status(400).json({ error: "Message required" });
//     }

//     // 1. Get previous chat (optional but powerful)
//     let chat = await Chat.findOne({ userId });

//     let messages = [];

//     if (chat) {
//       messages = chat ? chat.messages.slice(-10) : [];
//     }

//     // Add new user message
//     messages.push({ role: "user", content: message });

//     // 2. Call Groq (AI)
//     const response = await client.chat.completions.create({
//       model: "llama-3.1-8b-instant", // fast + free
//       messages,
//     });

//     const reply = response.choices[0].message.content;

//     // 3. Save assistant reply
//     messages.push({ role: "assistant", content: reply });

//     // 4. Save in DB
//     if (chat) {
//       chat.messages = messages;
//       await chat.save();
//     } else {
//       await Chat.create({
//         userId,
//         messages,
//       });
//     }

//     const tokensUsed =
// estimateTokens(message) + estimateTokens(reply);

//     // update usage
//     req.apiKey.usage += tokensUsed;
//     await req.apiKey.save();

//     await Usage.create({
//         userId: req.apiKey.userId,
//         tokens: tokensUsed,
//     });

//     // 5. Return response
//     res.json({ reply });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Chat failed" });
//   }
// });

// app.post("/chat-stream", apiKeyMiddleware, async (req, res) => {
//   try {
//     const { message, userId } = req.body;

//     if (!userId) {
//         return res.status(400).json({ error: "userId required" });
//     }

//     if (!message) {
//       return res.status(400).json({ error: "Message required" });
//     }

//     // 🔥 SSE HEADERS
//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");
//     res.flushHeaders();

//     // Get chat history
//     let chat = await Chat.findOne({ userId });
//     let messages = chat ? chat.messages : [];

//     messages.push({ role: "user", content: message });

//     // 🔥 STREAM FROM GROQ
//     const stream = await client.chat.completions.create({
//       model: "llama3-8b-8192",
//       messages,
//       stream: true,
//     });

//     let fullReply = "";

//     for await (const chunk of stream) {
//       const content = chunk.choices[0]?.delta?.content;

//       if (content) {
//         fullReply += content;

//         // send chunk to client
//         res.write(`data: ${content}\n\n`);
//       }
//     }

//     // DONE signal
//     res.write(`data: [DONE]\n\n`);
//     res.end();

//     // Save assistant reply
//     messages.push({ role: "assistant", content: fullReply });

//     if (chat) {
//       chat.messages = messages;
//       await chat.save();
//     } else {
//       await Chat.create({
//         userId,
//         messages,
//       });
//     }

//     const tokensUsed =
//     estimateTokens(message) + estimateTokens(fullReply);

//     req.apiKey.usage += tokensUsed;
//     await req.apiKey.save();

//     await Usage.create({
//         userId: req.apiKey.userId,
//         tokens: tokensUsed,
//     });

//   } catch (err) {
//     console.error(err);
//     res.write(`data: ERROR\n\n`);
//     res.end();
//   }
// });

// //features routes

// app.get("/usage", apiKeyMiddleware, async (req, res) => {
//   try {
//     const apiKey = req.apiKey;

//     res.json({
//       used: apiKey.usage,
//       limit: apiKey.limit,
//       remaining: apiKey.limit - apiKey.usage,
//     });

//   } catch {
//     res.status(500).json({ error: "Failed to fetch usage" });
//   }
// });

// app.get("/history/:userId", authMiddleware, async (req, res) => {
//   try {
//     if (req.user.id !== req.params.userId) {
//         return res.status(403).json({ error: "Unauthorized" });
//     }
//     const chat = await Chat.findOne({ userId: req.params.userId });

//     if (!chat) {
//       return res.json({ messages: [] });
//     }

//     res.json({ messages: chat.messages });

//   } catch {
//     res.status(500).json({ error: "Failed to fetch history" });
//   }
// });

// //dashboard
// app.get("/my-keys", authMiddleware, async (req, res) => {
//   try {
//     const keys = await ApiKey.find({ userId: req.user.id });

//     res.json(keys);
//   } catch {
//     res.status(500).json({ error: "Failed to fetch keys" });
//   }
// });

// app.get("/usage-stats", authMiddleware, async (req, res) => {
//   try {
//     const data = await Usage.aggregate([
//       {
//         $match: { userId: new mongoose.Types.ObjectId(req.user.id) },
//       },
//       {
//         $group: {
//           _id: {
//             day: { $dayOfMonth: "$createdAt" },
//             month: { $month: "$createdAt" },
//           },
//           totalTokens: { $sum: "$tokens" },
//         },
//       },
//       { $sort: { "_id.month": 1, "_id.day": 1 } },
//     ]);

//     res.json(data);
//   } catch {
//     res.status(500).json({ error: "Failed to fetch stats" });
//   }
// });

// //purchase

// app.post("/create-order", authMiddleware, async (req, res) => {
//   try {
//     const { amount } = req.body; // ₹

//     const razorOrder = await razorpay.orders.create({
//       amount: amount * 100,
//       currency: "INR",
//     });

//     await Order.create({
//       userId: req.user.id,
//       razorpayOrderId: razorOrder.id,
//       amount,
//     });

//     res.json({
//       orderId: razorOrder.id,
//       amount: amount * 100,
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Order creation failed" });
//   }
// });

// // Health Route
// app.get("/health", (req, res) => {
//   res.json({ status: "OK" });
// });

// // Global Error Handler
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: "Something went wrong" });
// });

// app.get("/", (req, res) => {
//   res.send("lets go baby");
// })

// // Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

// ================== FULL PRODUCTION-LEVEL UPDATED SERVER ==================
// Improvements included: token accuracy, API key hashing, SSE events, context trim,
// function calling, versioning, better structure, minor safety improvements
// ================== FINAL MERGED VERSION (ALL ORIGINAL + ALL IMPROVEMENTS) ==================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const Razorpay = require("razorpay");
const OpenAI = require("openai");

const app = express();

// ================== CONFIG ==================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_BASE_URL || "https://api.groq.com/openai/v1",
});

// ================== HELPERS ==================
const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

function estimateTokens(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

const trimMessages = (messages, maxTokens = 3000) => {
  let total = 0;
  const trimmed = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokens = estimateTokens(msg.content);
    if (total + tokens > maxTokens) break;
    trimmed.unshift(msg);
    total += tokens;
  }
  return trimmed;
};

// ================== LIMITERS ==================
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

app.use(globalLimiter);
app.use("/chat", aiLimiter);
app.use("/chat-stream", aiLimiter);

// ================== WEBHOOK ==================
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    if (signature !== expected)
      return res.status(400).send("Invalid signature");

    const event = JSON.parse(req.body);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const order = await Order.findOne({ razorpayOrderId: payment.order_id });
      if (!order || order.status === "PAID") return res.sendStatus(200);

      order.status = "PAID";
      order.razorpayPaymentId = payment.id;
      await order.save();

      await ApiKey.updateMany(
        { userId: order.userId },
        { $inc: { limit: 10000 } },
      );
    }

    res.sendStatus(200);
  },
);

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());
app.set("trust proxy", 1);

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const apiKeyMiddleware = async (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (!key) return res.status(401).json({ error: "API key missing" });

  const apiKey = await ApiKey.findOne({ key: hashKey(key) });
  if (!apiKey) return res.status(403).json({ error: "Invalid API key" });
  if (apiKey.usage >= apiKey.limit)
    return res.status(403).json({ error: "Quota exceeded" });

  req.apiKey = apiKey;
  next();
};

// ================== DB ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

// ================== SCHEMAS ==================
const User = mongoose.model(
  "User",
  new mongoose.Schema(
    { email: { type: String, unique: true }, password: String },
    { timestamps: true },
  ),
);

const ApiKey = mongoose.model(
  "ApiKey",
  new mongoose.Schema(
    {
      key: { type: String, unique: true },
      usage: { type: Number, default: 0 },
      limit: { type: Number, default: 5000 },
      userId: mongoose.Schema.Types.ObjectId,
    },
    { timestamps: true },
  ),
);

const Chat = mongoose.model(
  "Chat",
  new mongoose.Schema(
    { userId: String, messages: [{ role: String, content: String }] },
    { timestamps: true },
  ),
);

const Usage = mongoose.model(
  "Usage",
  new mongoose.Schema(
    { userId: mongoose.Schema.Types.ObjectId, tokens: Number },
    { timestamps: true },
  ),
);

const Order = mongoose.model(
  "Order",
  new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,
      razorpayOrderId: String,
      razorpayPaymentId: String,
      amount: Number,
      status: { type: String, default: "PENDING" },
    },
    { timestamps: true },
  ),
);

// ================== AUTH ROUTES ==================
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email) || password.length < 6) {
    return res.status(400).json({ error: "Invalid email or weak password" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ error: "User exists" });

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashed });

  res.json({ message: "User created" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token });
});

// ================== API KEY ==================
app.post("/create-key", authMiddleware, async (req, res) => {
  const rawKey = "sk_" + crypto.randomBytes(16).toString("hex");
  await ApiKey.create({ key: hashKey(rawKey), userId: req.user.id });
  res.json({ apiKey: rawKey });
});

app.get("/my-keys", authMiddleware, async (req, res) => {
  const keys = await ApiKey.find({ userId: req.user.id });
  res.json(keys);
});

// ================== CHAT ==================
app.post("/chat", apiKeyMiddleware, async (req, res) => {
  const { message, userId } = req.body;

  let chat = await Chat.findOne({ userId });
  // let messages = chat ? trimMessages(chat.messages) : [];
  let messages = chat ? trimMessages(chat.messages) : [];

  messages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  messages.push({ role: "user", content: message });

  const response = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    tools: [
      {
        type: "function",
        function: {
          name: "getTime",
          description: "Get time",
          parameters: { type: "object", properties: {} },
        },
      },
    ],
  });

  const reply = response.choices[0].message.content;
  const tokensUsed = response.usage?.total_tokens || 0;

  messages.push({ role: "assistant", content: reply });

  if (chat) {
    chat.messages = messages;
    await chat.save();
  } else await Chat.create({ userId, messages });

  req.apiKey.usage += tokensUsed;
  await req.apiKey.save();

  await Usage.create({ userId: req.apiKey.userId, tokens: tokensUsed });

  res.json({ reply });
});

// ================== STREAM ==================
app.post("/chat-stream", apiKeyMiddleware, async (req, res) => {
  const { message, userId } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let chat = await Chat.findOne({ userId });
  // let messages = chat ? trimMessages(chat.messages) : [];
  let messages = chat ? trimMessages(chat.messages) : [];

  messages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  messages.push({ role: "user", content: message });

  const stream = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    stream: true,
  });

  let fullReply = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullReply += content;
      res.write(`event: message\n`);
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`event: done\n`);
  res.write(`data: {}\n\n`);
  res.end();

  messages.push({ role: "assistant", content: fullReply });

  if (chat) {
    chat.messages = messages;
    await chat.save();
  } else await Chat.create({ userId, messages });

  const tokensUsed = estimateTokens(message) + estimateTokens(fullReply);

  req.apiKey.usage += tokensUsed;
  await req.apiKey.save();

  await Usage.create({ userId: req.apiKey.userId, tokens: tokensUsed });
});

// ================== HISTORY ==================
app.get("/history/:userId", authMiddleware, async (req, res) => {
  if (req.user.id !== req.params.userId)
    return res.status(403).json({ error: "Unauthorized" });

  const chat = await Chat.findOne({ userId: req.params.userId });
  res.json({ messages: chat?.messages || [] });
});

// ================== USAGE ==================
app.get("/usage", apiKeyMiddleware, (req, res) => {
  res.json({
    used: req.apiKey.usage,
    limit: req.apiKey.limit,
    remaining: req.apiKey.limit - req.apiKey.usage,
  });
});

app.get("/usage-stats", authMiddleware, async (req, res) => {
  const data = await Usage.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        totalTokens: { $sum: "$tokens" },
      },
    },
    { $sort: { "_id.month": 1, "_id.day": 1 } },
  ]);
  res.json(data);
});

// ================== PAYMENT ==================
app.post("/create-order", authMiddleware, async (req, res) => {
  const { amount } = req.body;

  const existingOrder = await Order.findOne({
    userId: req.user.id,
    status: "PENDING",
  });

  if (existingOrder) {
    return res.json({
      orderId: existingOrder.razorpayOrderId,
      amount: existingOrder.amount * 100,
    });
  }

  const razorOrder = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
  });

  await Order.create({
    userId: req.user.id,
    razorpayOrderId: razorOrder.id,
    amount,
  });

  res.json({
    orderId: razorOrder.id,
    amount: amount * 100,
  });
});

// ================== HEALTH ==================
app.get("/health", (req, res) => res.json({ status: "OK" }));

app.get("/", (req, res) => res.send("lets go baby"));

// ================== START ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
