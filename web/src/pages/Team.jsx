import React, { useEffect, useState } from "react";
import Card from "../components/Card.jsx";

export default function Team() {
  const [teams, setTeams] = useState([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE || "/api"}/teams`)
      .then((r) => r.json())
      .then(setTeams);
  }, []);

  return (
    <Card title="Teams">
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {teams.map((t) => (
          <div key={t.fplId} className="rounded bg-neutral-800 p-3">
            <div className="font-medium">{t.name}</div>
            <div className="text-sm text-neutral-400">{t.shortName}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
