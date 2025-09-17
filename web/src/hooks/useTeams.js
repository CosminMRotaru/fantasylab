import { useEffect, useState } from "react";
import { getJson } from "../api/http.js";

export function useTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getJson("/teams");
        if (mounted) setTeams(Array.isArray(data) ? data : []);
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
  return { teams, loading, error };
}
