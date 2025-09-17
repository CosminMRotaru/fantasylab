import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
if (process.env.NODE_ENV === "production") {
  const tooShort =
    !process.env.JWT_SECRET || String(process.env.JWT_SECRET).length < 24;
  const isDefault = JWT_SECRET === "dev_secret_change_me";
  if (tooShort || isDefault) {
    throw new Error("[FATAL] Weak/default JWT secret – set JWT_SECRET env");
  }
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 60;
const rateStore = new Map();

function rateLimit(keyBase) {
  return function (req, res, next) {
    try {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.socket.remoteAddress ||
        "unknown";
      const key = `${keyBase}:${ip}`;
      const now = Date.now();
      let entry = rateStore.get(key);
      if (!entry || now > entry.expires) {
        entry = { count: 0, expires: now + RATE_LIMIT_WINDOW_MS };
      }
      entry.count += 1;
      rateStore.set(key, entry);
      if (entry.count > RATE_LIMIT_MAX) {
        const retrySec = Math.ceil((entry.expires - now) / 1000);
        return res.status(429).json({
          ok: false,
          message: `Too many attempts. Retry in ${retrySec}s`,
        });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

function signToken(user) {
  return jwt.sign(
    { uid: user._id, email: user.email, username: user.username },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

router.post("/register", rateLimit("auth:register"), async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password || !username)
      return res
        .status(400)
        .json({ ok: false, message: "Username, email and password required" });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res
        .status(400)
        .json({ ok: false, message: "Email or username already used" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, username, passwordHash });
    const token = signToken(user);
    res.json({
      ok: true,
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/login", rateLimit("auth:login"), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res
        .status(401)
        .json({ ok: false, message: "Invalid credentials" });
    const token = signToken(user);
    res.json({
      ok: true,
      token,
      user: { email: user.email, username: user.username },
    });
  } catch (e) {
    next(e);
  }
});

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ ok: false, message: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

router.get("/state", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.uid).lean();
    res.json({ ok: true, state: user?.state || {} });
  } catch (e) {
    next(e);
  }
});

router.post("/state", auth, async (req, res, next) => {
  try {
    const { state } = req.body;
    const user = await User.findById(req.user.uid);
    if (!user)
      return res.status(404).json({ ok: false, message: "User not found" });
    user.state = state || {};
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
