import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropdownState } from "../hooks/useDropdownState.js";

const API = import.meta.env.VITE_API_BASE || "/api";

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const { isOpen, setIsOpen, close } = useDropdownState();
  const [players, setPlayers] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typingInInput = tag === "input" || tag === "textarea";
      if (e.key === "/" && !typingInInput) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (q.trim().length < 2) {
        setPlayers([]);
        setIsOpen(false);
        return;
      }
      const params = new URLSearchParams({ q: q.trim(), limit: "8" });
      const r = await fetch(`${API}/players?${params.toString()}`);
      const data = await r.json();
      setPlayers(Array.isArray(data) ? data : []);
      setIsOpen(true);
    };
    const t = setTimeout(run, 150);
    return () => clearTimeout(t);
  }, [q]);

  function onSelectPlayer(p) {
    const name = (p?.webName || "").trim();
    if (name) {
      navigate(`/squad?q=${encodeURIComponent(name)}`);
    } else {
      navigate("/squad");
    }
    close();
    setQ("");
  }

  return (
    <div className="relative w-full flex items-center">
      <input
        ref={inputRef}
        className="w-full bg-transparent outline-none text-lg md:text-xl text-white placeholder:text-base-400 pl-8 md:pl-9 pr-7 md:pr-8 py-3 md:py-4 border border-[#7c5cff] rounded-lg transition"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const query = (q || "").trim();
            if (query.length > 0) {
              navigate(`/squad?q=${encodeURIComponent(query)}`);
            } else {
              navigate("/squad");
            }
            close();
            setQ("");
          }
        }}
        onFocus={() => q.trim().length >= 2 && setIsOpen(true)}
        onBlur={() => setTimeout(() => close(), 120)}
        placeholder="Search players or teams…"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7c5cff]">
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M10 2a8 8 0 1 1-5.293 13.707l-2.5 2.5a1 1 0 1 1-1.414-1.414l2.5-2.5A8 8 0 0 1 10 2m0 2a6 6 0 1 0 0 12a6 6 0 0 0 0-12"
          />
        </svg>
      </span>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-lg bg-[#15182a] shadow-xl z-10">
          {players.length > 0 && (
            <>
              <div className="px-2 py-1 text-[12px] uppercase tracking-wide text-base-300">
                Players
              </div>
              {players.map((p) => (
                <div
                  key={p.fplId}
                  className="search-item px-4 py-3 cursor-pointer hover:bg-[#00D5C4]/10 transition"
                  onMouseDown={() => onSelectPlayer(p)}
                >
                  <span>{p.webName}</span>
                  <span className="text-xs text-base-400">
                    {["", "GK", "DEF", "MID", "FWD"][p.position] || p.position}
                  </span>
                </div>
              ))}
            </>
          )}

          {players.length === 0 && (
            <div className="px-3 py-3 text-base text-base-400">No results…</div>
          )}
        </div>
      )}
    </div>
  );
}
