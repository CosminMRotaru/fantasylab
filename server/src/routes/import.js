import { Router } from "express";
import fetch from "node-fetch";
import Player from "../models/Player.js";

const router = Router();

router.get("/entry/:id", async (req, res) => {
  const entryId = String(req.params.id).trim();
  try {
    const bs = await (
      await fetch("https://fantasy.premierleague.com/api/bootstrap-static/")
    ).json();
    const currentGw =
      bs?.events?.find?.((e) => e.is_current) ||
      bs?.events?.find?.((e) => !e.finished && !e.data_checked);
    const gw = Number(req.query.gw || currentGw?.id || 1);

    const url = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gw}/picks/`;
    const r = await fetch(url, { headers: { "User-Agent": "fantasylab" } });

    if (r.status === 401 || r.status === 403) {
      return res.status(200).json({
        ok: false,
        requiresAuth: true,
        message:
          "FPL requires authentication to access picks. Use the manual builder or import when data is public.",
      });
    }
    if (!r.ok) {
      return res
        .status(200)
        .json({ ok: false, message: `FPL responded ${r.status}` });
    }

    const data = await r.json();
    const picksIds = (data?.picks || []).map((p) => p.element);

    const players = await Player.find({ fplId: { $in: picksIds } }).lean();

    return res.json({
      ok: true,
      entryId,
      gw,
      picks: players.map((p) => ({
        fplId: p.fplId,
        webName: p.webName,
        team: p.team,
        position: p.position,
        nowCost: p.nowCost,
      })),
    });
  } catch (e) {
    return res
      .status(200)
      .json({ ok: false, message: "Unexpected error contacting FPL." });
  }
});

export default router;
