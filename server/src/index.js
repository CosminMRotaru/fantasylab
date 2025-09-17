import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import helmet from "helmet";

import fixturesRoutes from "./routes/fixtures.js";
import teamsRoutes from "./routes/teams.js";
import playersRoutes from "./routes/players.js";
import importRoutes from "./routes/import.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
if (process.env.NODE_ENV === "production") {
  const tooShort =
    !process.env.JWT_SECRET || String(process.env.JWT_SECRET).length < 24;
  const isDefault = JWT_SECRET === "dev_secret_change_me";
  if (tooShort || isDefault) {
    process.exit(1);
  }
}

const frontendOrigin = (process.env.CORS_ORIGIN || "").replace(/\/+$/, "");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"].concat(frontendOrigin ? [frontendOrigin] : []),
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: frontendOrigin || undefined, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/fixtures", fixturesRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/players", playersRoutes);
app.use("/api/import", importRoutes);
app.use("/api/auth", authRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({ ok: false, message: err.message });
});
(async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fantasylab";

    mongoose.set("strictQuery", false);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

    const { host, name } = mongoose.connection;

    app.listen(PORT, () => {});
  } catch (err) {
    process.exit(1);
  }
})();
