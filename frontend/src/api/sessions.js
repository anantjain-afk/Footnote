const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;

export async function createSession(topic) {
  const res = await fetch(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json(); // { session_id }
}

export async function listSessions() {
  const res = await fetch(`${BASE}/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json(); // [{ id, topic, status, created_at }]
}

export async function getSession(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`);
  if (!res.ok) throw new Error("Session not found");
  return res.json(); // { session, report }
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
}
