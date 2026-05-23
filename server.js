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

// ================== GLOBAL ERROR HANDLERS ==================
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// ================== CONFIG ==================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_BASE_URL || "https://api.groq.com/openai/v1",
});

const MODEL_PRICING = {
  "llama-3.1-8b-instant": {
    input: 0.05,
    output: 0.08,
  },
  "gpt-4o-mini": {
    input: 0.15,
    output: 0.60,
  },
};

const MAX_KEYS_PER_USER = 5;

// ================== HELPERS ==================
const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

const timingSafeKeyCompare = (rawKey, storedHash) => {
  const incomingHash = Buffer.from(hashKey(rawKey));
  const existingHash = Buffer.from(storedHash);
  if (incomingHash.length !== existingHash.length) return false;
  return crypto.timingSafeEqual(incomingHash, existingHash);
};

function calculateCost(model, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

function estimateTokens(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.5);
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

// DUMMY hash used for timing-safe login when user doesn't exist
const DUMMY_HASH = bcrypt.hashSync("dummy_password_for_timing_safety", 10);

// ================== LIMITERS ==================
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

const promptRunLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || "*",
};

app.use(globalLimiter);
app.use("/chat", aiLimiter);
app.use("/chat-stream", aiLimiter);
app.use("/prompts/:id/run", promptRunLimiter); // FIX #5

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

      try {
        const order = await Order.findOne({ razorpayOrderId: payment.order_id });
        if (!order || order.status === "PAID") return res.sendStatus(200);

        order.status = "PAID";
        order.razorpayPaymentId = payment.id;
        await order.save();

        await ApiKey.updateMany(
          { userId: order.userId },
          { $inc: { limit: 10000 } },
        );
      } catch (err) {
        console.error("Webhook DB error:", err);
        // Return 500 so Razorpay retries
        return res.status(500).send("Internal error");
      }
    }

    res.sendStatus(200);
  },
);

// ================== MIDDLEWARE ==================
app.use(cors(corsOptions));
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

  try {
    const apiKey = await ApiKey.findOne({ key: hashKey(key) });
    if (!apiKey) return res.status(403).json({ error: "Invalid API key" });
    if (apiKey.usage >= apiKey.limit)
      return res.status(403).json({ error: "Quota exceeded" });

    req.apiKey = apiKey;
    next();
  } catch (err) {
    console.error("apiKeyMiddleware error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
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
      lastUsed: { type: Date, default: null },
      active: { type: Boolean, default: true },
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

const PromptTemplate = mongoose.model(
  "PromptTemplate",
  new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,
      name: { type: String, required: true, maxlength: 100 },    
      description: { type: String, maxlength: 500 },              
      category: { type: String, maxlength: 50 },                  
      prompt: { type: String, required: true, maxlength: 10000 }, 
      variables: [String],
      tags: [String],
      isFavorite: { type: Boolean, default: false },
    },
    { timestamps: true },
  ),
);

// ================== AUTH ROUTES ==================
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !password || !emailRegex.test(email) || password.length < 6) {
      return res.status(400).json({ error: "Invalid email or weak password" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User exists" });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed });

    res.json({ message: "User created" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = await User.findOne({ email });

    const hashToCompare = user ? user.password : DUMMY_HASH;
    const ok = await bcrypt.compare(password, hashToCompare);

    if (!user || !ok) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================== API KEY ==================
app.post("/create-key", authMiddleware, async (req, res) => {
  try {
    const existingCount = await ApiKey.countDocuments({ userId: req.user.id });
    if (existingCount >= MAX_KEYS_PER_USER) {
      return res.status(400).json({
        error: `Maximum of ${MAX_KEYS_PER_USER} API keys allowed per account`,
      });
    }

    const rawKey = "sk_" + crypto.randomBytes(16).toString("hex");
    await ApiKey.create({ key: hashKey(rawKey), userId: req.user.id });
    res.json({ apiKey: rawKey });
  } catch (err) {
    console.error("Create key error:", err);
    res.status(500).json({ error: "Failed to create API key" });
  }
});

app.get("/my-keys", authMiddleware, async (req, res) => {
  try {
    const keys = await ApiKey.find(
      { userId: req.user.id },
      { key: 0 }, 
    );
    res.json(keys);
  } catch (err) {
    console.error("My keys error:", err);
    res.status(500).json({ error: "Failed to fetch keys" });
  }
});

// ================== PROMPTS ==================
app.post("/prompts", authMiddleware, async (req, res) => {
  try {
    const { name, prompt } = req.body;
    if (!name || !prompt) {
      return res.status(400).json({ error: "name and prompt are required" });
    }

    const template = await PromptTemplate.create({
      ...req.body,
      userId: req.user.id,
    });

    res.json(template);
  } catch (err) {
    console.error("Create prompt error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to create prompt" });
  }
});

app.get("/prompts", authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const prompts = await PromptTemplate.find({ userId: req.user.id })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json(prompts);
  } catch (err) {
    console.error("Get prompts error:", err);
    res.status(500).json({ error: "Failed to fetch prompts" });
  }
});

app.delete("/prompts/:id", authMiddleware, async (req, res) => {
  try {
    const result = await PromptTemplate.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    res.json({ message: "Prompt deleted" });
  } catch (err) {
    console.error("Delete prompt error:", err);
    res.status(500).json({ error: "Failed to delete prompt" });
  }
});

app.post("/prompts/:id/run", authMiddleware, async (req, res) => {
  try {
    const { variables } = req.body;

    const template = await PromptTemplate.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!template) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    let finalPrompt = template.prompt;

    for (const key in variables) {
      finalPrompt = finalPrompt.replaceAll(`{{${key}}}`, variables[key]);
    }

    const start = Date.now();

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: finalPrompt }],
    });

    const latency = Date.now() - start;
    const result = response.choices[0].message.content;

    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;
    const estimatedCost = calculateCost("llama-3.1-8b-instant", promptTokens, completionTokens);

    await Usage.create({
      userId: req.user.id,
      model: "llama-3.1-8b-instant",
      provider: "groq",
      endpoint: "/prompts/run",
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      latency,
    });

    res.json({ result });
  } catch (err) {
    console.error("Prompt run error:", err);
    res.status(500).json({ error: "Prompt run failed" });
  }
});

// ================== CHAT ==================
app.post("/chat", apiKeyMiddleware, async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: "message and userId are required" });
    }

    let chat = await Chat.findOne({ userId });
    let messages = chat ? trimMessages(chat.messages) : [];

    messages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({ role: "user", content: message });

    const start = Date.now();

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      // tools: [
      //   {
      //     type: "function",
      //     function: {
      //       name: "getTime",
      //       description: "Get the current server time",
      //       parameters: { type: "object", properties: {} },
      //     },
      //   },
      // ],
    });

    const latency = Date.now() - start;

    let reply;
    const choice = response.choices[0];

    if (choice.finish_reason === "tool_calls") {
      const toolCall = choice.message.tool_calls[0];
      let toolResult;

      if (toolCall.function.name === "getTime") {
        toolResult = new Date().toISOString();
      } else {
        toolResult = "Tool not implemented";
      }

      const followUp = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          ...messages,
          choice.message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          },
        ],
      });

      reply = followUp.choices[0].message.content;
    } else {
      reply = choice.message.content;
    }

    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;
    const estimatedCost = calculateCost("llama-3.1-8b-instant", promptTokens, completionTokens);

    messages.push({ role: "assistant", content: reply });

    if (chat) {
      chat.messages = messages;
      await chat.save();
    } else {
      await Chat.create({ userId, messages });
    }

    req.apiKey.usage += totalTokens;
    req.apiKey.lastUsed = new Date();
    await req.apiKey.save();

    await Usage.create({
      userId: req.apiKey.userId,
      model: "llama-3.1-8b-instant",
      provider: "groq",
      endpoint: "/chat",
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      latency,
    });

    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

// ================== STREAM ==================
app.post("/chat-stream", apiKeyMiddleware, async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: "message and userId are required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let chat = await Chat.findOne({ userId });
    let messages = chat ? trimMessages(chat.messages) : [];

    messages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({ role: "user", content: message });

    const start = Date.now();

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

    const latency = Date.now() - start;

    messages.push({ role: "assistant", content: fullReply });

    try {
      if (chat) {
        chat.messages = messages;
        await chat.save();
      } else {
        await Chat.create({ userId, messages });
      }

      const promptTokens = estimateTokens(message);
      const completionTokens = estimateTokens(fullReply);
      const tokensUsed = promptTokens + completionTokens;

      req.apiKey.usage += tokensUsed;
      req.apiKey.lastUsed = new Date(); 
      await req.apiKey.save();

      await Usage.create({
        userId: req.apiKey.userId,
        model: "llama-3.1-8b-instant",
        provider: "groq",
        endpoint: "/chat-stream",
        promptTokens,
        completionTokens,
        totalTokens: tokensUsed,
        estimatedCost: calculateCost("llama-3.1-8b-instant", promptTokens, completionTokens),
        latency, 
      });

      res.write(`event: done\n`);
      res.write(`data: {}\n\n`);
    } catch (dbErr) {
      console.error("Stream DB/usage error:", dbErr);
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: "Failed to save conversation" })}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error("Stream error:", err);
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`);
    res.end();
  }
});

// ================== HISTORY ==================
app.get("/history/:userId", authMiddleware, async (req, res) => {
  if (String(req.user.id) !== String(req.params.userId)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const chat = await Chat.findOne({ userId: req.params.userId });
    res.json({ messages: chat?.messages || [] });
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
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
  try {
    const data = await Usage.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          },
          totalTokens: { $sum: "$totalTokens" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);
    res.json(data);
  } catch (err) {
    console.error("Usage stats error:", err);
    res.status(500).json({ error: "Failed to fetch usage stats" });
  }
});

// ================== ANALYTICS ==================
app.get("/analytics/overview", authMiddleware, async (req, res) => {
  try {
    const stats = await Usage.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$estimatedCost" },
          requests: { $sum: 1 },
          avgLatency: { $avg: "$latency" },
        },
      },
    ]);

    res.json(stats[0] || {
      totalTokens: 0,
      totalCost: 0,
      requests: 0,
      avgLatency: 0,
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

app.get("/analytics/models", authMiddleware, async (req, res) => {
  try {
    const stats = await Usage.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: "$model",
          requests: { $sum: 1 },
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCost" },
        },
      },
    ]);

    res.json(stats);
  } catch (err) {
    console.error("Analytics models error:", err);
    res.status(500).json({ error: "Failed to fetch model analytics" });
  }
});

// ================== PAYMENT ==================
app.post("/create-order", authMiddleware, async (req, res) => {
  try {
    console.log("hit");
    
    const { amount } = req.body;

    if (!amount || typeof amount !== "number" || amount < 1 || !Number.isInteger(amount)) {
      return res.status(400).json({ error: "amount must be a positive integer (INR)" });
    }

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

    let razorOrder;
    try {
      razorOrder = await razorpay.orders.create({
        amount: amount * 100,
        currency: "INR",
      });
    } catch (razorErr) {
      console.error("Razorpay error:", razorErr);
      return res.status(502).json({ error: "Payment provider error" });
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
    console.error("Create order error:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ================== HEALTH ==================
app.get("/health", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  const dbOk = dbState === 1 || dbState === 2;
  const status = dbOk ? "OK" : "DEGRADED";
  res.status(dbOk ? 200 : 503).json({
    status,
    db: dbOk ? "connected" : "disconnected",
  });
});

app.get("/", (req, res) => res.send("lets go baby"));

// ================== START ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));