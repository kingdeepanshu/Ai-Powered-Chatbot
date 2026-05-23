const mongoose = require("mongoose");

const Chat = require("../models/Chat");
const Usage = require("../models/Usage");

const client = require("../config/openai");

const trimMessages = require("../helpers/trimMessages");
const estimateTokens = require("../helpers/estimateTokens");
const calculateCost = require("../helpers/calculateCost");

const chat = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({
        error: "message and userId are required",
      });
    }

    let chat = await Chat.findOne({
      userId,
    });

    let messages = chat
      ? trimMessages(chat.messages)
      : [];

    messages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: "user",
      content: message,
    });

    const start = Date.now();

    const response =
      await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
      });

    const latency = Date.now() - start;

    const reply =
      response.choices[0].message.content;

    const promptTokens =
      response.usage?.prompt_tokens || 0;

    const completionTokens =
      response.usage?.completion_tokens || 0;

    const totalTokens =
      response.usage?.total_tokens || 0;

    const estimatedCost = calculateCost(
      "llama-3.1-8b-instant",
      promptTokens,
      completionTokens,
    );

    messages.push({
      role: "assistant",
      content: reply,
    });

    if (chat) {
      chat.messages = messages;

      await chat.save();
    } else {
      await Chat.create({
        userId,
        messages,
      });
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

    res.json({
      reply,
    });
  } catch (err) {
    console.error("Chat error:", err);

    res.status(500).json({
      error: "Chat failed",
    });
  }
};

const streamChat = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({
        error: "message and userId are required",
      });
    }

    res.setHeader(
      "Content-Type",
      "text/event-stream",
    );

    res.setHeader(
      "Cache-Control",
      "no-cache",
    );

    res.setHeader(
      "Connection",
      "keep-alive",
    );

    res.flushHeaders();

    let chat = await Chat.findOne({
      userId,
    });

    let messages = chat
      ? trimMessages(chat.messages)
      : [];

    messages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: "user",
      content: message,
    });

    const start = Date.now();

    const stream =
      await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        stream: true,
      });

    let fullReply = "";

    for await (const chunk of stream) {
      const content =
        chunk.choices[0]?.delta?.content;

      if (content) {
        fullReply += content;

        res.write(`event: message\n`);

        res.write(
          `data: ${JSON.stringify({
            content,
          })}\n\n`,
        );
      }
    }

    const latency = Date.now() - start;

    messages.push({
      role: "assistant",
      content: fullReply,
    });

    try {
      if (chat) {
        chat.messages = messages;

        await chat.save();
      } else {
        await Chat.create({
          userId,
          messages,
        });
      }

      const promptTokens =
        estimateTokens(message);

      const completionTokens =
        estimateTokens(fullReply);

      const tokensUsed =
        promptTokens + completionTokens;

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

        estimatedCost: calculateCost(
          "llama-3.1-8b-instant",
          promptTokens,
          completionTokens,
        ),

        latency,
      });

      res.write(`event: done\n`);

      res.write(`data: {}\n\n`);
    } catch (dbErr) {
      console.error(
        "Stream DB/usage error:",
        dbErr,
      );

      res.write(`event: error\n`);

      res.write(
        `data: ${JSON.stringify({
          error: "Failed to save conversation",
        })}\n\n`,
      );
    }

    res.end();
  } catch (err) {
    console.error("Stream error:", err);

    res.write(`event: error\n`);

    res.write(
      `data: ${JSON.stringify({
        error: "Streaming failed",
      })}\n\n`,
    );

    res.end();
  }
};

const getHistory = async (req, res) => {
  if (
    String(req.user.id) !==
    String(req.params.userId)
  ) {
    return res.status(403).json({
      error: "Unauthorized",
    });
  }

  try {
    const chat = await Chat.findOne({
      userId: req.params.userId,
    });

    res.json({
      messages: chat?.messages || [],
    });
  } catch (err) {
    console.error("History error:", err);

    res.status(500).json({
      error: "Failed to fetch history",
    });
  }
};

module.exports = {
  chat,
  streamChat,
  getHistory,
};