import { useEffect, useState } from "react";
import { getJson } from "../api/http.js";

export function useDeadlines() {
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getJson("/fixtures/deadlines");
        if (!mounted) return;
        const list = Array.isArray(data) ? data : [];
        const norm = list.map((d) => {
          const id = Number(d.id ?? d.event ?? d.gw ?? d.gameweek ?? 0) || 0;
          return { ...d, id };
        });
        norm.sort((a, b) => a.id - b.id);
        setDeadlines(norm);
      } catch (e) {
        if (mounted) setError(e.message || "failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return { deadlines, loading, error };
}
