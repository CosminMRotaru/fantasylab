import { Router } from "express";
import Fixture from "../models/Fixture.js";
import Gameweek from "../models/Gameweek.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { gw } = req.query;
    const filter = gw ? { event: Number(gw) } : {};
    const fixtures = await Fixture.find(filter).sort({ kickoffTime: 1 }).lean();
    res.json(fixtures);
  } catch (e) {
    next(e);
  }
});

router.get("/deadlines", async (_req, res, next) => {
  try {
    const gws = await Gameweek.find({ finished: { $ne: true } })
      .sort({ id: 1 })
      .lean();
    res.json(gws);
  } catch (e) {
    next(e);
  }
});

export default router;
