const PromptTemplate = require("../models/PromptTemplate");
const Usage = require("../models/Usage");

const client = require("../config/openai");

const calculateCost = require("../helpers/calculateCost");

const createPrompt = async (req, res) => {
  try {
    const { name, prompt } = req.body;

    if (!name || !prompt) {
      return res.status(400).json({
        error: "name and prompt are required",
      });
    }

    const template =
      await PromptTemplate.create({
        ...req.body,
        userId: req.user.id,
      });

    res.json(template);
  } catch (err) {
    console.error("Create prompt error:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: err.message,
      });
    }

    res.status(500).json({
      error: "Failed to create prompt",
    });
  }
};

const getPrompts = async (req, res) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page) || 1,
    );

    const limit = Math.min(
      100,
      parseInt(req.query.limit) || 20,
    );

    const skip = (page - 1) * limit;

    const prompts =
      await PromptTemplate.find({
        userId: req.user.id,
      })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    res.json(prompts);
  } catch (err) {
    console.error("Get prompts error:", err);

    res.status(500).json({
      error: "Failed to fetch prompts",
    });
  }
};

const deletePrompt = async (req, res) => {
  try {
    const result =
      await PromptTemplate.deleteOne({
        _id: req.params.id,
        userId: req.user.id,
      });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: "Prompt not found",
      });
    }

    res.json({
      message: "Prompt deleted",
    });
  } catch (err) {
    console.error("Delete prompt error:", err);

    res.status(500).json({
      error: "Failed to delete prompt",
    });
  }
};

const runPrompt = async (req, res) => {
  try {
    const { variables } = req.body;

    const template =
      await PromptTemplate.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

    if (!template) {
      return res.status(404).json({
        error: "Prompt not found",
      });
    }

    let finalPrompt = template.prompt;

    for (const key in variables) {
      finalPrompt = finalPrompt.replaceAll(
        `{{${key}}}`,
        variables[key],
      );
    }

    const start = Date.now();

    const response =
      await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: finalPrompt,
          },
        ],
      });

    const latency = Date.now() - start;

    const result =
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

    res.json({
      result,
    });
  } catch (err) {
    console.error("Prompt run error:", err);

    res.status(500).json({
      error: "Prompt run failed",
    });
  }
};

module.exports = {
  createPrompt,
  getPrompts,
  deletePrompt,
  runPrompt,
};