const estimateTokens = require("./estimateTokens");

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

module.exports = trimMessages;