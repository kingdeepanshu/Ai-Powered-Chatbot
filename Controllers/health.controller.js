const mongoose = require("mongoose");

const healthCheck = async (req, res) => {
  const dbState =
    mongoose.connection.readyState;

  const dbOk =
    dbState === 1 || dbState === 2;

  const status = dbOk
    ? "OK"
    : "DEGRADED";

  res.status(dbOk ? 200 : 503).json({
    status,

    db: dbOk
      ? "connected"
      : "disconnected",
  });
};

const home = (req, res) => {
  res.send("lets go baby");
};

module.exports = {
  healthCheck,
  home,
};