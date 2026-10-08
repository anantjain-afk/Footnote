import { fetchWithAuth } from './authFetch';

const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;

export async function createSession(topic, mode = 'normal') {
  const res = await fetchWithAuth(`${BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, mode }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json(); // { session_id }
}

export async function listSessions() {
  const res = await fetchWithAuth(`${BASE}/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json(); // [{ id, topic, status, created_at }]
}

export async function getSession(sessionId) {
  const res = await fetchWithAuth(`${BASE}/sessions/${sessionId}`);
  if (!res.ok) throw new Error("Session not found");
  return res.json(); // { session, report }
}

export async function getReportVersions(sessionId) {
  const res = await fetchWithAuth(`${BASE}/sessions/${sessionId}/report/versions`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch report versions');
  }
  return res.json(); // { versions: [...] }
}

export async function approveReportVersion(sessionId, content, changePrompt) {
  const res = await fetchWithAuth(`${BASE}/sessions/${sessionId}/report/versions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, change_prompt: changePrompt }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to approve report change');
  }
  return res.json(); // { report, version_number }
}

export async function deleteSession(sessionId) {
  const res = await fetchWithAuth(`${BASE}/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
}
