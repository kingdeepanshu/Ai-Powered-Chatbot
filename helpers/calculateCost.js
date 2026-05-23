const MODEL_PRICING = require("../config/pricing");

function calculateCost(model, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING[model];

  if (!pricing) return 0;

  const inputCost =
    (promptTokens / 1_000_000) * pricing.input;

  const outputCost =
    (completionTokens / 1_000_000) * pricing.output;

  return Number((inputCost + outputCost).toFixed(6));
}

module.exports = calculateCost;