function estimateTokens(text) {
  if (!text) return 0;

  const words = text.trim().split(/\s+/).length;

  return Math.ceil(words * 1.5);
}

module.exports = estimateTokens;