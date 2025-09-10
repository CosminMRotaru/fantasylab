const SQUAD_KEY = "fantasylab_squad_v1";
export function loadSquad() {
  try {
    return JSON.parse(localStorage.getItem(SQUAD_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveSquad(list) {
  localStorage.setItem(SQUAD_KEY, JSON.stringify(list || []));
}
export function clearSquad() {
  localStorage.removeItem(SQUAD_KEY);
}

export function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return Object.assign({}, fallback, JSON.parse(raw));
  } catch {
    return fallback;
  }
}
export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const FIXTURES_SETTINGS_KEY = "fantasylab_fixtures_settings_v1";
export function loadFixturesSettings() {
  return getJSON(FIXTURES_SETTINGS_KEY, {
    fromGw: 1,
    count: 8,
    onlyFuture: true,
    sortBy: "alpha",
    sortDir: "asc",
    homeW: 1.0,
    awayW: 1.0,
    oppW: 1.0,
  });
}
export function saveFixturesSettings(s) {
  setJSON(FIXTURES_SETTINGS_KEY, s);
}
export function resetFixturesSettings() {
  localStorage.removeItem(FIXTURES_SETTINGS_KEY);
}

const SQUAD_FIX_SETTINGS_KEY = "fantasylab_squad_fix_settings_v1";
export function loadSquadFixSettings() {
  return getJSON(SQUAD_FIX_SETTINGS_KEY, {
    fromGw: 1,
    count: 5,
    onlyFuture: true,
  });
}
export function saveSquadFixSettings(s) {
  setJSON(SQUAD_FIX_SETTINGS_KEY, s);
}
export function resetSquadFixSettings() {
  localStorage.removeItem(SQUAD_FIX_SETTINGS_KEY);
}

export function loadSquads() {
  return JSON.parse(localStorage.getItem("squads") || "[]");
}
export function saveSquads(squads) {
  localStorage.setItem("squads", JSON.stringify(squads));
}
export function deleteSquad(id) {
  const list = loadSquads();
  const next = list.filter((s) => s.id !== id);
  saveSquads(next);
  if ((localStorage.getItem("activeSquadId") || null) === id) {
    localStorage.removeItem("activeSquadId");
  }
  return next;
}
export function loadActiveSquadId() {
  return localStorage.getItem("activeSquadId") || null;
}
export function saveActiveSquadId(id) {
  localStorage.setItem("activeSquadId", id);
}

const SNAP_KEY = "fantasylab_squad_snapshots_v1";

function _getSnapMap() {
  try {
    return JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
  } catch {
    return {};
  }
}
function _setSnapMap(map) {
  localStorage.setItem(SNAP_KEY, JSON.stringify(map || {}));
}

export function listSquadSnapshots(squadId) {
  const map = _getSnapMap();
  return Array.isArray(map[squadId]) ? map[squadId] : [];
}

export function saveSquadSnapshot(squadId, name, data) {
  if (!squadId) return null;
  const map = _getSnapMap();
  const arr = Array.isArray(map[squadId]) ? map[squadId] : [];
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  arr.unshift({
    id,
    name: String(name || "Untitled"),
    createdAt: Date.now(),
    data,
  });
  map[squadId] = arr.slice(0, 50);
  _setSnapMap(map);
  return id;
}

export function loadSquadSnapshot(squadId, id) {
  const list = listSquadSnapshots(squadId);
  return list.find((s) => s.id === id) || null;
}

export function deleteSquadSnapshot(squadId, id) {
  const map = _getSnapMap();
  const arr = Array.isArray(map[squadId]) ? map[squadId] : [];
  map[squadId] = arr.filter((s) => s.id !== id);
  _setSnapMap(map);
}

const RATINGS_PRESETS_KEY = "fantasylab_ratings_presets_v1";
const RATINGS_ACTIVE_KEY = "fantasylab_ratings_active_preset_v1";

export function loadRatingsPresets() {
  try {
    const raw = localStorage.getItem(RATINGS_PRESETS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveRatingsPresets(presets) {
  try {
    localStorage.setItem(RATINGS_PRESETS_KEY, JSON.stringify(presets || []));
  } catch {}
}

export function loadActiveRatingsPresetId() {
  return localStorage.getItem(RATINGS_ACTIVE_KEY) || "default";
}

export function saveActiveRatingsPresetId(id) {
  localStorage.setItem(RATINGS_ACTIVE_KEY, id || "default");
}

const RATINGS_DEFAULT_OVERRIDE_KEY = "fantasylab_ratings_default_override_v1";
export function loadRatingsDefaultOverride() {
  try {
    return JSON.parse(
      localStorage.getItem(RATINGS_DEFAULT_OVERRIDE_KEY) || "{}"
    );
  } catch {
    return {};
  }
}
export function saveRatingsDefaultOverride(map) {
  try {
    localStorage.setItem(
      RATINGS_DEFAULT_OVERRIDE_KEY,
      JSON.stringify(map || {})
    );
  } catch {}
}
export function resetRatingsDefaultOverride() {
  localStorage.removeItem(RATINGS_DEFAULT_OVERRIDE_KEY);
}
