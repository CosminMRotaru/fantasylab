import { Router } from "express";
import Player from "../models/Player.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { team, q, position, limit = 50 } = req.query;
    const filter = {};
    if (team) filter.team = Number(team);
    if (position) filter.position = Number(position);
    if (q) filter.webName = new RegExp(q, "i");

    const players = await Player.find(filter).limit(Number(limit)).lean();
    res.json(players);
  } catch (e) {
    next(e);
  }
});

export default router;
