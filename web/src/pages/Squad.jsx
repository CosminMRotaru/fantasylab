import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Card from "../components/Card.jsx";
import {
  loadSquads,
  saveSquads,
  deleteSquad,
  loadActiveSquadId,
  saveActiveSquadId,
  listSquadSnapshots,
  saveSquadSnapshot,
  loadSquadSnapshot,
  deleteSquadSnapshot,
  loadFixturesSettings,
  loadSquadFixSettings,
  saveSquadFixSettings,
} from "../lib/storage.js";
import { isLoggedIn, saveState, loadState } from "../lib/auth.js";
import {
  computeDifficultyFromRatings,
  heuristicShadeIndex,
  shadeIndexToColor,
} from "../lib/fdr.js";
import {
  loadRatingsPresets,
  loadActiveRatingsPresetId,
} from "../lib/storage.js";

const API = import.meta.env.VITE_API_BASE || "/api";

const PLAYER_COL_PX = 220;
const INFO_COL_PX = 96;

function loadLineups(squadId) {
  return JSON.parse(localStorage.getItem(`lineups_${squadId}`) || "{}");
}
function saveLineups(squadId, obj) {
  localStorage.setItem(`lineups_${squadId}`, JSON.stringify(obj));
}

function loadTransfers(squadId) {
  return JSON.parse(localStorage.getItem(`transfers_${squadId}`) || "[]");
}
function saveTransfers(squadId, arr) {
  localStorage.setItem(`transfers_${squadId}`, JSON.stringify(arr));
}

export default function Squad() {
  const location = useLocation();
  const IS_AUTH = isLoggedIn();
  const [squads, setSquads] = useState(IS_AUTH ? [] : loadSquads());
  const [activeSquadId, setActiveSquadId] = useState(
    IS_AUTH ? null : loadActiveSquadId() || (squads[0]?.id ?? null)
  );
  const activeSquad = squads.find((s) => s.id === activeSquadId) ||
    squads[0] || {
      players: [],
    };

  const [teams, setTeams] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const { homeW = 1, awayW = 1, oppW = 1 } = loadFixturesSettings();
  const [ratingsMap, setRatingsMap] = useState({});
  const [activePresetId, setActivePresetId] = useState("default");

  useEffect(() => {
    function refresh() {
      setActivePresetId(loadActiveRatingsPresetId() || "default");
      const presets = loadRatingsPresets();
      if ((loadActiveRatingsPresetId() || "default") === "default") {
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
        for (const t of teams) {
          const n = norm(t.name);
          const key = starsDefaults[n]
            ? n
            : starsDefaults[alias[n]]
            ? alias[n]
            : null;
          if (key) {
            const sd = starsDefaults[key];
            map[t.fplId] = { attack: sd.atk * 0.6, defense: sd.def * 0.6 };
          }
        }
        setRatingsMap(map);
      } else {
        const p = presets.find((x) => x.id === loadActiveRatingsPresetId());
        setRatingsMap(p?.teamRatings || {});
      }
    }
    refresh();
    window.addEventListener("ratings:updated", refresh);
    return () => window.removeEventListener("ratings:updated", refresh);
  }, [teams]);

  const init = loadSquadFixSettings();
  const [fromGw, setFromGw] = useState(init.fromGw);
  const [count, setCount] = useState(init.count);
  const [onlyFuture, setOnlyFuture] = useState(init.onlyFuture);
  useEffect(() => {
    saveSquadFixSettings({ fromGw, count, onlyFuture });
  }, [fromGw, count, onlyFuture]);

  const [entryInput, setEntryInput] = useState("");
  const [importMsg, setImportMsg] = useState("");

  const [q, setQ] = useState("");
  const searchInputRef = useRef(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [players, setPlayers] = useState([]);
  const hasFilter = !!(q.trim() || teamFilter || posFilter);

  const [lineups, setLineups] = useState(() =>
    IS_AUTH ? {} : loadLineups(activeSquadId)
  );
  const [transfers, setTransfers] = useState(() =>
    IS_AUTH ? [] : loadTransfers(activeSquadId)
  );
  const [transferIdx, setTransferIdx] = useState(null);
  const [transferGw, setTransferGw] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [snapshots, setSnapshots] = useState([]);
  const [activeSnapId, setActiveSnapId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSquadMenu, setShowSquadMenu] = useState(false);
  const [showSnapMenu, setShowSnapMenu] = useState(false);
  const squadMenuRef = useRef(null);
  const snapMenuRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (
        showSquadMenu &&
        squadMenuRef.current &&
        !squadMenuRef.current.contains(e.target)
      ) {
        setShowSquadMenu(false);
      }
      if (
        showSnapMenu &&
        snapMenuRef.current &&
        !snapMenuRef.current.contains(e.target)
      ) {
        setShowSnapMenu(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showSquadMenu, showSnapMenu]);
  const [hydrated, setHydrated] = useState(!IS_AUTH);

  useEffect(() => {
    fetch(`${API}/teams`)
      .then((r) => r.json())
      .then(setTeams);
    fetch(`${API}/fixtures/deadlines`)
      .then((r) => r.json())
      .then(setDeadlines);
    (async () => {
      if (!isLoggedIn()) {
        setHydrated(true);
        return;
      }
      const res = await loadState();
      if (res.ok && res.state) {
        const st = res.state;
        if (Array.isArray(st.squads)) {
          setSquads(st.squads);
          saveSquads(st.squads);
        }
        if (st.activeSquadId) {
          setActiveSquadId(st.activeSquadId);
          saveActiveSquadId(st.activeSquadId);
        }
        if (st.squadFixSettings) {
          const d = st.squadFixSettings;
          setFromGw(d.fromGw ?? fromGw);
          setCount(d.count ?? count);
          setOnlyFuture(d.onlyFuture ?? onlyFuture);
        }
        if (st.lineups) {
          localStorage.setItem(
            `lineups_${st.activeSquadId}`,
            JSON.stringify(st.lineups)
          );
          setLineups(st.lineups);
        }
        if (st.transfers) {
          localStorage.setItem(
            `transfers_${st.activeSquadId}`,
            JSON.stringify(st.transfers)
          );
          setTransfers(st.transfers);
        }
        setSyncMsg("Loaded from cloud");
        setTimeout(() => setSyncMsg(""), 2000);
      }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hasFilter) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (teamFilter) params.set("team", teamFilter);
    if (posFilter) params.set("pos", posFilter);
    params.set("limit", "50");
    fetch(`${API}/players?${params.toString()}`)
      .then((r) => r.json())
      .then(setPlayers);
  }, [q, teamFilter, posFilter, hasFilter]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = (params.get("q") || "").trim();
    if (query) {
      setQ(query);
      setTimeout(() => searchInputRef.current?.focus(), 0);
      const p = new URLSearchParams();
      p.set("q", query);
      if (teamFilter) p.set("team", teamFilter);
      if (posFilter) p.set("pos", posFilter);
      p.set("limit", "50");
      fetch(`${API}/players?${p.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          setPlayers(Array.isArray(data) ? data : []);
        })
        .catch(() => {});
    }
  }, [location.search]);
  useEffect(() => {
    setLineups(loadLineups(activeSquadId));
    setTransfers(loadTransfers(activeSquadId));
    setSnapshots(listSquadSnapshots(activeSquadId));
    setActiveSnapId("");
  }, [activeSquadId]);
  function createSquad(name) {
    const id = Date.now().toString();
    const newSquad = { id, name, players: [] };
    const next = [...squads, newSquad];
    setSquads(next);
    saveSquads(next);
    setActiveSquadId(id);
    saveActiveSquadId(id);
  }
  function selectSquad(id) {
    setActiveSquadId(id);
    saveActiveSquadId(id);
  }
  function addToSquad(p) {
    if (activeSquad.players.find((x) => x.fplId === p.fplId)) return;
    const nextSquads = squads.map((s) =>
      s.id === activeSquadId
        ? { ...s, players: [...s.players, p].slice(0, 15) }
        : s
    );
    setSquads(nextSquads);
    saveSquads(nextSquads);
  }
  function removeFromSquad(id) {
    const nextSquads = squads.map((s) =>
      s.id === activeSquadId
        ? { ...s, players: s.players.filter((p) => p.fplId !== id) }
        : s
    );
    setSquads(nextSquads);
    saveSquads(nextSquads);
  }

  async function onImportEntry() {
    const entryId = parseEntryId(entryInput);
    if (!entryId) {
      setImportMsg("Invalid entry ID.");
      return;
    }
    setImportMsg("Importing…");
    try {
      const r = await fetch(`${API}/import/entry/${entryId}`);
      const data = await r.json();
      if (!data.ok) {
        setImportMsg(
          data.requiresAuth
            ? "FPL requires authentication for picks. Use the manual builder."
            : data.message || "Import failed."
        );
        return;
      }
      const next = (data.picks || []).slice(0, 15);
      const nextSquads = squads.map((s) =>
        s.id === activeSquadId ? { ...s, players: next } : s
      );
      setSquads(nextSquads);
      saveSquads(nextSquads);
      setImportMsg(`Imported GW${data.gw} picks for entry ${data.entryId}.`);
    } catch {
      setImportMsg("Import failed.");
    }
  }

  const gwList = useMemo(() => {
    let start = fromGw;
    if (onlyFuture && deadlines.length)
      start = Math.max(start, deadlines[0]?.id || 1);
    return Array.from({ length: Math.max(0, count) }, (_, i) => start + i);
  }, [fromGw, count, onlyFuture, deadlines]);

  const [fixturesByGw, setFixturesByGw] = useState({});
  useEffect(() => {
    if (!gwList.length) return;
    Promise.all(
      gwList.map((gw) =>
        fetch(`${API}/fixtures?gw=${gw}`).then((r) => r.json())
      )
    ).then((list) => {
      const map = {};
      gwList.forEach((gw, idx) => {
        map[gw] = list[idx];
      });
      setFixturesByGw(map);
    });
  }, [gwList]);

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.fplId, t])),
    [teams]
  );

  function buildTeamFixtures(teamId) {
    const out = [];
    for (const gw of gwList) {
      const fixtures = fixturesByGw[gw] || [];
      const f = fixtures.find(
        (fx) => fx.homeTeam === teamId || fx.awayTeam === teamId
      );
      if (!f) {
        out.push({ gw, text: "—", color: "transparent", score: 5 });
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
      const team = teamMap.get(teamId);
      const teamRating = ratingsMap[teamId] || { attack: 1.5, defense: 1.5 };
      const oppRating = ratingsMap[oppId] || { attack: 1.5, defense: 1.5 };
      const teamAvgStars =
        ((teamRating.attack + teamRating.defense) / 2) * (5 / 3);
      const oppAvgStars =
        ((oppRating.attack + oppRating.defense) / 2) * (5 / 3);
      const shade = heuristicShadeIndex({
        teamName: team?.name || String(teamId),
        oppName: opp?.name || String(oppId),
        isHome,
        teamStarAvg: teamAvgStars,
        oppStarAvg: oppAvgStars,
      });
      const color = shadeIndexToColor(shade);

      const code = opp?.shortName || String(oppId);
      const text = isHome ? code.toUpperCase() : code.toLowerCase();
      out.push({ gw, text, color, score });
    }
    return out;
  }

  const rows = useMemo(() => {
    const prio = { 1: 0, 2: 1, 3: 2, 4: 3 };
    return [...(activeSquad.players || [])].sort(
      (a, b) =>
        prio[a.position] - prio[b.position] ||
        a.webName.localeCompare(b.webName)
    );
  }, [activeSquad.players]);

  const fixedPx = PLAYER_COL_PX + INFO_COL_PX;
  const gwColWidth = `calc((100% - ${fixedPx}px) / ${Math.max(
    gwList.length,
    1
  )})`;

  const settingsActions = (
    <div className="flex gap-2">
      <button
        className="btn"
        onClick={() => {
          const name = prompt("Snapshot name?");
          if (!name) return;
          const data = {
            squads,
            activeSquadId,
            lineups,
            transfers,
          };
          const id = saveSquadSnapshot(activeSquadId, name, data);
          setSnapshots(listSquadSnapshots(activeSquadId));
          setActiveSnapId(id || "");
          setSyncMsg("Snapshot saved");
          setTimeout(() => setSyncMsg(""), 1500);
        }}
      >
        Save
      </button>
      <button
        className="btn"
        onClick={() => {
          resetSquadFixSettings();
          const d = loadSquadFixSettings();
          setFromGw(d.fromGw);
          setCount(d.count);
          setOnlyFuture(d.onlyFuture);
        }}
      >
        Reset
      </button>
      {syncMsg && <span className="text-xs text-base-300">{syncMsg}</span>}
    </div>
  );

  function onClear() {
    const nextSquads = squads.map((s) =>
      s.id === activeSquadId ? { ...s, players: [] } : s
    );
    setSquads(nextSquads);
    saveSquads(nextSquads);
  }

  function toggleLineup(gw, fplId) {
    setLineups((prev) => {
      const gwLineup = prev[gw] || [];
      let next;
      if (gwLineup.includes(fplId)) {
        next = gwLineup.filter((id) => id !== fplId);
      } else {
        if (gwLineup.length >= 11) return prev;
        next = [...gwLineup, fplId];
      }
      const updated = { ...prev, [gw]: next };
      saveLineups(activeSquadId, updated);
      return updated;
    });
  }

  function startTransfer(idx) {
    setTransferIdx(idx);
    setTransferGw(gwList[0]);
    setShowTransfer(true);
  }

  function confirmTransfer(newPlayer) {
    if (transferIdx === null || !transferGw) return;
    const prevTransfers = [...transfers];
    prevTransfers[transferIdx] = prevTransfers[transferIdx] || [];
    prevTransfers[transferIdx].push({
      gw: Number(transferGw),
      player: newPlayer,
    });
    setTransfers(prevTransfers);
    saveTransfers(activeSquadId, prevTransfers);
    setTransferIdx(null);
    setTransferGw("");
    setShowTransfer(false);
  }

  function cancelLastTransferFor(idx) {
    setTransfers((prev) => {
      const next = prev.map((arr) => (arr ? [...arr] : []));
      if (next[idx] && next[idx].length) {
        next[idx].pop();
      }
      saveTransfers(activeSquadId, next);
      return next;
    });
  }
  const squadWithTransfers = useMemo(() => {
    return (activeSquad.players || []).map((p, idx) => {
      const playerTransfers = (transfers[idx] || []).sort(
        (a, b) => a.gw - b.gw
      );
      return {
        initial: p,
        transfers: playerTransfers,
      };
    });
  }, [activeSquad.players, transfers]);
  const stateToPersist = useMemo(
    () => ({
      squads,
      activeSquadId,
      squadFixSettings: { fromGw, count, onlyFuture },
      lineups,
      transfers,
    }),
    [squads, activeSquadId, fromGw, count, onlyFuture, lineups, transfers]
  );

  useEffect(() => {
    if (!isLoggedIn() || !hydrated) return;
    setSaving(true);
    const t = setTimeout(async () => {
      const res = await saveState(stateToPersist);
      setSaving(false);
      setSyncMsg(res.ok ? "Saved" : "Save failed");
      setTimeout(() => setSyncMsg(""), 1500);
    }, 400);
    return () => clearTimeout(t);
  }, [stateToPersist, hydrated]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <div className="relative" ref={squadMenuRef}>
          <button
            className="btn h-10 flex items-center gap-2 px-3 text-white/90 shadow-sm"
            style={{
              background:
                "linear-gradient(180deg, rgba(55,0,60,0.92) 0%, rgba(55,0,60,0.85) 100%)",
              border: "1px solid rgba(124, 92, 255, 0.2)",
            }}
            onClick={() => setShowSquadMenu((s) => !s)}
            title="Choose or delete squad"
          >
            <span className="truncate max-w-[200px]">
              {squads.find((s) => s.id === activeSquadId)?.name ||
                squads[0]?.name ||
                "No squad"}
            </span>
            <span className="opacity-70">▾</span>
          </button>
          {showSquadMenu && (
            <div className="search-dd absolute mt-2 w-64 z-50">
              {squads.length === 0 && (
                <div className="text-sm text-base-400 px-2 py-1">No squads</div>
              )}
              {squads.map((s) => (
                <div
                  key={s.id}
                  className="search-item"
                  onClick={() => {
                    selectSquad(s.id);
                    setShowSquadMenu(false);
                  }}
                >
                  <span className="truncate pr-2">{s.name}</span>
                  <div className="flex items-center gap-2">
                    {s.id === activeSquadId && (
                      <span className="text-xs text-brand-400">active</span>
                    )}
                    <button
                      className="btn px-2 py-1 text-xs"
                      title="Delete squad"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete squad "${s.name}"?`)) return;
                        const next = deleteSquad(s.id);
                        setSquads(next);
                        const newId = next[0]?.id || null;
                        setActiveSquadId(newId);
                        if (newId) saveActiveSquadId(newId);
                        setShowSquadMenu(false);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={snapMenuRef}>
          <button
            className="btn h-10 flex items-center gap-2 px-3 text-white/90 shadow-sm"
            style={{
              background:
                "linear-gradient(180deg, rgba(55,0,60,0.92) 0%, rgba(55,0,60,0.85) 100%)",
              border: "1px solid rgba(124, 92, 255, 0.2)",
            }}
            onClick={() => setShowSnapMenu((s) => !s)}
            title="Load or delete snapshot"
          >
            <span className="truncate">Snapshots</span>
            <span className="opacity-70">▾</span>
          </button>
          {showSnapMenu && (
            <div className="search-dd absolute mt-2 w-80 z-50">
              {snapshots.length === 0 && (
                <div className="text-sm text-base-400 px-2 py-1">
                  No snapshots
                </div>
              )}
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className="search-item"
                  onClick={() => {
                    setActiveSnapId(s.id);
                    const snap = loadSquadSnapshot(activeSquadId, s.id);
                    if (!snap) return;
                    const {
                      squads: sq,
                      activeSquadId: aId,
                      lineups: ls,
                      transfers: ts,
                    } = snap.data || {};
                    if (Array.isArray(sq)) {
                      setSquads(sq);
                      saveSquads(sq);
                    }
                    if (aId) {
                      setActiveSquadId(aId);
                      saveActiveSquadId(aId);
                    }
                    if (ls) setLineups(ls);
                    if (ts) setTransfers(ts);
                    setSyncMsg("Loaded snapshot");
                    setTimeout(() => setSyncMsg(""), 1500);
                    setShowSnapMenu(false);
                  }}
                >
                  <div className="truncate pr-2">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-base-400">
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    className="btn px-2 py-1 text-xs"
                    title="Delete snapshot"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm(`Delete snapshot "${s.name}"?`)) return;
                      deleteSquadSnapshot(activeSquadId, s.id);
                      setSnapshots(listSquadSnapshots(activeSquadId));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn btn-primary px-4 py-2 text-base shadow-lg transition-all duration-200"
          style={{
            background: "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.background =
              "linear-gradient(90deg, #00d5c4 0%, #7c5cff 100%)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background =
              "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)")
          }
          onClick={() => {
            const name = prompt("Team name?");
            if (name) createSquad(name);
          }}
        >
          + New Team
        </button>
      </div>

      <Card
        title={`My Squad${activeSquad.name ? `: ${activeSquad.name}` : ""} (${
          activeSquad.players.length
        }/15)`}
        titleClassName="title-gradient title-xl"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={onClear} className="btn">
              Clear
            </button>
            {settingsActions}
          </div>
        }
        footer={
          <span>
            Total cost £
            {(
              activeSquad.players.reduce((s, p) => s + (p.nowCost || 0), 0) / 10
            ).toFixed(1)}
            m
          </span>
        }
      >
        <div className="grid sm:grid-cols-3 gap-2 text-sm mb-3">
          <label className="flex items-center gap-2">
            <span className="w-24 text-base-300">From GW</span>
            <input
              type="number"
              min={1}
              max={38}
              value={fromGw}
              onChange={(e) => setFromGw(+e.target.value || 1)}
              className="field w-24"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 text-base-300"># GWs</span>
            <input
              type="number"
              min={1}
              max={15}
              value={count}
              onChange={(e) => setCount(+e.target.value || 1)}
              className="field w-24"
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

        <div className="overflow-x-auto">
          <table
            className="text-sm"
            style={{
              width: "100%",
              tableLayout: "fixed",
              minWidth: `${Math.max(
                640,
                PLAYER_COL_PX + INFO_COL_PX + gwList.length * 72
              )}px`,
            }}
          >
            <thead>
              <tr className="bg-white/5">
                <th
                  className="sticky z-30 bg-white/5 text-left sticky-sep"
                  style={{
                    left: 0,
                    width: PLAYER_COL_PX,
                    minWidth: PLAYER_COL_PX,
                    maxWidth: PLAYER_COL_PX,
                  }}
                >
                  <div className="p-2">Player</div>
                </th>
                <th
                  className="sticky z-30 bg-white/5 text-left sticky-sep"
                  style={{
                    left: PLAYER_COL_PX,
                    width: INFO_COL_PX,
                    minWidth: INFO_COL_PX,
                    maxWidth: INFO_COL_PX,
                  }}
                >
                  <div className="p-2">Info</div>
                </th>
                {gwList.map((gw) => (
                  <th
                    key={gw}
                    className="text-center p-2"
                    style={{
                      width: `calc((100% - ${
                        PLAYER_COL_PX + INFO_COL_PX
                      }px) / ${Math.max(gwList.length, 1)})`,
                      minWidth: 72,
                    }}
                  >
                    GW {gw}
                    <div className="mt-1 text-xs text-brand-400 font-bold">
                      {lineups[gw]?.length || 0}/11
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["GK", "DEF", "MID", "FWD"].map((label, posIdx) => {
                const posCode = posIdx + 1;
                const group = rows.filter((p) => p.position === posCode);
                if (!group.length) return null;
                return (
                  <React.Fragment key={label}>
                    <tr>
                      <td colSpan={2 + gwList.length} className="py-2">
                        <div className="text-xs uppercase tracking-wide text-brand-400 font-bold pl-2">
                          {label}
                        </div>
                      </td>
                    </tr>
                    {group.map((p, idx) => {
                      const teamShort =
                        teams.find((t) => t.fplId === p.team)?.shortName ||
                        p.team;
                      const origIdx = (activeSquad.players || []).findIndex(
                        (pl) => pl.fplId === p.fplId
                      );
                      const playerTransfers =
                        origIdx >= 0 && transfers[origIdx]
                          ? [...transfers[origIdx]].sort((a, b) => a.gw - b.gw)
                          : [];
                      const lastIncoming =
                        playerTransfers[playerTransfers.length - 1]?.player ||
                        null;
                      const transferGwList = playerTransfers.map((t) => t.gw);
                      const playerByGw = [];
                      let pointer = 0;
                      let current = p;
                      for (let i = 0; i < gwList.length; i++) {
                        const gw = gwList[i];
                        while (
                          playerTransfers[pointer] &&
                          playerTransfers[pointer].gw === gw
                        ) {
                          current = playerTransfers[pointer].player;
                          pointer++;
                        }
                        playerByGw.push(current);
                      }
                      return (
                        <tr
                          key={p.fplId}
                          className="border-b border-white/10"
                          style={{
                            borderTop:
                              idx === 0 ? "2px solid #7c5cff44" : undefined,
                            background:
                              idx % 2 === 0
                                ? "rgba(20,22,34,0.03)"
                                : "transparent",
                          }}
                        >
                          <td
                            className="sticky z-20 font-medium whitespace-nowrap sticky-sep"
                            style={{
                              left: 0,
                              width: PLAYER_COL_PX,
                              minWidth: PLAYER_COL_PX,
                              maxWidth: PLAYER_COL_PX,
                              background:
                                idx % 2 === 0
                                  ? "rgba(20,22,34,0.03)"
                                  : "transparent",
                            }}
                          >
                            <div className="p-2 flex items-center gap-2">
                              <span className="truncate max-w-[180px]">
                                {p.webName}
                                {lastIncoming ? (
                                  <>
                                    {" / "}
                                    <span className="text-brand-300">
                                      {lastIncoming.webName}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                              <button
                                onClick={() => removeFromSquad(p.fplId)}
                                className="btn px-2 py-1 text-xs shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                          <td
                            className="sticky z-20 sticky-sep"
                            style={{
                              left: PLAYER_COL_PX,
                              width: INFO_COL_PX,
                              minWidth: INFO_COL_PX,
                              maxWidth: INFO_COL_PX,
                              background:
                                idx % 2 === 0
                                  ? "rgba(20,22,34,0.03)"
                                  : "transparent",
                            }}
                          >
                            <div className="p-2">
                              <div>
                                {teamShort} · £{(p.nowCost / 10).toFixed(1)}
                              </div>
                            </div>
                          </td>
                          {gwList.map((gw, gwIdx) => {
                            const currP = playerByGw[gwIdx];
                            const tfCurr = buildTeamFixtures(currP.team);
                            const c = tfCurr[gwIdx];
                            const isSelected = (lineups[gw] || []).includes(
                              currP.fplId
                            );
                            const hasTransferAtGw = playerTransfers.some(
                              (t) => t.gw === gw
                            );
                            return (
                              <td
                                key={c.gw}
                                className="p-1 text-center"
                                style={{ width: gwColWidth, minWidth: 88 }}
                              >
                                <div
                                  className={`rounded-md px-2 py-1 font-semibold relative transition cursor-pointer
                                    ${
                                      isSelected
                                        ? "ring-2 ring-brand-600 bg-[#7c5cff22] shadow-[0_0_0_2px_#00d5c4] scale-[1.04]"
                                        : "hover:bg-[#7c5cff11]"
                                    }
                                  `}
                                  style={{
                                    background: c.color,
                                    color: "rgba(10,10,10,0.9)",
                                  }}
                                  onClick={() => toggleLineup(gw, currP.fplId)}
                                  title={
                                    isSelected
                                      ? "Starter in this gameweek"
                                      : "Click to select as starter"
                                  }
                                >
                                  {c.text}
                                  {hasTransferAtGw && (
                                    <span
                                      className="absolute left-1 top-1 w-4 h-4 rounded-full bg-[#7c5cff] text-white text-[10px] leading-4 flex items-center justify-center pointer-events-none"
                                      title={`Transfer GW ${gw}`}
                                      aria-hidden="true"
                                    >
                                      ⇄
                                    </span>
                                  )}
                                  <span
                                    className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                                    aria-hidden="true"
                                  >
                                    <span
                                      className="inline-block rounded-full border-2 transition-all"
                                      style={{
                                        width: 12,
                                        height: 12,
                                        borderColor: "#7c5cff",
                                        backgroundColor: isSelected
                                          ? "#7c5cff"
                                          : "#ffffff",
                                      }}
                                    />
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Import from FPL"
        titleClassName="title-gradient title-xl"
        actions={<span className="text-xs text-base-300">{importMsg}</span>}
      >
        <div className="grid md:grid-cols-4 gap-2">
          <input
            className="field md:col-span-3"
            placeholder="Paste FPL team link or entry ID (e.g. https://fantasy.premierleague.com/entry/123456)"
            value={entryInput}
            onChange={(e) => setEntryInput(e.target.value)}
          />
          <button
            onClick={onImportEntry}
            className="btn btn-primary px-5 py-3 text-base shadow-lg transition-all duration-200"
            style={{
              background: "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background =
                "linear-gradient(90deg, #00d5c4 0%, #7c5cff 100%)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background =
                "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)")
            }
          >
            Import
          </button>
        </div>
        <p className="mt-2 text-xs text-base-300">
          Note: sometimes FPL requires authentication for 'picks'. If import is
          blocked, use the manual builder.
        </p>
      </Card>
      <div
        className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 md:gap-4"
        style={{ height: "auto", alignItems: "stretch" }}
      >
        <div
          style={{ height: "100%" }}
          className="flex flex-col min-h-0 order-1"
        >
          <Card
            title="Search players"
            titleClassName="title-gradient title-xl"
            className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
            style={{ height: "100%", minHeight: "0" }}
            bodyClassName="flex flex-col h-full min-h-0"
          >
            <div className="grid grid-cols-1 gap-2 text-xs">
              <input
                className="field"
                placeholder="Name…"
                value={q}
                ref={searchInputRef}
                onChange={(e) => setQ(e.target.value)}
              />
              <select
                className="field text-base-100"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="">Team (any)</option>
                {teams.map((t) => (
                  <option key={t.fplId} value={t.fplId}>
                    {t.shortName}
                  </option>
                ))}
              </select>
              <select
                className="field text-base-100"
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value)}
              >
                <option value="">Position (any)</option>
                <option value="1">GK</option>
                <option value="2">DEF</option>
                <option value="3">MID</option>
                <option value="4">FWD</option>
              </select>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  marginTop: "0.75rem",
                  height: "100%",
                }}
              >
                <ul className="space-y-2">
                  {players
                    .filter(
                      (p) =>
                        !posFilter || String(p.position) === String(posFilter)
                    )
                    .map((p) => (
                      <li
                        key={p.fplId}
                        className="rounded-xl p-2 flex items-center justify-between border"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(55,0,60,0.55) 0%, rgba(47,0,51,0.45) 100%), rgba(255,255,255,0.06)",
                          borderColor: "rgba(124,92,255,0.2)",
                        }}
                      >
                        <div className="truncate">
                          <div className="font-medium truncate max-w-[120px]">
                            {p.webName}
                          </div>
                          <div className="text-xs text-base-300 truncate">
                            {["", "GK", "DEF", "MID", "FWD"][p.position] ||
                              p.position}{" "}
                            ·{" "}
                            {teams.find((t) => t.fplId === p.team)?.shortName ||
                              p.team}{" "}
                            · £{(p.nowCost / 10).toFixed(1)}
                          </div>
                        </div>
                        <button
                          onClick={() => addToSquad(p)}
                          className="btn btn-primary px-3 py-1.5 text-white shadow-lg transition-all duration-200"
                          style={{
                            background:
                              "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)",
                            border: "1px solid rgba(124,92,255,0.35)",
                          }}
                          onMouseOver={(e) =>
                            (e.currentTarget.style.background =
                              "linear-gradient(90deg, #00d5c4 0%, #7c5cff 100%)")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.background =
                              "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)")
                          }
                        >
                          Add
                        </button>
                      </li>
                    ))}
                  {!players.length && (
                    <li className="text-xs text-base-400 italic">
                      No results.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Card>
        </div>
        <div className="flex flex-col h-full min-w-0 order-2">
          <Card
            title={`My Squad (${activeSquad.players.length}/15)`}
            titleClassName="title-gradient title-xl"
            className="flex-1 flex flex-col min-w-0"
            bodyClassName="flex flex-col min-h-0"
            actions={
              <div className="flex items-center gap-2">
                <button onClick={onClear} className="btn">
                  Clear
                </button>
                {settingsActions}
              </div>
            }
            footer={
              <span>
                Total cost £
                {(
                  activeSquad.players.reduce(
                    (s, p) => s + (p.nowCost || 0),
                    0
                  ) / 10
                ).toFixed(1)}
                m
              </span>
            }
            style={{
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="grid sm:grid-cols-3 gap-2 text-sm mb-3">
              <label className="flex items-center gap-2">
                <span className="w-24 text-base-300">From GW</span>
                <input
                  type="number"
                  min={1}
                  max={38}
                  value={fromGw}
                  onChange={(e) => setFromGw(+e.target.value || 1)}
                  className="field w-24"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-24 text-base-300"># GWs</span>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={count}
                  onChange={(e) => setCount(+e.target.value || 1)}
                  className="field w-24"
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

            <div className="overflow-x-auto w-full">
              <table
                className="text-sm"
                style={{
                  width: "100%",
                  tableLayout: "fixed",
                  minWidth: `${Math.max(
                    640,
                    PLAYER_COL_PX + INFO_COL_PX + gwList.length * 72
                  )}px`,
                }}
              >
                <thead>
                  <tr className="bg-white/5">
                    <th
                      className="sticky z-30 bg-white/5 text-left sticky-sep"
                      style={{
                        left: 0,
                        width: PLAYER_COL_PX,
                        minWidth: PLAYER_COL_PX,
                        maxWidth: PLAYER_COL_PX,
                      }}
                    >
                      <div className="p-2">Player</div>
                    </th>
                    <th
                      className="sticky z-30 bg-white/5 text-left sticky-sep"
                      style={{
                        left: PLAYER_COL_PX,
                        width: INFO_COL_PX,
                        minWidth: INFO_COL_PX,
                        maxWidth: INFO_COL_PX,
                      }}
                    >
                      <div className="p-2">Info</div>
                    </th>
                    {gwList.map((gw) => (
                      <th
                        key={gw}
                        className="text-center p-2"
                        style={{
                          width: `calc((100% - ${
                            PLAYER_COL_PX + INFO_COL_PX
                          }px) / ${Math.max(gwList.length, 1)})`,
                          minWidth: 72,
                        }}
                      >
                        GW {gw}
                        <div className="mt-1 text-xs text-brand-400 font-bold">
                          {lineups[gw]?.length || 0}/11
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["GK", "DEF", "MID", "FWD"].map((label, posIdx) => {
                    const posCode = posIdx + 1;
                    const group = squadWithTransfers
                      .map((obj, idx) => ({ ...obj, idx }))
                      .filter((obj) => obj.initial.position === posCode);
                    if (!group.length) return null;
                    return (
                      <React.Fragment key={label}>
                        <tr>
                          <td colSpan={2 + gwList.length} className="py-2">
                            <div className="text-xs uppercase tracking-wide text-brand-400 font-bold pl-2">
                              {label}
                            </div>
                          </td>
                        </tr>
                        {group.map((obj, idx) => {
                          let playerByGw = [];
                          let lastPlayer = obj.initial;
                          let transferPointer = 0;
                          for (let i = 0; i < gwList.length; i++) {
                            const gw = gwList[i];
                            while (
                              obj.transfers[transferPointer] &&
                              obj.transfers[transferPointer].gw === gw
                            ) {
                              lastPlayer =
                                obj.transfers[transferPointer].player;
                              transferPointer++;
                            }
                            playerByGw.push(lastPlayer);
                          }
                          const playerNames = [
                            obj.initial.webName,
                            ...obj.transfers.map((t) => t.player.webName),
                          ].join(" / ");

                          return (
                            <tr
                              key={obj.initial.fplId + "-" + idx}
                              className="border-b border-white/10"
                              style={{
                                borderTop:
                                  idx === 0 ? "2px solid #7c5cff44" : undefined,
                                background:
                                  idx % 2 === 0
                                    ? "rgba(20,22,34,0.03)"
                                    : "transparent",
                              }}
                            >
                              <td
                                className="sticky z-20 font-medium whitespace-nowrap sticky-sep"
                                style={{
                                  left: 0,
                                  width: PLAYER_COL_PX,
                                  minWidth: PLAYER_COL_PX,
                                  maxWidth: PLAYER_COL_PX,
                                  background:
                                    idx % 2 === 0
                                      ? "rgba(20,22,34,0.03)"
                                      : "transparent",
                                }}
                              >
                                <div className="p-2 flex items-center gap-2">
                                  <span
                                    className="truncate max-w-[180px]"
                                    title={playerNames}
                                  >
                                    {playerNames}
                                  </span>
                                  {obj.transfers.length > 0 && (
                                    <button
                                      className="btn btn-ghost p-1 shrink-0"
                                      title="Undo last transfer"
                                      aria-label="Undo last transfer"
                                      onClick={() =>
                                        cancelLastTransferFor(obj.idx)
                                      }
                                    >
                                      <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <path
                                          d="M9 14l-4-4 4-4"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M5 10h8a6 6 0 010 12h-3"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      removeFromSquad(obj.initial.fplId)
                                    }
                                    className="btn px-2 py-1 text-xs shrink-0"
                                  >
                                    ✕
                                  </button>
                                  <button
                                    className="btn btn-primary px-2 py-1 text-xs shrink-0 text-white shadow-lg transition-all duration-200"
                                    style={{
                                      background:
                                        "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)",
                                      border: "1px solid rgba(124,92,255,0.35)",
                                    }}
                                    onMouseOver={(e) =>
                                      (e.currentTarget.style.background =
                                        "linear-gradient(90deg, #00d5c4 0%, #7c5cff 100%)")
                                    }
                                    onMouseOut={(e) =>
                                      (e.currentTarget.style.background =
                                        "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)")
                                    }
                                    onClick={() => startTransfer(obj.idx)}
                                    title="Plan transfer"
                                    aria-label="Plan transfer"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 512 512"
                                      width="14"
                                      height="14"
                                      fill="white"
                                      aria-hidden="true"
                                    >
                                      <path d="M256 32c-66.3 0-127.1 26.9-171 70.3l-29.4-29.4C48.4 66.7 32 73.6 32 88v112c0 8.8 7.2 16 16 16h112c14.4 0 21.3-16.4 11.3-26.6L138 160.1C168.2 129.1 210.1 112 256 112c79.5 0 144 64.5 144 144 0 14.7 11.9 26.6 26.6 26.6S453.3 270.7 453.3 256C453.3 136.5 371.5 32 256 32zM464 296H352c-14.4 0-21.3 16.4-11.3 26.6l33.3 33.3C343.8 382.9 301.9 400 256 400c-79.5 0-144-64.5-144-144 0-14.7-11.9-26.6-26.6-26.6S58.7 241.3 58.7 256C58.7 375.5 140.5 480 256 480c66.3 0 127.1-26.9 171-70.3l29.4 29.4c7.2 7.2 23.6.3 23.6-14.1V312c0-8.8-7.2-16-16-16z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                              <td
                                className="sticky z-20 sticky-sep"
                                style={{
                                  left: PLAYER_COL_PX,
                                  width: INFO_COL_PX,
                                  minWidth: INFO_COL_PX,
                                  maxWidth: INFO_COL_PX,
                                  background:
                                    idx % 2 === 0
                                      ? "rgba(20,22,34,0.03)"
                                      : "transparent",
                                }}
                              >
                                <div className="p-2">
                                  {teams.find(
                                    (t) => t.fplId === playerByGw[0].team
                                  )?.shortName || playerByGw[0].team}{" "}
                                  · £{(playerByGw[0].nowCost / 10).toFixed(1)}
                                </div>
                              </td>
                              {gwList.map((gw, gwIdx) => {
                                const p = playerByGw[gwIdx];
                                const tf = buildTeamFixtures(p.team);
                                const c = tf[gwIdx];
                                const isSelected = (lineups[gw] || []).includes(
                                  p.fplId
                                );
                                return (
                                  <td
                                    key={c.gw}
                                    className="p-1 text-center"
                                    style={{ width: gwColWidth, minWidth: 88 }}
                                  >
                                    <div
                                      className={`rounded-md px-2 py-1 font-semibold relative transition cursor-pointer
                                        ${
                                          isSelected
                                            ? "ring-2 ring-brand-600 bg-[#7c5cff22] shadow-[0_0_0_2px_#00d5c4] scale-[1.04]"
                                            : "hover:bg-[#7c5cff11]"
                                        }
                                    `}
                                      style={{
                                        background: c.color,
                                        color: "rgba(10,10,10,0.9)",
                                      }}
                                      onClick={() => toggleLineup(gw, p.fplId)}
                                      title={
                                        isSelected
                                          ? "Starter in this gameweek"
                                          : "Click to select as starter"
                                      }
                                    >
                                      {c.text}
                                      <span
                                        className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                                        aria-hidden="true"
                                      >
                                        <span
                                          className="inline-block rounded-full border-2 transition-all"
                                          style={{
                                            width: 12,
                                            height: 12,
                                            borderColor: "#7c5cff",
                                            backgroundColor: isSelected
                                              ? "#7c5cff"
                                              : "#ffffff",
                                          }}
                                        />
                                      </span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          {showTransfer && (
            <Card
              className="my-4"
              title="Transfer player (choose GW and replacement)"
              titleClassName="title-gradient title-xl"
              actions={
                <button
                  className="btn btn-primary text-white shadow-lg transition-all duration-200"
                  style={{
                    background:
                      "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)",
                    border: "1px solid rgba(124,92,255,0.35)",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(90deg, #00d5c4 0%, #7c5cff 100%)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background =
                      "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)")
                  }
                  onClick={() => {
                    setTransferIdx(null);
                    setTransferGw("");
                    setShowTransfer(false);
                  }}
                >
                  ✕
                </button>
              }
            >
              <div className="mb-3 flex items-center gap-2">
                <label className="mr-2">GW:</label>
                <select
                  value={transferGw}
                  onChange={(e) => setTransferGw(e.target.value)}
                  className="field text-base-100"
                >
                  {gwList.map((gw) => (
                    <option
                      key={gw}
                      value={gw}
                      className="bg-base-900 text-base-100"
                    >
                      {gw}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {players
                  .filter(
                    (p) =>
                      (!posFilter ||
                        String(p.position) === String(posFilter)) &&
                      (!teamFilter || String(p.team) === String(teamFilter))
                  )
                  .map((p) => (
                    <button
                      key={p.fplId}
                      className="btn w-full flex justify-between items-center"
                      onClick={() => confirmTransfer(p)}
                    >
                      <span>{p.webName}</span>
                      <span className="text-xs text-white">
                        {teams.find((t) => t.fplId === p.team)?.shortName ||
                          p.team}{" "}
                        · £{(p.nowCost / 10).toFixed(1)}
                      </span>
                    </button>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
