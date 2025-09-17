export function computeDifficultyFromRatings({
  attackA = 1.5,
  defenseB = 1.5,
  isHome = true,
  homeBias = 1.04,
  awayBias = 0.9,
}) {
  const ratingToFactor = (r) => {
    const clamped = Math.max(0, Math.min(3, Number(r) || 0));
    return 0.45 + (clamped / 3) * 1.1;
  };
  let ratio = ratingToFactor(attackA) / ratingToFactor(defenseB);
  ratio *= isHome ? homeBias : awayBias;
  const s = 1.5;
  const score = Math.max(1, Math.min(5, +(3 - s * Math.log(ratio)).toFixed(2)));
  return score;
}

export function makeNineBinColorMapper(scores) {
  const arr = (scores || []).filter((x) => Number.isFinite(x));
  if (arr.length < 12) {
    return (s) => {
      const score = Math.max(1, Math.min(5, Number(s) || 3));
      let idx = 0;
      if (score <= 1.3) idx = 0;
      else if (score <= 1.8) idx = 1;
      else if (score <= 2.4) idx = 2;
      else if (score <= 2.8) idx = 3;
      else if (score <= 3.2) idx = 4;
      else if (score <= 3.6) idx = 5;
      else if (score <= 4.1) idx = 6;
      else if (score <= 4.6) idx = 7;
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
    };
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

export function computeFixtureCellColor({
  teamName,
  oppName,
  isHome,
  teamAttack = 1.5,
  teamDefense = 1.5,
  oppAttack = 1.5,
  oppDefense = 1.5,
  mode = "avg",
}) {
  let teamRating, oppRating;

  if (mode === "atk") {
    teamRating = teamAttack;
    oppRating = oppDefense;
  } else if (mode === "def") {
    teamRating = teamDefense;
    oppRating = oppAttack;
  } else {
    teamRating = teamAttack + teamDefense;
    oppRating = oppAttack + oppDefense;
  }

  const homeAdvantage = 1.04;
  const awayPenalty = 0.9;

  let adjustedTeamRating, adjustedOppRating;

  if (isHome) {
    adjustedTeamRating = teamRating * homeAdvantage;
    adjustedOppRating = oppRating * awayPenalty;
  } else {
    adjustedTeamRating = teamRating * awayPenalty;
    adjustedOppRating = oppRating * homeAdvantage;
  }

  const ratingDiff = adjustedTeamRating - adjustedOppRating;
  const scaledDiff = Math.max(-3, Math.min(3, ratingDiff));

  const multiplier = mode === "atk" || mode === "def" ? 4 : 2;
  const shade = Math.round(4 - scaledDiff * multiplier);

  return shadeIndexToColor(Math.max(0, Math.min(8, shade)));
}
