const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_BASE_URL || "https://api.groq.com/openai/v1",
});

module.exports = client;