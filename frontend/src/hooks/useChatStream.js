import { useRef, useState } from 'react';
import { fetchWithAuth } from '../api/authFetch';
import { responseError } from '../api/apiError';
import { readEventStream } from '../api/eventStream';

const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;

export function useChatStream(sessionId) {
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const pending = useRef(false);

  const send = async (message) => {
    if (pending.current) throw new Error('A message is already being sent.');
    pending.current = true;
    setIsStreaming(true);
    setStreamingMessage('');
    try {
      const response = await fetchWithAuth(`${BASE}/sessions/${sessionId}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw await responseError(response, 'Failed to send message');
      let accumulated = '';
      let result = null;
      await readEventStream(response, (type, data) => {
        if (type === 'error') throw new Error(data.detail || 'Chat failed. Please try again.');
        if (type === 'token') {
          accumulated += data.content;
          setStreamingMessage(accumulated);
        }
        if (type === 'done') {
          result = { intent: data.intent, updated_report: data.updated_report,
            finalMessage: data.response || accumulated };
          return false;
        }
      });
      if (!result) throw new Error('The connection ended before the reply finished. Please try again.');
      return result;
    } finally {
      pending.current = false;
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };
  return { streamingMessage, isStreaming, send };
}
