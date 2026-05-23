const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const DUMMY_HASH = bcrypt.hashSync(
  "dummy_password_for_timing_safety",
  10,
);

const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !email ||
      !password ||
      !emailRegex.test(email) ||
      password.length < 6
    ) {
      return res.status(400).json({
        error: "Invalid email or weak password",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User exists",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashed,
    });

    res.json({
      message: "User created",
    });
  } catch (err) {
    console.error("Signup error:", err);

    res.status(500).json({
      error: "Signup failed",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    const user = await User.findOne({
      email,
    });

    const hashToCompare = user
      ? user.password
      : DUMMY_HASH;

    const ok = await bcrypt.compare(
      password,
      hashToCompare,
    );

    if (!user || !ok) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({
      token,
    });
  } catch (err) {
    console.error("Login error:", err);

    res.status(500).json({
      error: "Login failed",
    });
  }
};

module.exports = {
  signup,
  login,
};