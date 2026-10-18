import { fetchWithAuth } from './authFetch';

const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;

export async function postChatMessage(sessionId, message) {
  const res = await fetchWithAuth(`${BASE}/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to send chat message");
  }
  return res.json();
}

export async function getChatHistory(sessionId) {
  const res = await fetchWithAuth(`${BASE}/sessions/${sessionId}/chat`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch chat history");
  }
  return res.json(); // { messages: [...] }
}
