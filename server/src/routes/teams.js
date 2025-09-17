import express from "express";
import Team from "../models/Team.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const teams = await Team.find({})
      .select(
        "fplId name shortName strength strengthOverallHome strengthOverallAway"
      )
      .sort({ shortName: 1 })
      .lean();

    res.json(Array.isArray(teams) ? teams : []);
  } catch (err) {
    next(err);
  }
});

export default router;
