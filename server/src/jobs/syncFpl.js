import "dotenv/config";
import fetch from "node-fetch";
import { connectDB } from "../config/db.js";
import Team from "../models/Team.js";
import Player from "../models/Player.js";
import Fixture from "../models/Fixture.js";
import Gameweek from "../models/Gameweek.js";
import PriceSnapshot from "../models/PriceSnapshot.js";

const BOOTSTRAP = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FIXTURES = "https://fantasy.premierleague.com/api/fixtures/";

async function run() {
  await connectDB(process.env.MONGO_URI);

  const bs = await (await fetch(BOOTSTRAP)).json();
  const fixtures = await (await fetch(FIXTURES)).json();

  const teams = bs.teams.map((t) => ({
    updateOne: {
      filter: { fplId: t.id },
      update: {
        $set: {
          fplId: t.id,
          name: t.name,
          shortName: t.short_name,
          strength: t.strength,
        },
      },
      upsert: true,
    },
  }));
  await Team.bulkWrite(teams);

  const players = bs.elements.map((p) => ({
    updateOne: {
      filter: { fplId: p.id },
      update: {
        $set: {
          fplId: p.id,
          firstName: p.first_name,
          secondName: p.second_name,
          webName: p.web_name,
          team: p.team,
          position: p.element_type,
          nowCost: p.now_cost,
          selectedByPercent: p.selected_by_percent,
          minutes: p.minutes,
          totalPoints: p.total_points,
        },
      },
      upsert: true,
    },
  }));
  await Player.bulkWrite(players);

  const events = bs.events.map((e) => ({
    updateOne: {
      filter: { id: e.id },
      update: {
        $set: {
          id: e.id,
          name: e.name,
          deadlineTime: e.deadline_time,
          finished: e.finished,
          dataFrom: "bootstrap",
        },
      },
      upsert: true,
    },
  }));
  await Gameweek.bulkWrite(events);

  await Fixture.deleteMany({});
  const result = await Fixture.insertMany(
    fixtures.map((f) => ({
      fplId: f.id,
      event: f.event,
      kickoffTime: f.kickoff_time ? new Date(f.kickoff_time) : null,
      homeTeam: f.team_h,
      awayTeam: f.team_a,
      homeStrength: f.team_h_difficulty,
      awayStrength: f.team_a_difficulty,
      finished: f.finished,
      difficultyHome: f.team_h_difficulty,
      difficultyAway: f.team_a_difficulty,
    }))
  );

  const snapshot = {
    ts: new Date(),
    players: bs.elements.map((p) => ({ fplId: p.id, nowCost: p.now_cost })),
  };
  await PriceSnapshot.create(snapshot);

  process.exit(0);
}

run().catch((e) => {
  process.exit(1);
});
