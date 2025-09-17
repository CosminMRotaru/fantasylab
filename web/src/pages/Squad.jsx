import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Card from "../components/Card.jsx";
import {
  loadSquads,
  saveSquads,
  deleteSquad,
  loadActiveSquadId,
  saveActiveSquadId,
  loadFixturesSettings,
  loadSquadFixSettings,
  saveSquadFixSettings,
  resetSquadFixSettings,
  loadRatingsPresets,
  loadActiveRatingsPresetId,
  loadUserSquads,
  saveUserSquads,
  loadUserActiveSquadId,
  saveUserActiveSquadId,
  migrateGlobalSquadsToUser,
  purgeGlobalSquadsIfMigrated,
  loadLineupsForSquad,
  saveLineupsForSquad,
  loadTransfersForSquad,
  saveTransfersForSquad,
} from "../lib/storage.js";
import { isLoggedIn, saveState, loadState, getUser } from "../lib/auth.js";
import {
  computeDifficultyFromRatings,
  shadeIndexToColor,
  computeFixtureCellColor,
} from "../lib/fdr.js";
import { deriveDefaultRatingsFull } from "../lib/ratingsDefaults.js";

function parseEntryId(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const m = trimmed.match(/entry\/(\d+)/i);
  if (m) return m[1];
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

const API = import.meta.env.VITE_API_BASE || "/api";

const useResponsiveColumns = () => {
  const calc = (w) => {
    if (w <= 450) {
      return { PLAYER_COL_PX: 130, INFO_COL_PX: 48 };
    }
    if (w <= 640) {
      return { PLAYER_COL_PX: 160, INFO_COL_PX: 60 };
    }
    return { PLAYER_COL_PX: 220, INFO_COL_PX: 84 };
  };
  const [dims, setDims] = useState(() => calc(window.innerWidth));
  useEffect(() => {
    const onR = () => setDims(calc(window.innerWidth));
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return dims;
};

export default function Squad() {
  const location = useLocation();
  const IS_AUTH = isLoggedIn();
  const user = getUser();
  useEffect(() => {
    if (IS_AUTH && user?.id) {
      migrateGlobalSquadsToUser(user.id);
      purgeGlobalSquadsIfMigrated();
    } else {
      purgeGlobalSquadsIfMigrated();
    }
  }, [IS_AUTH, user?.id]);

  useEffect(() => {
    if (IS_AUTH) {
      if (user?.id) {
        const us = loadUserSquads(user.id) || [];
        setSquads(us);
        const aid = loadUserActiveSquadId(user.id) || (us[0]?.id ?? null);
        setActiveSquadId(aid);
        if (aid) {
          setLineups(loadLineupsForSquad(aid, user.id));
          setTransfers(loadTransfersForSquad(aid, user.id));
        } else {
          setLineups({});
          setTransfers([]);
        }
      }
    } else {
      setSquads([]);
      setActiveSquadId(null);
      setLineups({});
      setTransfers([]);
    }
  }, [IS_AUTH, user?.id]);

  useEffect(() => {
    if (!IS_AUTH || !user?.id) return;
    try {
      const userSquads = loadUserSquads(user.id) || [];
      for (const sq of userSquads) {
        if (!sq?.id) continue;
        const legacyL = localStorage.getItem(`lineups_${sq.id}`);
        const namespacedL = localStorage.getItem(`lineups_${user.id}_${sq.id}`);
        if (legacyL && !namespacedL) {
          localStorage.setItem(`lineups_${user.id}_${sq.id}`, legacyL);
        }
        const legacyT = localStorage.getItem(`transfers_${sq.id}`);
        const namespacedT = localStorage.getItem(
          `transfers_${user.id}_${sq.id}`
        );
        if (legacyT && !namespacedT) {
          localStorage.setItem(`transfers_${user.id}_${sq.id}`, legacyT);
        }
      }
    } catch {}
  }, [IS_AUTH, user?.id]);
  const [squads, setSquads] = useState(() => {
    if (!IS_AUTH) {
      if (localStorage.getItem("fantasylab_guest_migrated") === "1") {
        return [];
      }
      return loadSquads();
    }
    return loadUserSquads(user?.id) || [];
  });
  const [activeSquadId, setActiveSquadId] = useState(() => {
    if (!IS_AUTH) {
      if (localStorage.getItem("fantasylab_guest_migrated") === "1") {
        return null;
      }
      return loadActiveSquadId() || (squads[0]?.id ?? null);
    }
    return loadUserActiveSquadId(user?.id) || (squads[0]?.id ?? null);
  });
  const activeSquad = squads.find((s) => s.id === activeSquadId) ||
    squads[0] || { players: [] };
  const { PLAYER_COL_PX, INFO_COL_PX } = useResponsiveColumns();
  const [teams, setTeams] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const { homeW = 1, awayW = 1, oppW = 1 } = loadFixturesSettings();
  const [ratingsMap, setRatingsMap] = useState({});
  const [activePresetId, setActivePresetId] = useState(
    () => loadActiveRatingsPresetId() || "default"
  );
  const init = loadSquadFixSettings();
  const [fromGw, setFromGw] = useState(init.fromGw);
  const [count, setCount] = useState(init.count);
  useEffect(() => {
    saveSquadFixSettings({ fromGw, count });
  }, [fromGw, count]);
  const [entryInput, setEntryInput] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [q, setQ] = useState("");
  const searchInputRef = useRef(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [players, setPlayers] = useState([]);
  const hasFilter = !!(q.trim() || teamFilter || posFilter);
  const [transferIdx, setTransferIdx] = useState(null);
  const [transferGw, setTransferGw] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSquadMenu, setShowSquadMenu] = useState(false);
  const squadMenuRef = useRef(null);
  const matrixRef = useRef(null);
  const [authPrompt, setAuthPrompt] = useState("");
  function requireAuth(actionLabel = "this feature") {
    setAuthPrompt(`Please sign in to use ${actionLabel}.`);
    setTimeout(() => setAuthPrompt(""), 3500);
  }
  const [matrixHeight, setMatrixHeight] = useState(null);
  useEffect(() => {
    if (!matrixRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.contentRect?.height) setMatrixHeight(e.contentRect.height);
      }
    });
    ro.observe(matrixRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function refreshRatings() {
      const id = loadActiveRatingsPresetId() || "default";
      setActivePresetId(id);
      if (id === "default") {
        try {
          const base = deriveDefaultRatingsFull
            ? deriveDefaultRatingsFull(teams)
            : {};
          setRatingsMap(base);
        } catch {
          setRatingsMap({});
        }
      } else {
        const presets = loadRatingsPresets() || [];
        const p = presets.find((x) => x.id === id);
        setRatingsMap(p?.teamRatings || {});
      }
    }
    refreshRatings();
    window.addEventListener("ratings:updated", refreshRatings);
    return () => window.removeEventListener("ratings:updated", refreshRatings);
  }, [teams]);

  useEffect(() => {
    function onRowEdit(e) {
      const { teamId, field, value } = e.detail || {};
      if (!teamId || !field) return;
      setRatingsMap((prev) => {
        const next = { ...prev, [teamId]: { ...prev[teamId], [field]: value } };
        if (activePresetId !== "default") {
          try {
            const presets = loadRatingsPresets() || [];
            const idx = presets.findIndex((p) => p.id === activePresetId);
            if (idx >= 0) {
              presets[idx] = { ...presets[idx], teamRatings: next };
              localStorage.setItem("ratingsPresets", JSON.stringify(presets));
            }
          } catch {}
        }
        return next;
      });
    }
    window.addEventListener("ratings:rowEdit", onRowEdit);
    return () => window.removeEventListener("ratings:rowEdit", onRowEdit);
  }, [activePresetId]);
  useEffect(() => {
    function onDocClick(e) {
      if (
        showSquadMenu &&
        squadMenuRef.current &&
        !squadMenuRef.current.contains(e.target)
      ) {
        setShowSquadMenu(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showSquadMenu]);
  const [hydrated, setHydrated] = useState(!IS_AUTH);

  const [lineups, setLineups] = useState(() =>
    activeSquadId
      ? loadLineupsForSquad(activeSquadId, IS_AUTH ? user?.id : null)
      : {}
  );
  const [transfers, setTransfers] = useState(() =>
    activeSquadId
      ? loadTransfersForSquad(activeSquadId, IS_AUTH ? user?.id : null)
      : []
  );
  useEffect(() => {
    if (!activeSquadId) return;
    setLineups(loadLineupsForSquad(activeSquadId, IS_AUTH ? user?.id : null));
    setTransfers(
      loadTransfersForSquad(activeSquadId, IS_AUTH ? user?.id : null)
    );
  }, [activeSquadId, IS_AUTH, user?.id]);
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
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 0);
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

  function createSquad(name) {
    if (!IS_AUTH) {
      requireAuth("creating a squad");
      return;
    }
    const id = Date.now().toString();
    const newSquad = { id, name, players: [] };
    const next = [...squads, newSquad];
    setSquads(next);
    if (IS_AUTH && user?.id) saveUserSquads(user.id, next);
    setActiveSquadId(id);
    if (IS_AUTH && user?.id) saveUserActiveSquadId(user.id, id);
  }
  function selectSquad(id) {
    setActiveSquadId(id);
    if (IS_AUTH && user?.id) saveUserActiveSquadId(user.id, id);
    else saveActiveSquadId(id);
  }
  function ensureActiveSquad() {
    if (!activeSquadId || !squads.length) {
      const id = Date.now().toString();
      const base = { id, name: "My Team", players: [] };
      const next = [base];
      setSquads(next);
      if (IS_AUTH && user?.id) saveUserSquads(user.id, next);
      else saveSquads(next);
      setActiveSquadId(id);
      if (IS_AUTH && user?.id) saveUserActiveSquadId(user.id, id);
      else saveActiveSquadId(id);
      return id;
    }
    return activeSquadId;
  }
  function addToSquad(p) {
    const id = ensureActiveSquad();
    setSquads((prev) =>
      prev.map((s) =>
        s.id === id
          ? s.players.find((pl) => pl.fplId === p.fplId) ||
            s.players.length >= 15
            ? s
            : { ...s, players: [...s.players, p] }
          : s
      )
    );
    const updated = (
      IS_AUTH && user?.id ? loadUserSquads(user.id) : loadSquads()
    ).map((s) =>
      s.id === id
        ? s.players.find((pl) => pl.fplId === p.fplId) || s.players.length >= 15
          ? s
          : { ...s, players: [...s.players, p] }
        : s
    );
    if (IS_AUTH && user?.id) saveUserSquads(user.id, updated);
    else saveSquads(updated);
  }
  function removeFromSquad(id) {
    const playerIndex = activeSquad.players.findIndex((p) => p.fplId === id);

    const nextSquads = squads.map((s) =>
      s.id === activeSquadId
        ? { ...s, players: s.players.filter((p) => p.fplId !== id) }
        : s
    );
    setSquads(nextSquads);
    if (IS_AUTH && user?.id) saveUserSquads(user.id, nextSquads);
    else saveSquads(nextSquads);

    if (playerIndex >= 0) {
      const nextTransfers = [...transfers];
      nextTransfers.splice(playerIndex, 1);
      setTransfers(nextTransfers);
      saveTransfersForSquad(
        activeSquadId,
        nextTransfers,
        IS_AUTH ? user?.id : null
      );
    }

    cleanupLineupsForRemovedPlayer(id);
  }
  function onClear() {
    const nextSquads = squads.map((s) =>
      s.id === activeSquadId ? { ...s, players: [] } : s
    );
    setSquads(nextSquads);
    if (IS_AUTH && user?.id) saveUserSquads(user.id, nextSquads);
    else saveSquads(nextSquads);

    const emptyTransfers = [];
    setTransfers(emptyTransfers);
    saveTransfersForSquad(
      activeSquadId,
      emptyTransfers,
      IS_AUTH ? user?.id : null
    );

    const emptyLineups = {};
    setLineups(emptyLineups);
    saveLineupsForSquad(activeSquadId, emptyLineups, IS_AUTH ? user?.id : null);
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
      if (IS_AUTH && user?.id) saveUserSquads(user.id, nextSquads);
      else saveSquads(nextSquads);
      setImportMsg(`Imported GW${data.gw} picks for entry ${data.entryId}.`);
    } catch {
      setImportMsg("Import failed.");
    }
  }

  const gwList = useMemo(() => {
    const start = fromGw;
    return Array.from({ length: Math.max(0, count) }, (_, i) => start + i);
  }, [fromGw, count, deadlines]);

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
    const arr = [];
    for (const gw of gwList) {
      const fixtures = fixturesByGw[gw] || [];
      const f = fixtures.find(
        (fx) => fx.homeTeam === teamId || fx.awayTeam === teamId
      );
      if (!f) {
        const teamRating = ratingsMap[teamId] || { attack: 1.5, defense: 1.5 };
        arr.push({
          gw,
          text: "—",
          score: 1,
          isHome: false,
          oppId: null,
          color: shadeIndexToColor(4),
          teamAttack: teamRating.attack,
          teamDefense: teamRating.defense,
          oppAttack: 1.5,
          oppDefense: 1.5,
          teamName: teamMap.get(teamId)?.name || teamId,
          oppName: "No opponent",
        });
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
        homeBias: 0.99,
        awayBias: 0.88,
      });

      const defensiveScore = computeDifficultyFromRatings({
        attackA: teamDefense,
        defenseB: oppAttack,
        isHome,
        homeBias: 0.99,
        awayBias: 0.88,
      });

      const averageScore = (offensiveScore + defensiveScore) / 2;
      const invertedScore = 6 - averageScore;
      const code = opp?.shortName || String(oppId);
      const text = isHome ? code.toUpperCase() : code.toLowerCase();
      const teamRating = ratingsMap[teamId] || { attack: 1.5, defense: 1.5 };
      const oppRating = ratingsMap[oppId] || { attack: 1.5, defense: 1.5 };
      const color = computeFixtureCellColor({
        teamName: teamMap.get(teamId)?.name || teamId,
        oppName: opp?.name || text,
        isHome: !!isHome,
        teamAttack: teamRating.attack,
        teamDefense: teamRating.defense,
        oppAttack: oppRating.attack,
        oppDefense: oppRating.defense,
      });
      arr.push({
        gw,
        text,
        score: invertedScore,
        isHome,
        oppId,
        color,
        teamAttack: teamRating.attack,
        teamDefense: teamRating.defense,
        oppAttack: oppRating.attack,
        oppDefense: oppRating.defense,
        teamName: teamMap.get(teamId)?.name || teamId,
        oppName: opp?.name || text,
      });
    }
    return arr;
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
          resetSquadFixSettings();
          const d = loadSquadFixSettings();
          setFromGw(d.fromGw);
          setCount(d.count);
        }}
      >
        Reset
      </button>
    </div>
  );

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
      saveLineupsForSquad(activeSquadId, updated, IS_AUTH ? user?.id : null);
      return updated;
    });
  }
  function startTransfer(idx) {
    setTransferIdx(idx);
    setTransferGw(gwList[0]);
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
    saveTransfersForSquad(
      activeSquadId,
      prevTransfers,
      IS_AUTH ? user?.id : null
    );
    setTransferIdx(null);
    setTransferGw("");
  }
  function cancelLastTransferFor(idx) {
    setTransfers((prev) => {
      const next = prev.map((arr) => (arr ? [...arr] : []));
      if (next[idx] && next[idx].length) next[idx].pop();
      saveTransfersForSquad(activeSquadId, next, IS_AUTH ? user?.id : null);
      return next;
    });
  }
  function cancelTransferFlow() {
    setTransferIdx(null);
    setTransferGw("");
  }
  const squadWithTransfers = useMemo(() => {
    return (activeSquad.players || []).map((p, idx) => {
      const playerTransfers = (transfers[idx] || []).sort(
        (a, b) => a.gw - b.gw
      );
      return { initial: p, transfers: playerTransfers };
    });
  }, [activeSquad.players, transfers]);
  const stateToPersist = useMemo(
    () => ({
      squads,
      activeSquadId,
      squadFixSettings: { fromGw, count },
      lineups,
      transfers,
    }),
    [squads, activeSquadId, fromGw, count, lineups, transfers]
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

  function cleanupLineupsForRemovedPlayer(removedPlayerId) {
    setLineups((prev) => {
      const cleaned = {};
      let hasChanges = false;

      for (const [gw, lineup] of Object.entries(prev)) {
        const filtered = lineup.filter(
          (playerId) => playerId !== removedPlayerId
        );

        if (filtered.length > 0) {
          cleaned[gw] = filtered;
        }

        if (filtered.length !== lineup.length) {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        saveLineupsForSquad(activeSquadId, cleaned, IS_AUTH ? user?.id : null);
      }

      return cleaned;
    });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {authPrompt && (
        <div
          className="rounded-md px-3 py-2 text-[13px] font-medium flex items-center gap-2"
          style={{
            background:
              "linear-gradient(90deg, rgba(124,92,255,0.25) 0%, rgba(0,213,196,0.25) 100%)",
            border: "1px solid rgba(124,92,255,0.35)",
            boxShadow:
              "0 0 0 1px rgba(0,213,196,0.15) inset, 0 2px 6px -2px rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              width: 18,
              height: 18,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              background: "linear-gradient(90deg,#7c5cff,#00d5c4)",
              color: "#0b0120",
              borderRadius: "50%",
              fontWeight: 600,
              boxShadow: "0 0 4px rgba(124,92,255,0.6)",
            }}
          >
            !
          </span>
          <span>{authPrompt}</span>
        </div>
      )}
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        <div className="relative" ref={squadMenuRef}>
          <div className="pos-select relative" style={{ minWidth: 160 }}>
            <button
              type="button"
              className="field w-full flex items-center justify-between gap-2 !pr-2 cursor-pointer select-none h-10"
              onClick={() => setShowSquadMenu((s) => !s)}
              aria-haspopup="listbox"
              aria-expanded={showSquadMenu}
              title="Choose or delete squad"
            >
              <span className="truncate text-xs md:text-sm max-w-[180px]">
                {squads.find((s) => s.id === activeSquadId)?.name ||
                  squads[0]?.name ||
                  "No squad"}
              </span>
              <span
                className={`transition-transform text-[10px] ${
                  showSquadMenu ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>
            {showSquadMenu && (
              <ul
                className="pos-menu absolute z-40 mt-1 w-full rounded-lg shadow-xl overflow-hidden"
                role="listbox"
                aria-label="Select squad"
                style={{ maxHeight: 320, overflowY: "auto" }}
              >
                {squads.length === 0 && (
                  <li className="pos-option px-2 py-1.5 text-xs md:text-sm">
                    No squads
                  </li>
                )}
                {squads.map((s) => {
                  const active = s.id === activeSquadId;
                  return (
                    <li
                      key={s.id}
                      role="option"
                      aria-selected={active}
                      className={`pos-option px-2 py-1.5 text-xs md:text-sm flex items-center justify-between gap-2 cursor-pointer ${
                        active ? "is-active" : ""
                      }`}
                      onClick={() => {
                        selectSquad(s.id);
                        setShowSquadMenu(false);
                      }}
                    >
                      <span className="truncate pr-1 max-w-[130px]">
                        {s.name}
                      </span>
                      <span className="flex items-center gap-1">
                        {active && (
                          <span className="text-brand-300 text-[10px]">●</span>
                        )}
                        <button
                          className="btn px-1 py-0.5 text-[10px]"
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
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={38}
                value={fromGw}
                onChange={(e) => setFromGw(+e.target.value || 1)}
                className="field w-24"
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
                max={15}
                value={count}
                onChange={(e) => setCount(+e.target.value || 1)}
                className="field w-24"
              />
              <div className="numeric-arrows">
                <button
                  type="button"
                  aria-label="Increase number of gameweeks"
                  onClick={() =>
                    setCount((v) => Math.min(15, (Number(v) || 1) + 1))
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
        <div className="overflow-x-auto">
          <table
            className="text-sm squad-matrix"
            style={{
              width: "100%",
              tableLayout: "fixed",
              minWidth: `${Math.max(
                560,
                PLAYER_COL_PX + INFO_COL_PX + gwList.length * 60
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
                  className="sticky z-30 bg-white/5 text-left sticky-sep info-col"
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
                      minWidth: 60,
                    }}
                  >
                    GW {gw}
                    {lineups[gw] && lineups[gw].length > 0 && (
                      <div className="mt-1 text-xs text-brand-400 font-bold">
                        {lineups[gw].length}/11
                      </div>
                    )}
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
                      const rawTransfers =
                        origIdx >= 0 ? transfers[origIdx] || [] : [];
                      const playerTransfers = [...rawTransfers].sort(
                        (a, b) => a.gw - b.gw
                      );
                      const lastIncoming =
                        playerTransfers[playerTransfers.length - 1]?.player ||
                        null;
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
                      const sortedTransfers = playerTransfers;
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
                                    <span className="opacity-50"> / </span>
                                    <span className="text-brand-300">
                                      {lastIncoming.webName}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                              <div className="ml-auto flex items-center gap-2">
                                <button
                                  onClick={() => removeFromSquad(p.fplId)}
                                  className="btn px-2 py-1 text-xs shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </td>
                          <td
                            className="sticky z-20 sticky-sep info-col"
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
                            const hasTransferAtGw = sortedTransfers.some(
                              (t) => t.gw === gw
                            );
                            return (
                              <td
                                key={c.gw}
                                className="p-1 text-center"
                                style={{
                                  width: `calc((100% - ${
                                    PLAYER_COL_PX + INFO_COL_PX
                                  }px) / ${Math.max(gwList.length, 1)})`,
                                  minWidth: 64,
                                }}
                              >
                                <div
                                  className={`gw-cell rounded-md px-2 py-1 font-semibold relative transition cursor-pointer ${
                                    isSelected
                                      ? "ring-2 ring-brand-600 bg-[#7c5cff22] shadow-[0_0_0_2px_#00d5c4] scale-[1.04]"
                                      : "hover:bg-[#7c5cff11]"
                                  }`}
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
                                      className="gw-transfer-icon absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none"
                                      title={`Transfer GW ${gw}`}
                                      aria-hidden="true"
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        width="16"
                                        height="16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        style={{
                                          filter:
                                            "drop-shadow(0 0 2px rgba(124,92,255,0.55)) drop-shadow(0 0 4px rgba(124,92,255,0.35))",
                                        }}
                                      >
                                        <defs>
                                          <linearGradient
                                            id="transferStrokeA"
                                            x1="0"
                                            y1="0"
                                            x2="24"
                                            y2="24"
                                            gradientUnits="userSpaceOnUse"
                                          >
                                            <stop
                                              offset="0%"
                                              stopColor="#9a7dff"
                                            />
                                            <stop
                                              offset="100%"
                                              stopColor="#6b35ff"
                                            />
                                          </linearGradient>
                                        </defs>
                                        <path
                                          d="M7 9l-3 3m0 0l3 3m-3-3h16m-3 3l3-3m0 0l-3-3"
                                          stroke="url(#transferStrokeA)"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d="M7 9l-3 3m0 0l3 3m-3-3h16m-3 3l3-3m0 0l-3-3"
                                          stroke="#12062e"
                                          strokeOpacity="0.75"
                                          strokeWidth="3.1"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{ mixBlendMode: "normal" }}
                                        />
                                      </svg>
                                    </span>
                                  )}
                                  <span
                                    className="gw-select-dot-wrapper absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                                    aria-hidden="true"
                                  >
                                    <span
                                      className="gw-select-dot inline-block rounded-full border transition-all"
                                      style={{
                                        width: 8,
                                        height: 8,
                                        borderWidth: 2,
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
            className="btn btn-gradient px-5 py-3 text-base shadow-lg"
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
        <div className="flex flex-col min-h-0 order-1">
          <Card
            title="Search players"
            titleClassName="title-gradient title-xl"
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
            style={{
              maxHeight:
                activeSquad.players.length === 0
                  ? "min(60vh, 480px)"
                  : matrixHeight && matrixHeight > 240
                  ? matrixHeight
                  : 420,
              display: "flex",
              flexDirection: "column",
            }}
            bodyClassName="flex flex-col h-full min-h-0"
            actions={
              transferIdx !== null && (
                <div className="relative" style={{ width: 86 }}>
                  <button
                    className="btn text-[11px] leading-none absolute"
                    style={{
                      top: -6,
                      right: 2,
                      width: 24,
                      height: 24,
                      padding: 0,
                      lineHeight: 1,
                      minHeight: "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      background:
                        "linear-gradient(90deg, #7c5cff 0%, #00d5c4 100%)",
                      boxShadow:
                        "0 0 0 1px rgba(255,255,255,0.15), 0 0 4px rgba(0,213,196,0.55), 0 0 10px rgba(124,92,255,0.45)",
                      color: "#0b0120",
                      fontWeight: 600,
                      textShadow: "0 0 2px rgba(255,255,255,0.4)",
                    }}
                    onClick={cancelTransferFlow}
                    title="Cancel transfer"
                    aria-label="Cancel transfer"
                  >
                    ✕
                  </button>
                  <select
                    className="field text-base-100 h-8 px-2 text-xs mt-6"
                    style={{
                      paddingTop: 1,
                      paddingBottom: 1,
                      width: 62,
                      marginLeft: -1,
                    }}
                    value={transferGw}
                    onChange={(e) => setTransferGw(e.target.value)}
                    aria-label="Transfer gameweek"
                  >
                    {gwList.map((gw) => (
                      <option key={gw} value={gw}>
                        {gw}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }
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
            {transferIdx !== null && (
              <div className="mt-2 text-[10px] text-brand-400 text-right">
                Select replacement below
              </div>
            )}
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
                  maxHeight:
                    activeSquad.players.length === 0
                      ? "calc(min(60vh, 480px) - 110px)"
                      : matrixHeight && matrixHeight > 300
                      ? matrixHeight - 110
                      : 320,
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
                          onClick={() =>
                            transferIdx !== null
                              ? confirmTransfer(p)
                              : addToSquad(p)
                          }
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
                          aria-label={
                            transferIdx !== null
                              ? "Confirm transfer"
                              : "Add player"
                          }
                          title={
                            transferIdx !== null
                              ? "Confirm transfer"
                              : "Add player"
                          }
                        >
                          {transferIdx !== null ? "⇄" : "+"}
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
        <div className="flex flex-col h-full min-w-0 order-2" ref={matrixRef}>
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
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={38}
                    value={fromGw}
                    onChange={(e) => setFromGw(+e.target.value || 1)}
                    className="field w-24"
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
                    max={15}
                    value={count}
                    onChange={(e) => setCount(+e.target.value || 1)}
                    className="field w-24"
                  />
                  <div className="numeric-arrows">
                    <button
                      type="button"
                      aria-label="Increase number of gameweeks"
                      onClick={() =>
                        setCount((v) => Math.min(15, (Number(v) || 1) + 1))
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

            <div className="overflow-x-auto w-full">
              <table
                className="text-sm squad-matrix"
                style={{
                  width: "100%",
                  tableLayout: "fixed",
                  minWidth: `${Math.max(
                    560,
                    PLAYER_COL_PX + INFO_COL_PX + gwList.length * 60
                  )}px`,
                }}
              >
                <thead>
                  <tr className="bg-white/5">
                    <th
                      className="sticky z-30 bg-white/5 text-left sticky-sep"
                      style={{
                        left: 0,
                        width: PLAYER_COL_PX + 24,
                        minWidth: PLAYER_COL_PX + 24,
                        maxWidth: PLAYER_COL_PX + 24,
                      }}
                    >
                      <div className="p-2">Player</div>
                    </th>
                    <th
                      className="sticky z-30 bg-white/5 text-left sticky-sep info-col"
                      style={{
                        left: PLAYER_COL_PX + 24,
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
                          minWidth: 60,
                        }}
                      >
                        GW {gw}
                        {lineups[gw] && lineups[gw].length > 0 && (
                          <div className="mt-1 text-xs text-brand-400 font-bold">
                            {lineups[gw].length}/11
                          </div>
                        )}
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
                                  width: PLAYER_COL_PX + 24,
                                  minWidth: PLAYER_COL_PX + 24,
                                  maxWidth: PLAYER_COL_PX + 24,
                                  background:
                                    idx % 2 === 0
                                      ? "rgba(20,22,34,0.03)"
                                      : "transparent",
                                }}
                              >
                                <div className="p-2 flex items-center gap-2">
                                  <span
                                    className="truncate max-w-[210px]"
                                    title={playerNames}
                                  >
                                    {playerNames}
                                  </span>
                                  <div className="ml-auto flex items-center gap-2">
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
                                        border:
                                          "1px solid rgba(124,92,255,0.35)",
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
                                        <path d="M256 32c-66.3 0-127.1 26.9-171 70.3l-29.4-29.4C48.4 66.7 32 73.6 32 88v112c0 8.8 7.2 16 16 16h112c14.4 0 21.3-16.4 11.3-26.6L138 160.1C168.2 129.1 210.1 112 256 112c79.5 0 144 64.5 144 144 0 14.7 11.9 26.6 26.6 26.6S453.3 270.7 453.3 256C453.3 136.5 371.5 32 256 32zM464 296H352c-14.4 0-21.3 16.4-11.3 26.6l33.3 33.3C343.8 382.9 301.9 400 256 400c-79.5 0-144-64.5-144-144 0-14.7 11.9-26.6 26.6-26.6S58.7 241.3 58.7 256C58.7 375.5 140.5 480 256 480c66.3 0 127.1-26.9 171-70.3l29.4 29.4c7.2 7.2 23.6.3 23.6-14.1V312c0-8.8-7.2-16-16-16z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td
                                className="sticky z-20 sticky-sep info-col"
                                style={{
                                  left: PLAYER_COL_PX + 24,
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
                                    style={{ width: gwColWidth, minWidth: 64 }}
                                  >
                                    <div
                                      className={`gw-cell rounded-md px-2 py-1 font-semibold relative transition cursor-pointer
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
                                        className="gw-select-dot-wrapper absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                                        aria-hidden="true"
                                      >
                                        <span
                                          className="gw-select-dot inline-block rounded-full border transition-all"
                                          style={{
                                            width: 8,
                                            height: 8,
                                            borderWidth: 2,
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
        </div>
      </div>
    </div>
  );
}
