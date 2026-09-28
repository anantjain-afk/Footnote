import { useState } from 'react';

const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;

export function useChatStream(sessionId) {
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const send = async (message, onComplete) => {
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      const response = await fetch(`${BASE}/sessions/${sessionId}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalIntent = null;
      let finalReport = null;
      let accumulatedMessage = '';

      while (true) {
        const { value, done } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        
        // Process complete events separated by double newlines
        const parts = buffer.split(/\r?\n\r?\n/);
        // The last part is either incomplete or empty, keep it in buffer
        buffer = parts.pop() || '';
        
        // If the stream is done, also process whatever is left in the buffer
        if (done && buffer.trim()) {
          parts.push(buffer);
          buffer = '';
        }
        
        for (const part of parts) {
          if (!part.trim()) continue;
          
          const lines = part.split(/\r?\n/);
          let eventType = 'message';
          let dataStr = '';
          
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.slice(5).trim();
            }
          }
          
          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              if (eventType === 'token') {
                accumulatedMessage += data.content;
                setStreamingMessage(accumulatedMessage);
              } else if (eventType === 'done') {
                finalIntent = data.intent;
                if (data.updated_report) finalReport = data.updated_report;
              } else if (eventType === 'error') {
                console.error("Chat error:", data.detail);
              }
            } catch (e) {
              console.error("Failed to parse SSE data", e, "Raw data:", dataStr);
            }
          }
        }
        
        if (done) break;
      }
      
      if (onComplete) {
        onComplete({ intent: finalIntent, updated_report: finalReport, finalMessage: accumulatedMessage });
      }
    } catch (err) {
      console.error('Stream failed:', err);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  return { streamingMessage, isStreaming, send };
}
