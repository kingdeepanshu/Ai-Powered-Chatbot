const crypto = require("crypto");

const hashKey = (key) =>
  crypto.createHash("sha256").update(key).digest("hex");

module.exports = hashKey;