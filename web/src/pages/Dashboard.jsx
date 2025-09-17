import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card.jsx";

const API = import.meta.env.VITE_API_BASE || "/api";

function Hero() {
  return (
    <section className="card relative overflow-hidden text-center">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(800px 400px at 50% 0%, rgba(124,92,255,.18), transparent 70%), radial-gradient(600px 300px at 90% 100%, rgba(0,213,196,.15), transparent 70%)",
          zIndex: 0,
        }}
      />
      <div
        className="absolute left-1/2 top-24 -translate-x-1/2 w-[32rem] h-32 blur-2xl opacity-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(124,92,255,0.5) 0%, rgba(0,213,196,0.5) 100%)",
        }}
      />
      <div className="relative p-8 md:p-12 lg:p-16 flex flex-col items-center z-10">
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight relative">
          <span
            className="bg-gradient-to-r from-brand-600 via-[#00D5C4] to-white bg-clip-text text-transparent drop-shadow-[0_2px_16px_rgba(124,92,255,0.25)]"
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Decisions you can defend.
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-base-300 max-w-2xl">
          Transparent fixture scoring and clean tools to plan transfers, not
          guess them.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            to="/fixtures"
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
            See Fixtures
          </Link>
          <Link to="/squad" className="btn btn-ghost px-5 py-3 text-base">
            Build Squad
          </Link>
        </div>
      </div>
    </section>
  );
}

function DeadlinesSection({ deadlines, loading, now }) {
  if (loading) {
    return <div className="py-8 text-center text-base-300">Loading…</div>;
  }
  if (!deadlines.length) return null;

  const cutoff = (now ?? Date.now()) - 60 * 1000;
  const upcoming = deadlines.filter((gw) => {
    const raw =
      gw.deadlineTime ||
      gw.deadline ||
      gw.deadline_time ||
      gw.deadlineISO ||
      gw.deadline_iso;
    if (!raw) return true;
    const ts = new Date(raw).getTime();
    return isFinite(ts) ? ts > cutoff : true;
  });
  if (!upcoming.length) return null;

  return (
    <section className="max-w-2xl mx-auto mt-12 mb-8 px-4">
      <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
        <span
          className="bg-gradient-to-r from-brand-600 via-[#00D5C4] to-white bg-clip-text text-transparent drop-shadow-[0_2px_16px_rgba(124,92,255,0.25)]"
          style={{
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Upcoming Deadlines
        </span>
      </h2>
      <div className="grid gap-4">
        {upcoming.slice(0, 8).map((gw) => (
          <div
            key={gw.id}
            className="deadline-card flex items-center justify-between rounded-xl bg-white/5 backdrop-blur px-4 py-3 md:px-6 md:py-4 shadow-lg border border-brand-600/20 transition-all duration-150 md:hover:scale-[1.03] hover:bg-brand-600/10"
            style={{ cursor: "default" }}
          >
            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 min-w-0">
              <span
                className="font-bold text-base sm:text-lg md:text-xl bg-gradient-to-r from-brand-600 via-[#00D5C4] to-white bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(124,92,255,0.22)] whitespace-nowrap"
                style={{
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                GW{gw.id}
              </span>
              <span
                className="text-sm sm:text-base truncate max-w-[140px] sm:max-w-[200px]"
                style={{ color: "#eaeaea" }}
                title={gw.name}
              >
                {gw.name}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white/80"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="#eaeaea"
                  strokeWidth="2"
                />
                <path
                  d="M12 7v5l3 3"
                  stroke="#eaeaea"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="font-mono text-xs sm:text-sm md:text-base leading-tight tracking-tight"
                style={{ color: "#eaeaea" }}
              >
                {(() => {
                  const raw =
                    gw.deadlineTime ||
                    gw.deadline ||
                    gw.deadline_time ||
                    gw.deadlineISO ||
                    gw.deadline_iso;
                  try {
                    return new Date(raw).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } catch {
                    return raw || "";
                  }
                })()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let aborted = false;
    async function load() {
      try {
        const r = await fetch(`${API}/fixtures/deadlines`);
        const data = await r.json();
        if (!aborted) setDeadlines(Array.isArray(data) ? data : []);
      } catch (_) {
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    const refetchId = setInterval(load, 5 * 60 * 1000);
    return () => {
      aborted = true;
      clearInterval(refetchId);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Hero />
      <DeadlinesSection deadlines={deadlines} loading={loading} now={now} />
    </div>
  );
}
