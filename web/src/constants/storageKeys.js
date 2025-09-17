export const LS_KEYS = Object.freeze({
  squadsGlobal: "squads",
  activeSquadGlobal: "activeSquadId",
  fixturesSettings: "fantasylab_fixtures_settings_v1",
  squadFixSettings: "fantasylab_squad_fix_settings_v1",
  ratingsPresets: "fantasylab_ratings_presets_v1",
  ratingsActivePreset: "fantasylab_ratings_active_preset_v1",
  ratingsDefaultOverride: "fantasylab_ratings_default_override_v1",
  token: "fantasylab_token_v1",
  user: "fantasylab_user_v1",
});

export const makeLineupsKey = (squadId, userId) =>
  userId ? `lineups_${userId}_${squadId}` : `lineups_${squadId}`;
export const makeTransfersKey = (squadId, userId) =>
  userId ? `transfers_${userId}_${squadId}` : `transfers_${squadId}`;
