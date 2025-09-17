import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/Card.jsx";
import { useDropdownState } from "../hooks/useDropdownState.js";
import {
  computeDifficultyFromRatings,
  makeNineBinColorMapper,
} from "../lib/fdr.js";
import {
  loadFixturesSettings,
  saveFixturesSettings,
  resetFixturesSettings,
  loadRatingsPresets,
  saveRatingsPresets,
  loadActiveRatingsPresetId,
  saveActiveRatingsPresetId,
} from "../lib/storage.js";
import { useDeadlines } from "../hooks/useDeadlines.js";
import { getJson } from "../api/http.js";
import RatingsPresetSelector from "../components/RatingsPresetSelector.jsx";
import { deriveDefaultRatingsFull } from "../lib/ratingsDefaults.js";
import FixturesMatrixRow from "../components/FixturesMatrixRow.jsx";
import { getUser } from "../lib/auth.js";
import { LS_KEYS } from "../constants/storageKeys.js";

function useMatrixSizes() {
  const calc = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    if (w < 400)
      return {
        TEAM_COL_PX: 60,
        ATK_COL_PX: 60,
        DEF_COL_PX: 60,
        AVG_COL_PX: 40,
        AVGATK_COL_PX: 50,
        AVGDEF_COL_PX: 50,
        cellMin: 50,
        STAR_PX: 9,
      };
    if (w < 520)
      return {
        TEAM_COL_PX: 80,
        ATK_COL_PX: 60,
        DEF_COL_PX: 60,
        AVG_COL_PX: 40,
        AVGATK_COL_PX: 50,
        AVGDEF_COL_PX: 50,
        cellMin: 56,
        STAR_PX: 9.5,
      };
    if (w < 768)
      return {
        TEAM_COL_PX: 90,
        ATK_COL_PX: 60,
        DEF_COL_PX: 60,
        AVG_COL_PX: 40,
        AVGATK_COL_PX: 50,
        AVGDEF_COL_PX: 50,
        cellMin: 64,
        STAR_PX: 10,
      };
    return {
      TEAM_COL_PX: 100,
      ATK_COL_PX: 60,
      DEF_COL_PX: 60,
      AVG_COL_PX: 40,
      AVGATK_COL_PX: 50,
      AVGDEF_COL_PX: 50,
      cellMin: 72,
      STAR_PX: 10.5,
    };
  };
  const [s, setS] = useState(calc);
  useEffect(() => {
    const onR = () => setS(calc());
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return s;
}
export default function Fixtures() {
  const user = getUser();
  const userId = user?.username;
  const init = loadFixturesSettings(userId);
  const [fromGw, setFromGw] = useState(init.fromGw);
  const [count, setCount] = useState(init.count);
  const [sortBy, setSortBy] = useState(init.sortBy);
  const [sortDir, setSortDir] = useState(init.sortDir);
  const [teams, setTeams] = useState([]);
  const [homeW, setHomeW] = useState(init.homeW ?? 1);
  const [awayW, setAwayW] = useState(init.awayW ?? 1);
  const [oppW, setOppW] = useState(init.oppW ?? 1);

  useEffect(() => {
    saveFixturesSettings(
      {
        fromGw,
        count,
        sortBy,
        sortDir,
        homeW,
        awayW,
        oppW,
      },
      userId
    );
  }, [fromGw, count, sortBy, sortDir, homeW, awayW, oppW, userId]);

  const { deadlines, loading: deadlinesLoading } = useDeadlines();
  const [fixturesByGw, setFixturesByGw] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getJson("/teams");
      if (alive && Array.isArray(data)) setTeams(data);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!deadlines.length) return;
    let upcoming = deadlines[0]?.id || 1;
    const now = Date.now();
    const byTime = deadlines.find((g) => {
      const t = new Date(
        g.deadlineTime || g.deadline || g.kickoffTime || Date.now()
      ).getTime();
      return t > now - 30000;
    });
    if (byTime && byTime.id) upcoming = byTime.id;

    const settings = loadFixturesSettings(userId);
    if (!settings) {
      setFromGw(upcoming);
      setCount((c) => (c !== 6 ? 6 : c));
    } else {
      try {
        if (typeof settings.fromGw === "number" && settings.fromGw < upcoming) {
          setFromGw(upcoming);
        }
      } catch {}
    }
  }, [deadlines, userId]);

  const gwList = useMemo(() => {
    const start = fromGw;
    return Array.from({ length: Math.max(0, count) }, (_, i) => start + i);
  }, [fromGw, count]);

  useEffect(() => {
    let alive = true;
    if (!gwList.length) return;
    (async () => {
      const list = await Promise.all(
        gwList.map((gw) => getJson(`/fixtures?gw=${gw}`))
      );
      if (!alive) return;
      const map = {};
      gwList.forEach((gw, idx) => (map[gw] = list[idx] || []));
      setFixturesByGw(map);
    })();
    return () => {
      alive = false;
    };
  }, [gwList]);

  const [ratingsPresets, setRatingsPresets] = useState(() =>
    loadRatingsPresets(userId)
  );
  const [activePresetId, setActivePresetId] = useState(
    () => loadActiveRatingsPresetId(userId) || "default"
  );
  const [ratingsMap, setRatingsMap] = useState({});

  useEffect(() => {
    function refresh() {
      const id = loadActiveRatingsPresetId(userId) || "default";
      setActivePresetId(id);
      if (id === "default") {
        const base = deriveDefaultRatingsFull(teams);
        setRatingsMap(base);
      } else {
        const p = (loadRatingsPresets(userId) || []).find((x) => x.id === id);
        setRatingsMap(p?.teamRatings || {});
      }
    }
    refresh();
    window.addEventListener("ratings:updated", refresh);
    return () => window.removeEventListener("ratings:updated", refresh);
  }, [teams, userId]);

  useEffect(() => {
    function onRowEdit(e) {
      const { teamId, field, value } = e.detail || {};
      if (!teamId || !field) return;
      setRatingsMap((prev) => {
        const next = { ...prev, [teamId]: { ...prev[teamId], [field]: value } };
        if (activePresetId !== "default") {
          const presets = loadRatingsPresets(userId) || [];
          const idx = presets.findIndex((p) => p.id === activePresetId);
          if (idx >= 0) {
            presets[idx] = { ...presets[idx], teamRatings: next };
            saveRatingsPresets(presets, userId);
          }
        }
        return next;
      });
    }
    window.addEventListener("ratings:rowEdit", onRowEdit);
    return () => window.removeEventListener("ratings:rowEdit", onRowEdit);
  }, [activePresetId]);

  const onSortAlpha = () => {
    if (sortBy === "alpha") setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy("alpha");
      setSortDir("asc");
    }
  };
  const onSortFdr = () => {
    if (sortBy === "fdr") setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy("fdr");
      setSortDir("asc");
    }
  };
  const onSortAvgAtk = () => {
    if (sortBy === "avgAtk") setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy("avgAtk");
      setSortDir("desc");
    }
  };
  const onSortAvgDef = () => {
    if (sortBy === "avgDef") setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy("avgDef");
      setSortDir("desc");
    }
  };

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.fplId, t])),
    [teams]
  );

  function buildTeamCells(teamId) {
    const out = [];
    for (const gw of gwList) {
      const fixtures = fixturesByGw[gw] || [];
      const f = fixtures.find(
        (fx) => fx.homeTeam === teamId || fx.awayTeam === teamId
      );
      if (!f) {
        out.push({ gw, text: "—", score: 1, isHome: false, oppId: null });
        continue;
      }
      const isHome = f.homeTeam === teamId;
      const oppId = isHome ? f.awayTeam : f.homeTeam;
      const opp = teamMap.get(oppId);
      const teamAttack = ratingsMap[teamId]?.attack ?? 1.5;
      const teamDefense = ratingsMap[teamId]?.defense ?? 1.5;
      const oppAttack = ratingsMap[oppId]?.attack ?? 1.5;
      const oppDefense = ratingsMap[oppId]?.defense ?? 1.5;

      const offensiveScore = computeDifficultyFromRatings({
        attackA: teamAttack,
        defenseB: oppDefense,
        isHome,
        homeBias: 1.04,
        awayBias: 0.9,
      });

      const defensiveScore = computeDifficultyFromRatings({
        attackA: teamDefense,
        defenseB: oppAttack,
        isHome,
        homeBias: 1.04,
        awayBias: 0.9,
      });

      const averageScore = (offensiveScore + defensiveScore) / 2;

      const invertedScore = 6 - averageScore;
      const code = opp?.shortName || String(oppId);
      const text = isHome ? code.toUpperCase() : code.toLowerCase();
      out.push({ gw, text, score: invertedScore, isHome, oppId });
    }
    return out;
  }

  const rows = useMemo(() => {
    const arr = teams.map((t) => {
      const cells = buildTeamCells(t.fplId);
      const scores = cells
        .map((c) => c.score)
        .filter((x) => Number.isFinite(x));
      const avg = scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      const atkScores = cells
        .map((c) => {
          if (!c.oppId) return null;
          const teamRating = ratingsMap[t.fplId] || {
            attack: 1.5,
            defense: 1.5,
          };
          const oppRating = ratingsMap[c.oppId] || {
            attack: 1.5,
            defense: 1.5,
          };
          const score = computeDifficultyFromRatings({
            attackA: teamRating.attack,
            defenseB: oppRating.defense,
            isHome: c.isHome,
            homeBias: 1.04,
            awayBias: 0.9,
          });
          return 6 - score;
        })
        .filter((x) => x !== null && Number.isFinite(x));

      const defScores = cells
        .map((c) => {
          if (!c.oppId) return null;
          const teamRating = ratingsMap[t.fplId] || {
            attack: 1.5,
            defense: 1.5,
          };
          const oppRating = ratingsMap[c.oppId] || {
            attack: 1.5,
            defense: 1.5,
          };
          const score = computeDifficultyFromRatings({
            attackA: teamRating.defense,
            defenseB: oppRating.attack,
            isHome: c.isHome,
            homeBias: 1.04,
            awayBias: 0.9,
          });
          return 6 - score;
        })
        .filter((x) => x !== null && Number.isFinite(x));

      const avgAtk = atkScores.length
        ? atkScores.reduce((a, b) => a + b, 0) / atkScores.length
        : 0;

      const avgDef = defScores.length
        ? defScores.reduce((a, b) => a + b, 0) / defScores.length
        : 0;

      const correctedAvg = (avgAtk + avgDef) / 2;

      return {
        teamId: t.fplId,
        name: t.name,
        cells,
        avg: correctedAvg,
        avgAtk,
        avgDef,
      };
    });
    if (sortBy === "alpha") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "fdr") arr.sort((a, b) => a.avg - b.avg);
    else if (sortBy === "avgAtk") arr.sort((a, b) => a.avgAtk - b.avgAtk);
    else if (sortBy === "avgDef") arr.sort((a, b) => a.avgDef - b.avgDef);
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [teams, fixturesByGw, gwList, ratingsMap, sortBy, sortDir]);

  const colorMapper = useMemo(() => {
    const all = [];
    for (const row of rows) {
      for (const c of row.cells)
        if (Number.isFinite(c.score)) all.push(c.score);
    }
    return makeNineBinColorMapper(all);
  }, [rows]);

  const {
    TEAM_COL_PX,
    ATK_COL_PX,
    DEF_COL_PX,
    AVG_COL_PX,
    AVGATK_COL_PX,
    AVGDEF_COL_PX,
    cellMin,
    STAR_PX,
  } = useMatrixSizes();
  const GAP_PX = 6;
  const FIX_GAP = 10;
  const fixedPx =
    TEAM_COL_PX +
    ATK_COL_PX +
    DEF_COL_PX +
    AVG_COL_PX +
    AVGATK_COL_PX +
    AVGDEF_COL_PX +
    5 * GAP_PX;
  const gwColWidth = `calc((100% - ${fixedPx}px) / ${Math.max(
    gwList.length,
    1
  )})`;

  const Dir = ({ active }) => (
    <span className="inline-block w-2 text-xs ml-0.5">
      {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </span>
  );

  const doReset = () => {
    resetFixturesSettings();
    const d = loadFixturesSettings();
    setFromGw(d.fromGw);
    setCount(d.count);
    setSortBy(d.sortBy);
    setSortDir(d.sortDir);
    setHomeW(d.homeW);
    setAwayW(d.awayW);
    setOppW(d.oppW);
  };

  const controlsActions = (
    <div className="flex gap-2 items-center">
      <button className="btn" onClick={doReset}>
        Reset settings
      </button>
    </div>
  );

  const matrixActions = (
    <RatingsPresetSelector
      activePresetId={activePresetId}
      onChangeActive={setActivePresetId}
      ratingsMap={ratingsMap}
      setRatingsPresets={setRatingsPresets}
    />
  );

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Card
        title="Controls"
        actions={controlsActions}
        titleClassName="title-gradient title-xl"
      >
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="w-24 text-base-300">From GW</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={38}
                value={fromGw}
                onChange={(e) => setFromGw(+e.target.value || 1)}
                className="field w-28"
              />
              <div className="numeric-arrows">
                <button
                  type="button"
                  aria-label="Increase from gameweek"
                  onClick={() =>
                    setFromGw((v) => Math.min(38, (Number(v) || 1) + 1))
                  }
                >
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 0L10 6H0L5 0Z" fill="currentColor" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Decrease from gameweek"
                  onClick={() =>
                    setFromGw((v) => Math.max(1, (Number(v) || 1) - 1))
                  }
                >
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: "rotate(180deg)" }}
                  >
                    <path d="M5 0L10 6H0L5 0Z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 text-base-300"># GWs</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(+e.target.value || 1)}
                className="field w-28"
              />
              <div className="numeric-arrows">
                <button
                  type="button"
                  aria-label="Increase number of gameweeks"
                  onClick={() =>
                    setCount((v) => Math.min(20, (Number(v) || 1) + 1))
                  }
                >
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M5 0L10 6H0L5 0Z" fill="currentColor" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Decrease number of gameweeks"
                  onClick={() =>
                    setCount((v) => Math.max(1, (Number(v) || 1) - 1))
                  }
                >
                  <svg
                    width="10"
                    height="6"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: "rotate(180deg)" }}
                  >
                    <path d="M5 0L10 6H0L5 0Z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </label>
        </div>
      </Card>

      <Card
        title={`Fixtures matrix (GW ${gwList[0] ?? "-"} … ${
          gwList[gwList.length - 1] ?? "-"
        })`}
        actions={matrixActions}
        titleClassName="title-gradient title-xl"
      >
        <div className="overflow-x-auto">
          <table
            className="text-sm fixtures-matrix"
            style={{
              width: "100%",
              tableLayout: "fixed",
              minWidth: `${Math.max(560, fixedPx + gwList.length * cellMin)}px`,
            }}
          >
            <thead>
              <tr style={{ background: "#2f0033" }}>
                <th
                  className="text-left"
                  style={{
                    width: TEAM_COL_PX,
                    minWidth: TEAM_COL_PX,
                    maxWidth: TEAM_COL_PX,
                    background: "#2f0033",
                  }}
                  onClick={onSortAlpha}
                >
                  <div className="p-1.5 cursor-pointer select-none text-xs font-medium flex items-center gap-1 leading-none">
                    <span>Team</span> <Dir active={sortBy === "alpha"} />
                  </div>
                </th>
                <th
                  className="text-left"
                  style={{
                    width: ATK_COL_PX,
                    minWidth: ATK_COL_PX,
                    maxWidth: ATK_COL_PX,
                    background: "#2f0033",
                  }}
                >
                  <div className="p-1.5 text-xs font-medium flex items-center gap-1 leading-none">
                    ATK
                  </div>
                </th>
                <th
                  aria-hidden
                  style={{
                    width: GAP_PX,
                    minWidth: GAP_PX,
                    maxWidth: GAP_PX,
                    padding: 0,
                    background: "#2f0033",
                  }}
                />
                <th
                  className="text-left"
                  style={{
                    width: DEF_COL_PX,
                    minWidth: DEF_COL_PX,
                    maxWidth: DEF_COL_PX,
                    background: "#2f0033",
                  }}
                >
                  <div className="p-1.5 text-xs font-medium flex items-center gap-1 leading-none">
                    DEF
                  </div>
                </th>
                <th
                  aria-hidden
                  style={{
                    width: GAP_PX,
                    minWidth: GAP_PX,
                    maxWidth: GAP_PX,
                    padding: 0,
                    background: "#2f0033",
                  }}
                />
                <th
                  className="text-left"
                  style={{
                    width: AVG_COL_PX,
                    minWidth: AVG_COL_PX,
                    maxWidth: AVG_COL_PX,
                    background: "#2f0033",
                  }}
                  onClick={onSortFdr}
                >
                  <div className="p-1.5 cursor-pointer select-none text-xs font-medium flex items-center justify-start leading-none">
                    <span>Avg</span>
                  </div>
                </th>
                <th
                  aria-hidden
                  style={{
                    width: GAP_PX,
                    minWidth: GAP_PX,
                    maxWidth: GAP_PX,
                    padding: 0,
                    background: "#2f0033",
                  }}
                />
                <th
                  className="text-left"
                  style={{
                    width: AVGATK_COL_PX,
                    minWidth: AVGATK_COL_PX,
                    maxWidth: AVGATK_COL_PX,
                    background: "#2f0033",
                  }}
                  onClick={onSortAvgAtk}
                >
                  <div className="p-1.5 cursor-pointer select-none text-xs font-medium flex items-center justify-start leading-none">
                    <span>AvgATK</span>
                  </div>
                </th>
                <th
                  aria-hidden
                  style={{
                    width: 2,
                    minWidth: 2,
                    maxWidth: 2,
                    padding: 0,
                    background: "#2f0033",
                  }}
                />
                <th
                  className="text-left"
                  style={{
                    width: AVGDEF_COL_PX,
                    minWidth: AVGDEF_COL_PX,
                    maxWidth: AVGDEF_COL_PX,
                    background: "#2f0033",
                  }}
                  onClick={onSortAvgDef}
                >
                  <div className="p-1.5 cursor-pointer select-none text-xs font-medium flex items-center justify-start leading-none">
                    <span>AvgDEF</span>
                  </div>
                </th>
                <th
                  aria-hidden
                  style={{
                    width: GAP_PX,
                    minWidth: GAP_PX,
                    maxWidth: GAP_PX,
                    padding: 0,
                    background: "#2f0033",
                  }}
                />
                {gwList.map((gw) => (
                  <th
                    key={gw}
                    className="text-center p-2"
                    style={{ width: gwColWidth, minWidth: cellMin }}
                  >
                    GW {gw}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <FixturesMatrixRow
                  key={row.teamId}
                  row={row}
                  idx={idx}
                  teamMap={teamMap}
                  ratingsMap={ratingsMap}
                  gwColWidth={gwColWidth}
                  cellMin={cellMin}
                  FIX_GAP={FIX_GAP}
                  GAP_PX={GAP_PX}
                  TEAM_COL_PX={TEAM_COL_PX}
                  ATK_COL_PX={ATK_COL_PX}
                  DEF_COL_PX={DEF_COL_PX}
                  AVG_COL_PX={AVG_COL_PX}
                  AVGATK_COL_PX={AVGATK_COL_PX}
                  AVGDEF_COL_PX={AVGDEF_COL_PX}
                  STAR_PX={STAR_PX}
                  sortBy={sortBy}
                  StarEditor={StarEditor}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-base-300">
          Click <b>Team</b>, <b>Avg</b>, <b>AvgATK</b>, or <b>AvgDEF</b> to
          sort. Clicking again toggles the direction.
        </div>
      </Card>
    </div>
  );
}

function StarIcon({ fill = 0, size = 14 }) {
  return (
    <span
      className="relative inline-block align-middle"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0"
        aria-hidden
        style={{ width: size, height: size }}
      >
        <path
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          fill="none"
          stroke="#666"
          strokeWidth="1.5"
        />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: fill === 1 ? "100%" : fill === 0.5 ? "50%" : "0%" }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          style={{ width: size, height: size }}
        >
          <path
            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            fill="#ffd166"
          />
        </svg>
      </span>
    </span>
  );
}

function StarEditor({ value = 0, readOnly = false, onChange, size = 14 }) {
  const raw = Number(value) || 0;
  const quant = Math.round(raw * 2) / 2;
  const clamped = Math.max(0, Math.min(5, quant));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5 ? 1 : 0;
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < full ? 1 : i === full && half ? 0.5 : 0
  );
  const { isOpen, setIsOpen, close, toggle } = useDropdownState();
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0, width: 0 });
  useEffect(() => {
    if (!isOpen) return;
    const onDoc = (e) => {
      const inTrigger = wrapRef.current && wrapRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) close();
    };
    document.addEventListener("mousedown", onDoc);
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);
  const options = useMemo(
    () => Array.from({ length: 11 }, (_, i) => i * 0.5),
    []
  );
  const handleToggle = () => {
    if (readOnly) return;
    setIsOpen((v) => {
      const next = !v;
      if (next && wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        const width = r.width;
        const menuHeight = 240;
        const spaceBelow = window.innerHeight - r.bottom;
        const spaceAbove = r.top;
        let top;
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          top = Math.max(8, r.top - menuHeight - 4);
        } else {
          top = Math.max(8, Math.min(r.bottom + 4, window.innerHeight - 8));
        }
        const left = Math.max(
          8,
          Math.min(r.left, window.innerWidth - width - 8)
        );
        setMenuPos({ left, top, width });
      }
      return next;
    });
  };
  const handleSelect = (v) => {
    if (readOnly) return;
    onChange && onChange(v);
    close();
  };
  return (
    <div
      ref={wrapRef}
      className="relative block w-full"
      title={`${clamped.toFixed(1)}★`}
    >
      <div
        className={`flex items-center ${readOnly ? "" : "cursor-pointer"}`}
        onClick={handleToggle}
      >
        {stars.map((f, i) => (
          <span key={i} className="relative inline-flex">
            <StarIcon fill={f} size={size} />
          </span>
        ))}
      </div>
      {isOpen &&
        createPortal(
          <ul
            ref={menuRef}
            style={{
              position: "fixed",
              left: menuPos.left,
              top: menuPos.top,
              width: Math.max(84, menuPos.width),
              boxSizing: "border-box",
              maxHeight: 240,
              overflowY: "auto",
            }}
            className="pos-menu z-[9999] rounded-xl shadow-xl py-1"
            role="listbox"
            aria-label="Edit star rating"
          >
            {options.map((opt) => {
              const active = Math.abs(opt - clamped) < 0.001;
              return (
                <li
                  key={opt}
                  role="option"
                  aria-selected={active}
                  className={`pos-option px-3 py-1 text-[11px] flex items-center justify-between gap-2 cursor-pointer ${
                    active ? "is-active" : ""
                  }`}
                  onClick={() => handleSelect(opt)}
                >
                  <span>{opt.toFixed(1)}★</span>
                  {active && (
                    <span className="text-brand-300 text-[8px]">●</span>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
