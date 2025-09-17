export const STARS_DEFAULTS = {
  liverpool: { atk: 5.0, def: 4.0 },
  "man city": { atk: 4.5, def: 4.0 },
  arsenal: { atk: 4.0, def: 4.5 },
  "aston villa": { atk: 3.5, def: 3.5 },
  spurs: { atk: 3.5, def: 4.0 },
  newcastle: { atk: 3.5, def: 4.0 },
  chelsea: { atk: 4.0, def: 3.5 },
  "nottm forest": { atk: 3.5, def: 3.0 },
  bournemouth: { atk: 3.5, def: 3.0 },
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

export const TEAM_ALIASES = {
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

export function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\'\u2019.]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

export function deriveDefaultRatingsFull(teams) {
  const map = {};
  for (const t of teams || []) {
    const n = normalizeName(t.name);
    const key = STARS_DEFAULTS[n]
      ? n
      : STARS_DEFAULTS[TEAM_ALIASES[n]]
      ? TEAM_ALIASES[n]
      : null;
    if (key) {
      const sd = STARS_DEFAULTS[key];
      map[t.fplId] = { attack: sd.atk * 0.6, defense: sd.def * 0.6 };
    } else {
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
  }
  return map;
}
