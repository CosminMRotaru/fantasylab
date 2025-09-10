import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Card from "../components/Card.jsx";
import {
  computeDifficultyFromRatings,
  makeNineBinColorMapper,
  heuristicShadeIndex,
  shadeIndexToColor,
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

const API = import.meta.env.VITE_API_BASE || "/api";

function useMatrixSizes() {
  const calc = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    if (w < 400)
      return {
        TEAM_COL_PX: 100,
        ATK_COL_PX: 120,
        DEF_COL_PX: 120,
        AVG_COL_PX: 64,
        cellMin: 72,
      };
    if (w < 520)
      return {
        TEAM_COL_PX: 110,
        ATK_COL_PX: 130,
        DEF_COL_PX: 130,
        AVG_COL_PX: 68,
        cellMin: 80,
      };
    if (w < 768)
      return {
        TEAM_COL_PX: 120,
        ATK_COL_PX: 150,
        DEF_COL_PX: 150,
        AVG_COL_PX: 70,
        cellMin: 88,
      };
    return {
      TEAM_COL_PX: 130,
      ATK_COL_PX: 160,
      DEF_COL_PX: 160,
      AVG_COL_PX: 72,
      cellMin: 96,
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
  const init = loadFixturesSettings();
  const [fromGw, setFromGw] = useState(init.fromGw);
  const [count, setCount] = useState(init.count);
  const [onlyFuture, setOnlyFuture] = useState(init.onlyFuture);
  const [sortBy, setSortBy] = useState(init.sortBy);
  const [sortDir, setSortDir] = useState(init.sortDir);

  useEffect(() => {
    saveFixturesSettings({
      fromGw,
      count,
      onlyFuture,
      sortBy,
      sortDir,
    });
  }, [fromGw, count, onlyFuture, sortBy, sortDir]);

  const [teams, setTeams] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [fixturesByGw, setFixturesByGw] = useState({});

  useEffect(() => {
    fetch(`${API}/teams`)
      .then((r) => r.json())
      .then(setTeams);
    fetch(`${API}/fixtures/deadlines`)
      .then((r) => r.json())
      .then(setDeadlines);
  }, []);

  const gwList = useMemo(() => {
    let start = fromGw;
    if (onlyFuture && deadlines.length)
      start = Math.max(start, deadlines[0]?.id || 1);
    return Array.from({ length: Math.max(0, count) }, (_, i) => start + i);
  }, [fromGw, count, onlyFuture, deadlines]);

  useEffect(() => {
    if (!gwList.length) return;
    Promise.all(
      gwList.map((gw) =>
        fetch(`${API}/fixtures?gw=${gw}`).then((r) => r.json())
      )
    ).then((list) => {
      const map = {};
      gwList.forEach((gw, idx) => (map[gw] = list[idx] || []));
      setFixturesByGw(map);
    });
  }, [gwList]);

  const [ratingsPresets, setRatingsPresets] = useState(() =>
    loadRatingsPresets()
  );
  const [activePresetId, setActivePresetId] = useState(
    () => loadActiveRatingsPresetId() || "default"
  );
  const [ratingsMap, setRatingsMap] = useState({});

  const deriveDefaultRatings = (teamsList) => {
    const starsDefaults = {
      liverpool: { atk: 5.0, def: 4.0 },
      "man city": { atk: 4.5, def: 4.0 },
      arsenal: { atk: 4.0, def: 4.5 },
      "aston villa": { atk: 3.5, def: 3.5 },
      spurs: { atk: 3.5, def: 4.0 },
      newcastle: { atk: 3.5, def: 4.0 },
      chelsea: { atk: 3.5, def: 3.5 },
      "nottm forest": { atk: 3.5, def: 3.0 },
      bournemouth: { atk: 3.0, def: 3.0 },
      brighton: { atk: 3.5, def: 3.0 },
      "man utd": { atk: 3.0, def: 3.0 },
      "crystal palace": { atk: 3.0, def: 3.5 },
      wolves: { atk: 2.5, def: 2.5 },
      "west ham": { atk: 3.0, def: 2.5 },
      everton: { atk: 3.0, def: 3.5 },
      brentford: { atk: 2.5, def: 3.0 },
      fulham: { atk: 2.5, def: 2.5 },
      leeds: { atk: 2.0, def: 2.0 },
      burnley: { atk: 2.0, def: 2.0 },
      sunderland: { atk: 2.0, def: 2.0 },
    };
    const alias = {
      "manchester city": "man city",
      tottenham: "spurs",
      "tottenham hotspur": "spurs",
      "newcastle united": "newcastle",
      "nottingham forest": "nottm forest",
      "afc bournemouth": "bournemouth",
      "brighton & hove albion": "brighton",
      "brighton and hove albion": "brighton",
      "manchester united": "man utd",
      "wolverhampton wanderers": "wolves",
      wolverhampton: "wolves",
      "west ham united": "west ham",
      "leeds united": "leeds",
    };
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/['’.]/g, "")
        .replace(/&/g, "and")
        .replace(/\s+/g, " ")
        .trim();
    const map = {};
    for (const t of teamsList) {
      const n = norm(t.name);
      const key = starsDefaults[n]
        ? n
        : starsDefaults[alias[n]]
        ? alias[n]
        : null;
      if (key) {
        const sd = starsDefaults[key];
        map[t.fplId] = { attack: sd.atk * 0.6, defense: sd.def * 0.6 };
        continue;
      }
      const sH = t.strengthOverallHome ?? t.strength ?? 3;
      const sA = t.strengthOverallAway ?? t.strength ?? 3;
      const scale = (x) => {
        const v = Math.max(1, Math.min(5, Number(x) || 3));
        return ((v - 1) / 4) * 3;
      };
      const atkBase = 0.6 * sH + 0.4 * sA;
      const defBase = 0.6 * sA + 0.4 * sH;
      map[t.fplId] = { attack: scale(atkBase), defense: scale(defBase) };
    }
    return map;
  };

  useEffect(() => {
    function refresh() {
      const id = loadActiveRatingsPresetId() || "default";
      setActivePresetId(id);
      if (id === "default") {
        const base = deriveDefaultRatings(teams);
        setRatingsMap(base);
      } else {
        const p = (loadRatingsPresets() || []).find((x) => x.id === id);
        setRatingsMap(p?.teamRatings || {});
      }
    }
    refresh();
    window.addEventListener("ratings:updated", refresh);
    return () => window.removeEventListener("ratings:updated", refresh);
  }, [teams]);

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
        out.push({ gw, text: "—", score: 5, isHome: false, oppId: null });
        continue;
      }
      const isHome = f.homeTeam === teamId;
      const oppId = isHome ? f.awayTeam : f.homeTeam;
      const opp = teamMap.get(oppId);
      const a = ratingsMap[teamId]?.attack ?? 1.5;
      const d = ratingsMap[oppId]?.defense ?? 1.5;
      const score = computeDifficultyFromRatings({
        attackA: a,
        defenseB: d,
        isHome,
        homeBias: 1.06,
        awayBias: 0.94,
      });
      const code = opp?.shortName || String(oppId);
      const text = isHome ? code.toUpperCase() : code.toLowerCase();
      out.push({ gw, text, score, isHome, oppId });
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
      return { teamId: t.fplId, name: t.name, cells, avg };
    });
    if (sortBy === "alpha") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "fdr") arr.sort((a, b) => a.avg - b.avg);
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

  const { TEAM_COL_PX, ATK_COL_PX, DEF_COL_PX, AVG_COL_PX, cellMin } =
    useMatrixSizes();
  const fixedPx = TEAM_COL_PX + ATK_COL_PX + DEF_COL_PX + AVG_COL_PX;
  const gwColWidth = `calc((100% - ${fixedPx}px) / ${Math.max(
    gwList.length,
    1
  )})`;

  const Dir = ({ active }) => (
    <span className="inline-block w-3 text-xs align-middle">
      {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </span>
  );

  const doReset = () => {
    resetFixturesSettings();
    const d = loadFixturesSettings();
    setFromGw(d.fromGw);
    setCount(d.count);
    setOnlyFuture(d.onlyFuture);
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
    <div className="flex gap-2 items-center">
      <select
        className="field"
        value={activePresetId}
        onChange={(e) => {
          const id = e.target.value;
          setActivePresetId(id);
          saveActiveRatingsPresetId(id);
          window.dispatchEvent(new Event("ratings:updated"));
        }}
        title="Choose ratings preset"
      >
        <option value="default">Default</option>
        {ratingsPresets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        className="btn"
        onClick={() => {
          const name = prompt("Preset name?");
          if (!name) return;
          const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const preset = { id, name, teamRatings: ratingsMap };
          const next = [preset, ...loadRatingsPresets()];
          setRatingsPresets(next);
          saveRatingsPresets(next);
          setActivePresetId(id);
          saveActiveRatingsPresetId(id);
          window.dispatchEvent(new Event("ratings:updated"));
        }}
      >
        Save as…
      </button>
    </div>
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
            <input
              type="number"
              min={1}
              max={38}
              value={fromGw}
              onChange={(e) => setFromGw(+e.target.value || 1)}
              className="field w-28"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 text-base-300"># GWs</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(+e.target.value || 1)}
              className="field w-28"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyFuture}
              onChange={(e) => setOnlyFuture(e.target.checked)}
              className="rounded border-white/20"
            />
            Only future
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
            className="text-sm"
            style={{
              width: "100%",
              tableLayout: "fixed",
              minWidth: `${Math.max(640, fixedPx + gwList.length * 96)}px`,
            }}
          >
            <thead>
              <tr style={{ background: "#2f0033" }}>
                <th
                  className="sticky z-30 text-left"
                  style={{
                    left: 0,
                    width: TEAM_COL_PX,
                    minWidth: TEAM_COL_PX,
                    maxWidth: TEAM_COL_PX,
                    background: "#2f0033",
                  }}
                  onClick={onSortAlpha}
                >
                  <div className="p-2 cursor-pointer select-none">
                    Team <Dir active={sortBy === "alpha"} />
                  </div>
                </th>
                <th
                  className="sticky z-30 text-left sticky-sep"
                  style={{
                    left: TEAM_COL_PX,
                    width: ATK_COL_PX,
                    minWidth: ATK_COL_PX,
                    maxWidth: ATK_COL_PX,
                    background: "#2f0033",
                  }}
                >
                  <div className="p-2">ATK</div>
                </th>
                <th
                  className="sticky z-30 text-left sticky-sep"
                  style={{
                    left: TEAM_COL_PX + ATK_COL_PX,
                    width: DEF_COL_PX,
                    minWidth: DEF_COL_PX,
                    maxWidth: DEF_COL_PX,
                    background: "#2f0033",
                  }}
                >
                  <div className="p-2">DEF</div>
                </th>
                <th
                  className="sticky z-30 text-left sticky-sep"
                  style={{
                    left: TEAM_COL_PX + ATK_COL_PX + DEF_COL_PX,
                    width: AVG_COL_PX,
                    minWidth: AVG_COL_PX,
                    maxWidth: AVG_COL_PX,
                    background: "#2f0033",
                  }}
                  onClick={onSortFdr}
                >
                  <div className="p-2 cursor-pointer select-none">
                    Avg <Dir active={sortBy === "fdr"} />
                  </div>
                </th>
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
                <tr
                  key={row.teamId}
                  style={{ background: idx % 2 ? "#320038" : "#2d0030" }}
                >
                  <td
                    className="sticky z-20 font-medium whitespace-nowrap"
                    style={{
                      left: 0,
                      width: TEAM_COL_PX,
                      minWidth: TEAM_COL_PX,
                      maxWidth: TEAM_COL_PX,
                      background: "inherit",
                    }}
                  >
                    <div className="p-2">{row.name}</div>
                  </td>
                  <td
                    className="sticky z-20 sticky-sep"
                    style={{
                      left: TEAM_COL_PX,
                      width: ATK_COL_PX,
                      minWidth: ATK_COL_PX,
                      maxWidth: ATK_COL_PX,
                      background: "inherit",
                    }}
                  >
                    <div className="p-1">
                      <StarEditor
                        value={
                          (ratingsMap[row.teamId]?.attack ?? 1.5) * (5 / 3)
                        }
                        readOnly={false}
                        onChange={(stars) => {
                          setRatingsMap((prev) => ({
                            ...prev,
                            [row.teamId]: {
                              attack: (stars / 5) * 3,
                              defense: prev[row.teamId]?.defense ?? 1.5,
                            },
                          }));
                        }}
                      />
                    </div>
                  </td>
                  <td
                    className="sticky z-20 sticky-sep"
                    style={{
                      left: TEAM_COL_PX + ATK_COL_PX,
                      width: DEF_COL_PX,
                      minWidth: DEF_COL_PX,
                      maxWidth: DEF_COL_PX,
                      background: "inherit",
                    }}
                  >
                    <div className="p-1">
                      <StarEditor
                        value={
                          (ratingsMap[row.teamId]?.defense ?? 1.5) * (5 / 3)
                        }
                        readOnly={false}
                        onChange={(stars) => {
                          setRatingsMap((prev) => ({
                            ...prev,
                            [row.teamId]: {
                              attack: prev[row.teamId]?.attack ?? 1.5,
                              defense: (stars / 5) * 3,
                            },
                          }));
                        }}
                      />
                    </div>
                  </td>
                  <td
                    className="sticky z-20 sticky-sep"
                    style={{
                      left: TEAM_COL_PX + ATK_COL_PX + DEF_COL_PX,
                      width: AVG_COL_PX,
                      minWidth: AVG_COL_PX,
                      maxWidth: AVG_COL_PX,
                      background: "inherit",
                    }}
                  >
                    <div className="p-2">{row.avg.toFixed(2)}</div>
                  </td>
                  {row.cells.map((c) => (
                    <td
                      key={c.gw}
                      className="p-1 text-center"
                      style={{ width: gwColWidth, minWidth: cellMin }}
                    >
                      <div
                        className="rounded-md px-2 py-1 font-semibold"
                        title={`GW${c.gw} • ${c.text} • score ${c.score}`}
                        style={{
                          background: (() => {
                            const team = teamMap.get(row.teamId);
                            const opp = c.oppId ? teamMap.get(c.oppId) : null;
                            const teamRating = ratingsMap[row.teamId] || {
                              attack: 1.5,
                              defense: 1.5,
                            };
                            const oppRating = opp
                              ? ratingsMap[opp.fplId] || {
                                  attack: 1.5,
                                  defense: 1.5,
                                }
                              : { attack: 1.5, defense: 1.5 };
                            const teamAvgStars =
                              ((teamRating.attack + teamRating.defense) / 2) *
                              (5 / 3);
                            const oppAvgStars =
                              ((oppRating.attack + oppRating.defense) / 2) *
                              (5 / 3);
                            const shade = heuristicShadeIndex({
                              teamName: team?.name || "",
                              oppName: opp?.name || c.text,
                              isHome: !!c.isHome,
                              teamStarAvg: teamAvgStars,
                              oppStarAvg: oppAvgStars,
                            });
                            return shadeIndexToColor(shade);
                          })(),
                          color: "rgba(10,10,10,0.9)",
                        }}
                      >
                        {c.text}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-base-300">
          Click <b>Team</b> or <b>Avg</b> to sort. Clicking again toggles the
          direction.
        </div>
      </Card>
    </div>
  );
}

function StarIcon({ fill = 0 }) {
  return (
    <span
      className="relative inline-block align-middle"
      style={{ width: 14, height: 14 }}
    >
      <svg
        viewBox="0 0 24 24"
        className="absolute inset-0"
        aria-hidden
        style={{ width: 14, height: 14 }}
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
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14 }}>
          <path
            d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
            fill="#ffd166"
          />
        </svg>
      </span>
    </span>
  );
}

function StarEditor({ value = 0, readOnly = false, onChange }) {
  const raw = Number(value) || 0;
  const quant = Math.round(raw * 2) / 2;
  const clamped = Math.max(0, Math.min(5, quant));
  const full = Math.floor(clamped);
  const half = clamped - full >= 0.5 ? 1 : 0;
  const stars = Array.from({ length: 5 }, (_, i) =>
    i < full ? 1 : i === full && half ? 0.5 : 0
  );
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuPos, setMenuPos] = React.useState({ left: 0, top: 0, width: 0 });
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      const inTrigger = wrapRef.current && wrapRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const options = React.useMemo(
    () => Array.from({ length: 11 }, (_, i) => i * 0.5),
    []
  );
  const handleToggle = () => {
    if (readOnly) return;
    setOpen((v) => {
      const next = !v;
      if (next && wrapRef.current) {
        const r = wrapRef.current.getBoundingClientRect();
        const width = r.width;
        const left = Math.max(
          8,
          Math.min(r.left, window.innerWidth - width - 8)
        );
        const top = Math.max(8, Math.min(r.bottom + 4, window.innerHeight - 8));
        setMenuPos({ left, top, width });
      }
      return next;
    });
  };
  const handleSelect = (v) => {
    if (readOnly) return;
    onChange && onChange(v);
    setOpen(false);
  };
  return (
    <div
      ref={wrapRef}
      className="relative block w-full"
      title={`${clamped.toFixed(1)}★`}
    >
      <div
        className={`flex items-center gap-1 ${
          readOnly ? "" : "cursor-pointer"
        }`}
        onClick={handleToggle}
      >
        {stars.map((f, i) => (
          <span key={i} className="relative inline-flex">
            <StarIcon fill={f} />
          </span>
        ))}
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: menuPos.left,
              top: menuPos.top,
              width: menuPos.width,
              boxSizing: "border-box",
            }}
            className="z-[9999] rounded border border-white/10 bg-[#2f0033] shadow-lg p-1"
          >
            <div className="max-h-60 overflow-auto">
              {options.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`w-full text-left px-2 py-1 rounded ${
                    Math.abs(opt - clamped) < 0.001
                      ? "bg-white/10"
                      : "hover:bg-white/10"
                  }`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.toFixed(1)}★
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
