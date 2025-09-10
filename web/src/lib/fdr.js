export function computeCellScore({
  base,
  isHome,
  oppStrength = 3,
  homeW = 1,
  awayW = 1,
  oppW = 1,
}) {
  const sideW = isHome ? homeW : awayW;
  const centered = (oppStrength - 3) / 2;
  const oppFactor = 1 + centered * (oppW - 1);
  const score = base * sideW * oppFactor;
  return Math.max(1, Math.min(5, Number(score.toFixed(2))));
}

export function scoreToColor(score) {
  const t = (score - 1) / 4;
  const lerp = (a, b, k) => Math.round(a + (b - a) * k);
  let r, g, b;
  if (t < 0.5) {
    const k = t / 0.5;
    r = lerp(28, 220, k);
    g = lerp(150, 200, k);
    b = lerp(34, 0, k);
  } else {
    const k = (t - 0.5) / 0.5;
    r = lerp(220, 200, k);
    g = lerp(200, 30, k);
    b = lerp(0, 30, k);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function ratingToFactor(r) {
  const clamped = Math.max(0, Math.min(3, Number(r) || 0));
  return 0.45 + (clamped / 3) * 1.1;
}

export function computeDifficultyFromRatings({
  attackA = 1.5,
  defenseB = 1.5,
  isHome = true,
  homeBias = 1.06,
  awayBias = 0.94,
}) {
  let ratio = ratingToFactor(attackA) / ratingToFactor(defenseB);
  ratio *= isHome ? homeBias : awayBias;
  const s = 1.5;
  const score = Math.max(1, Math.min(5, +(3 - s * Math.log(ratio)).toFixed(2)));
  return score;
}

export function scoreTo9binColor(score) {
  const s = Math.max(1, Math.min(5, Number(score) || 3));
  let idx = 0;
  if (s <= 1.3) idx = 0;
  else if (s <= 1.8) idx = 1;
  else if (s <= 2.4) idx = 2;
  else if (s <= 2.8) idx = 3;
  else if (s <= 3.2) idx = 4;
  else if (s <= 3.6) idx = 5;
  else if (s <= 4.1) idx = 6;
  else if (s <= 4.6) idx = 7;
  else idx = 8;
  const palette = [
    "#0E7A36",
    "#00C853",
    "#86E8AB",
    "#FFF1A6",
    "#FFC107",
    "#C78A00",
    "#FF5A5A",
    "#F44336",
    "#B71C1C",
  ];
  return palette[idx];
}

export function makeNineBinColorMapper(scores) {
  const arr = (scores || []).filter((x) => Number.isFinite(x));
  if (arr.length < 12) {
    return (s) => scoreTo9binColor(s);
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const q = (p) => {
    const n = sorted.length;
    if (n === 0) return 3;
    const idx = Math.max(0, Math.min(n - 1, Math.round(p * (n - 1))));
    return sorted[idx];
  };
  const g1 = q(0.1167);
  const g2 = q(0.2333);
  const g3 = q(0.35);
  const y1 = q(0.5167);
  const y2 = q(0.6833);
  const y3 = q(0.85);
  const r1 = q(0.9);
  const r2 = q(0.95);
  const greens = ["#5AD58A", "#2EDB70", "#1DB954"];
  const yellows = ["#E8D44A", "#FFC107", "#E49A2A"];
  const reds = ["#FF5A5A", "#F44336", "#B71C1C"];

  return function mapScore(s) {
    const v = Math.max(1, Math.min(5, Number(s) || 3));
    if (v <= g1) return greens[2];
    if (v <= g2) return greens[1];
    if (v <= g3) return greens[0];
    if (v <= y1) return yellows[0];
    if (v <= y2) return yellows[1];
    if (v <= y3) return yellows[2];
    if (v <= r1) return reds[0];
    if (v <= r2) return reds[1];
    return reds[2];
  };
}

const GREENS_EASE_TO_HARD = ["#0E7A36", "#00C853", "#86E8AB"];
const YELLOWS_EASE_TO_HARD = ["#FFF1A6", "#FFC107", "#C78A00"];
const REDS_EASE_TO_HARD = ["#FF5A5A", "#F44336", "#B71C1C"];

export function shadeIndexToColor(idx) {
  const i = Math.max(0, Math.min(8, idx | 0));
  if (i <= 2) return GREENS_EASE_TO_HARD[i];
  if (i <= 5) return YELLOWS_EASE_TO_HARD[i - 3];
  return REDS_EASE_TO_HARD[i - 6];
}

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function isTop3(name) {
  const n = normName(name);
  return (
    n === "liverpool" ||
    n === "man city" ||
    n === "manchester city" ||
    n === "arsenal"
  );
}

function isCityOrArsenal(name) {
  const n = normName(name);
  return n === "man city" || n === "manchester city" || n === "arsenal";
}

function isNewcastle(name) {
  const n = normName(name);
  return n === "newcastle" || n === "newcastle united";
}

export function heuristicShadeIndex({
  teamName,
  oppName,
  isHome,
  teamStarAvg,
  oppStarAvg,
}) {
  const oppIsTop =
    isCityOrArsenal(oppName) || normName(oppName) === "liverpool";
  let base;
  if (isHome) {
    const oppIsLfc = normName(oppName) === "liverpool";
    const oppIsNwc = isNewcastle(oppName);
    if (oppIsLfc) base = 5;
    else if (isCityOrArsenal(oppName)) base = 4;
    else if (oppIsNwc) base = 3;
    else {
      if (oppStarAvg >= 3.0) base = 2;
      else if (oppStarAvg >= 2.75) base = 1;
      else base = 0;
    }
  } else {
    if (normName(oppName) === "liverpool") base = 8;
    else if (isCityOrArsenal(oppName)) base = 7;
    else {
      if (oppStarAvg < 2.5) base = 0;
      else if (oppStarAvg < 2.8) base = 1;
      else if (oppStarAvg < 3.0) base = 2;
      else if (oppStarAvg < 3.5) base = 3;
      else if (oppStarAvg < 3.9) base = 4;
      else base = 5;
    }
  }

  const teamIsCityOrArsenal = isCityOrArsenal(teamName);
  const teamIsLfc = normName(teamName) === "liverpool";
  const lfcAvg = 4.5;
  const gap = Math.max(0, lfcAvg - (Number(teamStarAvg) || 0));
  let offset = Math.round(gap / 0.6);
  if (teamIsLfc) offset = 0;
  if (isHome) {
    const v = Number(oppStarAvg) || 0;
    const strongOpp = v >= 3.1;
    if (strongOpp) {
      offset = Math.max(0, Math.ceil(offset * 0.5));
      if (v < 3.3) offset = Math.max(0, offset - 1);
    } else {
      offset = Math.max(0, Math.floor(offset * 0.5));
      if (v >= 2.8 && v < 3.1) offset = Math.max(0, offset - 1);
    }
  }
  let idx = Math.max(0, Math.min(8, base + offset));
  if (isHome) {
    const v = Number(oppStarAvg) || 0;
    const teamAvg = Number(teamStarAvg) || 0;
    const oppIsBig =
      isCityOrArsenal(oppName) ||
      normName(oppName) === "liverpool" ||
      isNewcastle(oppName);
    if (!oppIsBig && v >= 3.1 && v < 3.35 && teamAvg >= 3.1) {
      idx = Math.min(idx, 2);
    }
  }
  if (!isHome) {
    const v = Number(oppStarAvg) || 0;
    const teamAvg = Number(teamStarAvg) || 0;
    const oppIsBig =
      isCityOrArsenal(oppName) ||
      normName(oppName) === "liverpool" ||
      isNewcastle(oppName);
    if (!oppIsBig && v < 3.05 && teamAvg >= 3.1) {
      idx = Math.min(idx, 2);
    }
  }

  return idx;
}
