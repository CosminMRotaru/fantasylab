const __DEV__ =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.DEV) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV !== "production");
function __warn(ctx, err) {
  if (__DEV__) {
  }
}

const SQUAD_KEY = "fantasylab_squad_v1";
export function saveSquad(list) {
  localStorage.setItem(SQUAD_KEY, JSON.stringify(list || []));
}

export function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return Object.assign({}, fallback, JSON.parse(raw));
  } catch (e) {
    __warn(`getJSON:${key}`, e);
    return fallback;
  }
}
export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    __warn(`setJSON:${key}`, e);
  }
}

import { LS_KEYS } from "../constants/storageKeys.js";
import { makeLineupsKey, makeTransfersKey } from "../constants/storageKeys.js";
const FIXTURES_SETTINGS_KEY = LS_KEYS.fixturesSettings;
export function loadFixturesSettings(userId) {
  const key = userId
    ? userKey(userId, "fixtures_settings")
    : FIXTURES_SETTINGS_KEY;
  return getJSON(key, {
    fromGw: 4,
    count: 6,
    sortBy: "alpha",
    sortDir: "asc",
    homeW: 1.0,
    awayW: 1.0,
    oppW: 1.0,
  });
}
export function saveFixturesSettings(settings, userId) {
  const key = userId
    ? userKey(userId, "fixtures_settings")
    : FIXTURES_SETTINGS_KEY;
  setJSON(key, settings);
}
export function resetFixturesSettings(userId) {
  const key = userId
    ? userKey(userId, "fixtures_settings")
    : FIXTURES_SETTINGS_KEY;
  localStorage.removeItem(key);
}

const SQUAD_FIX_SETTINGS_KEY = LS_KEYS.squadFixSettings;
export function loadSquadFixSettings() {
  return getJSON(SQUAD_FIX_SETTINGS_KEY, {
    fromGw: 1,
    count: 5,
  });
}
export function saveSquadFixSettings(s) {
  setJSON(SQUAD_FIX_SETTINGS_KEY, s);
}
export function resetSquadFixSettings() {
  localStorage.removeItem(SQUAD_FIX_SETTINGS_KEY);
}

export function loadSquads() {
  return JSON.parse(localStorage.getItem(LS_KEYS.squadsGlobal) || "[]");
}
export function saveSquads(squads) {
  localStorage.setItem(LS_KEYS.squadsGlobal, JSON.stringify(squads));
}
function userKey(userId, base) {
  return `fantasylab_${base}_${userId}`;
}
export function loadUserSquads(userId) {
  if (!userId) return [];
  try {
    return JSON.parse(localStorage.getItem(userKey(userId, "squads")) || "[]");
  } catch (e) {
    __warn("loadUserSquads", e);
    return [];
  }
}
export function saveUserSquads(userId, squads) {
  if (!userId) return;
  localStorage.setItem(userKey(userId, "squads"), JSON.stringify(squads || []));
}
export function loadUserActiveSquadId(userId) {
  if (!userId) return null;
  return localStorage.getItem(userKey(userId, "activeSquadId")) || null;
}
export function saveUserActiveSquadId(userId, id) {
  if (!userId) return;
  localStorage.setItem(userKey(userId, "activeSquadId"), id);
}
export function migrateGlobalSquadsToUser(userId) {
  if (!userId) return;
  const global = loadSquads();
  if (global && global.length && !loadUserSquads(userId).length) {
    saveUserSquads(userId, global);
    const act = loadActiveSquadId();
    if (act) saveUserActiveSquadId(userId, act);
    try {
      localStorage.removeItem("squads");
      localStorage.removeItem("activeSquadId");
      localStorage.removeItem(LS_KEYS.squadsGlobal);
      localStorage.removeItem(LS_KEYS.activeSquadGlobal);
      localStorage.setItem("fantasylab_guest_migrated", "1");
    } catch (e) {
      __warn("migrateGlobalSquadsToUser:cleanup", e);
    }
  }
}

export function purgeGlobalSquadsIfMigrated() {
  try {
    if (localStorage.getItem("fantasylab_guest_migrated") === "1") {
      localStorage.removeItem("squads");
      localStorage.removeItem("activeSquadId");
      localStorage.removeItem(LS_KEYS.squadsGlobal);
      localStorage.removeItem(LS_KEYS.activeSquadGlobal);
    }
  } catch (e) {
    __warn("purgeGlobalSquadsIfMigrated", e);
  }
}
export function deleteSquad(id) {
  const list = loadSquads();
  const next = list.filter((s) => s.id !== id);
  saveSquads(next);
  if (
    (localStorage.getItem(LS_KEYS.activeSquadGlobal) ||
      localStorage.getItem("activeSquadId") ||
      null) === id
  ) {
    localStorage.removeItem(LS_KEYS.activeSquadGlobal);
    localStorage.removeItem("activeSquadId");
  }

  try {
    localStorage.removeItem(`transfers_${id}`);
    localStorage.removeItem(`lineups_${id}`);

    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(`transfers_`) || key.startsWith(`lineups_`)) &&
        key.includes(`_${id}`)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    __warn("deleteSquad cleanup", e);
  }

  return next;
}
export function loadActiveSquadId() {
  return (
    localStorage.getItem(LS_KEYS.activeSquadGlobal) ||
    localStorage.getItem("activeSquadId") ||
    null
  );
}
export function saveActiveSquadId(id) {
  localStorage.setItem(LS_KEYS.activeSquadGlobal, id);
}

const RATINGS_PRESETS_KEY = LS_KEYS.ratingsPresets;
const RATINGS_ACTIVE_KEY = LS_KEYS.ratingsActivePreset;

export function loadRatingsPresets(userId) {
  const key = userId ? userKey(userId, "ratings_presets") : RATINGS_PRESETS_KEY;
  try {
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    __warn("loadRatingsPresets", e);
    return [];
  }
}

export function saveRatingsPresets(presets, userId) {
  const key = userId ? userKey(userId, "ratings_presets") : RATINGS_PRESETS_KEY;
  try {
    localStorage.setItem(key, JSON.stringify(presets || []));
  } catch (e) {
    __warn("saveRatingsPresets", e);
  }
}

export function loadActiveRatingsPresetId(userId) {
  const key = userId
    ? userKey(userId, "ratings_active_preset")
    : RATINGS_ACTIVE_KEY;
  return localStorage.getItem(key) || "default";
}

export function saveActiveRatingsPresetId(id, userId) {
  const key = userId
    ? userKey(userId, "ratings_active_preset")
    : RATINGS_ACTIVE_KEY;
  localStorage.setItem(key, id || "default");
}

const RATINGS_DEFAULT_OVERRIDE_KEY = LS_KEYS.ratingsDefaultOverride;
export function loadRatingsDefaultOverride() {
  try {
    return JSON.parse(
      localStorage.getItem(RATINGS_DEFAULT_OVERRIDE_KEY) || "{}"
    );
  } catch (e) {
    __warn("loadRatingsDefaultOverride", e);
    return {};
  }
}
export function saveRatingsDefaultOverride(map) {
  try {
    localStorage.setItem(
      RATINGS_DEFAULT_OVERRIDE_KEY,
      JSON.stringify(map || {})
    );
  } catch (e) {
    __warn("saveRatingsDefaultOverride", e);
  }
}
export function resetRatingsDefaultOverride() {
  localStorage.removeItem(RATINGS_DEFAULT_OVERRIDE_KEY);
}

export function loadLineupsForSquad(squadId, userId) {
  if (!squadId) return {};
  try {
    return (
      JSON.parse(
        localStorage.getItem(makeLineupsKey(squadId, userId)) || "{}"
      ) || {}
    );
  } catch (e) {
    __warn("loadLineupsForSquad", e);
    return {};
  }
}
export function saveLineupsForSquad(squadId, lineups, userId) {
  if (!squadId) return;
  try {
    localStorage.setItem(
      makeLineupsKey(squadId, userId),
      JSON.stringify(lineups || {})
    );
  } catch (e) {
    __warn("saveLineupsForSquad", e);
  }
}

export function loadTransfersForSquad(squadId, userId) {
  if (!squadId) return [];
  try {
    return (
      JSON.parse(
        localStorage.getItem(makeTransfersKey(squadId, userId)) || "[]"
      ) || []
    );
  } catch (e) {
    __warn("loadTransfersForSquad", e);
    return [];
  }
}
export function saveTransfersForSquad(squadId, transfers, userId) {
  if (!squadId) return;
  try {
    localStorage.setItem(
      makeTransfersKey(squadId, userId),
      JSON.stringify(transfers || [])
    );
  } catch (e) {
    __warn("saveTransfersForSquad", e);
  }
}
