import React from "react";
import { isLoggedIn, getUser } from "../lib/auth.js";
import { useDropdownState } from "../hooks/useDropdownState.js";
import {
  loadRatingsPresets,
  saveRatingsPresets,
  saveActiveRatingsPresetId,
  loadRatingsPresets as loadPresetsAgain,
} from "../lib/storage.js";

export function RatingsPresetSelector({
  activePresetId,
  onChangeActive,
  ratingsMap,
  setRatingsPresets,
}) {
  const user = getUser();
  const userId = user?.username;
  const ratingsPresets = loadRatingsPresets(userId);
  const IS_AUTH = isLoggedIn();
  const { isOpen, setIsOpen, close, toggle } = useDropdownState();
  const [authMsg, setAuthMsg] = React.useState("");
  const ref = React.useRef(null);
  React.useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) close();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const currentLabel =
    activePresetId === "default"
      ? "Default"
      : ratingsPresets.find((p) => p.id === activePresetId)?.name || "Preset";
  function choose(id) {
    onChangeActive(id);
    saveActiveRatingsPresetId(id, userId);
    window.dispatchEvent(new Event("ratings:updated"));
    close();
  }
  return (
    <div className="flex gap-2 items-center" ref={ref}>
      <div className="pos-select relative" style={{ minWidth: 140 }}>
        <button
          type="button"
          className="field w-full flex items-center justify-between gap-2 !pr-2 cursor-pointer select-none"
          onClick={() => {
            if (!IS_AUTH) {
              setAuthMsg("Please sign in to access presets.");
              setTimeout(() => setAuthMsg(""), 2500);
              return;
            }
            toggle();
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title="Choose ratings preset"
        >
          <span className="truncate text-xs md:text-sm">{currentLabel}</span>
          <span
            className={`transition-transform text-[10px] ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>
        {isOpen && (
          <ul
            className="pos-menu absolute z-40 mt-1 w-full rounded-lg shadow-xl overflow-hidden"
            role="listbox"
            aria-label="Select ratings preset"
            style={{ maxHeight: 300, overflowY: "auto" }}
          >
            <li
              role="option"
              aria-selected={activePresetId === "default"}
              className={`pos-option px-2 py-1.5 text-xs md:text-sm flex items-center justify-between gap-2 cursor-pointer ${
                activePresetId === "default" ? "is-active" : ""
              }`}
              onClick={() => choose("default")}
            >
              <span>Default</span>
              {activePresetId === "default" && (
                <span className="text-brand-300 text-[10px]">●</span>
              )}
            </li>
            {ratingsPresets.map((p) => {
              const active = p.id === activePresetId;
              return (
                <li
                  key={p.id}
                  role="option"
                  aria-selected={active}
                  className={`pos-option px-2 py-1.5 text-xs md:text-sm flex items-center gap-2 cursor-pointer ${
                    active ? "is-active" : ""
                  }`}
                  onClick={() => choose(p.id)}
                >
                  <span className="truncate flex-1">{p.name}</span>
                  <div
                    className="flex items-center ml-auto gap-1"
                    style={{ alignItems: "center" }}
                  >
                    {p.id !== "default" && (
                      <button
                        type="button"
                        aria-label="Delete preset"
                        className="text-red-300 hover:text-red-200 text-[10px] opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!IS_AUTH) {
                            setAuthMsg("Please sign in to modify presets.");
                            setTimeout(() => setAuthMsg(""), 2500);
                            return;
                          }
                          if (!confirm("Delete this preset?")) return;
                          const next = ratingsPresets.filter(
                            (x) => x.id !== p.id
                          );
                          setRatingsPresets(next);
                          saveRatingsPresets(next, userId);
                          if (activePresetId === p.id) {
                            onChangeActive("default");
                            saveActiveRatingsPresetId("default", userId);
                          }
                          window.dispatchEvent(new Event("ratings:updated"));
                        }}
                      >
                        ✕
                      </button>
                    )}
                    {active && (
                      <span className="text-brand-300 text-[10px]">●</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <button
        className="btn"
        onClick={() => {
          if (!IS_AUTH) {
            setAuthMsg("Please sign in to save a preset.");
            setTimeout(() => setAuthMsg(""), 2500);
            return;
          }
          const name = prompt("Preset name?");
          if (!name) return;
          const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const preset = { id, name, teamRatings: ratingsMap };
          const next = [preset, ...loadRatingsPresets(userId)];
          setRatingsPresets(next);
          saveRatingsPresets(next, userId);
          onChangeActive(id);
          saveActiveRatingsPresetId(id, userId);
          window.dispatchEvent(new Event("ratings:updated"));
        }}
      >
        Save
      </button>
      {authMsg && (
        <span className="text-[10px] text-amber-300 ml-1 select-none">
          {authMsg}
        </span>
      )}
    </div>
  );
}

export default RatingsPresetSelector;
