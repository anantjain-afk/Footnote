import { useState, useEffect } from 'react';

const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;

export function useResearchStream(sessionId) {
  const [events, setEvents] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);
  const [scores, setScores] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [iterations, setIterations] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    // reset state when session changes
    setEvents([]);
    setCurrentNode(null);
    setScores(null);
    setIsComplete(false);
    setReport(null);
    setError(null);
    setIterations(0);

    const eventSource = new EventSource(`${BASE}/sessions/${sessionId}/stream`);

    eventSource.addEventListener('node_start', (e) => {
      const data = JSON.parse(e.data);
      setCurrentNode(data.node);
      setEvents(prev => [...prev, { type: 'start', node: data.node, time: Date.now() }]);
    });

    eventSource.addEventListener('node_end', (e) => {
      const data = JSON.parse(e.data);
      if (data.node === 'generate') {
         setIterations(prev => prev + 1);
      }
      setEvents(prev => [...prev, { type: 'end', node: data.node, details: data.data, time: Date.now() }]);
    });

    eventSource.addEventListener('scores', (e) => {
      const data = JSON.parse(e.data);
      setScores(prev => ({ ...prev, [data.node]: data.data }));
      setEvents(prev => [...prev, { type: 'scores', node: data.node, scores: data.data, time: Date.now() }]);
    });

    eventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      setEvents(prev => [...prev, { type: 'progress', node: data.node, details: data.data, time: Date.now() }]);
    });

    eventSource.addEventListener('complete', (e) => {
      const data = JSON.parse(e.data);
      setReport(data.report);
      setIsComplete(true);
      eventSource.close();
    });

    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse(e.data || '{}');
      setError(data.detail || 'Connection lost');
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  return { events, currentNode, scores, isComplete, report, error, iterations };
}
