import { useState, useEffect, useCallback } from "react";
import { listSessions, deleteSession } from "../api/sessions";

export function useSessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(() => {
    return listSessions().then((data) => {
      setSessions(data);
      setError(null);
    }).catch((err) => {
      console.error("Failed to load sessions:", err);
      setError(err.message || 'Unable to load your history.');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const removeSession = useCallback(async (id) => {
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }, []);

  // call this after a new report is generated
  const refresh = useCallback(() => fetchSessions(), [fetchSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refresh, removeSession };
}
