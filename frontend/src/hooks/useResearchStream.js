import { useState, useEffect, useEffectEvent } from 'react';
import { fetchWithAuth } from '../api/authFetch';
import { readEventStream } from '../api/eventStream';

const BASE = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"}/api`;

export function useResearchStream(sessionId, { onComplete, onError } = {}) {
  const [stateSessionId, setStateSessionId] = useState(sessionId);
  const [events, setEvents] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);
  const [scores, setScores] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [report, setReport] = useState(null);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState(null);
  const [iterations, setIterations] = useState(0);

  // ── Deep Research state ────────────────────────────────────────────────
  const [subQuestions, setSubQuestions] = useState([]);
  const [subQuestionProgress, setSubQuestionProgress] = useState({});
  const [researchRound, setResearchRound] = useState(1);
  const [gaps, setGaps] = useState([]);
  const [sectionProgress, setSectionProgress] = useState({});
  const [stats, setStats] = useState(null);
  const [verifiedPct, setVerifiedPct] = useState(null);

  // Reset before rendering another session, so its first render cannot show old results.
  if (stateSessionId !== sessionId) {
    setStateSessionId(sessionId);
    setEvents([]);
    setCurrentNode(null);
    setScores(null);
    setIsComplete(false);
    setReport(null);
    setSources([]);
    setError(null);
    setIterations(0);
    setSubQuestions([]);
    setSubQuestionProgress({});
    setResearchRound(1);
    setGaps([]);
    setSectionProgress({});
    setStats(null);
    setVerifiedPct(null);
  }

  const notifyComplete = useEffectEvent((data) => onComplete?.(data));
  const notifyError = useEffectEvent((message) => {
    setError(message);
    onError?.(message);
  });

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();

    const initStream = async () => {
      const handlers = {};
      let finished = false;

      handlers.node_start = (data) => {
        setCurrentNode(data.node);
        setEvents(prev => [...prev, { type: 'start', node: data.node, time: Date.now() }]);
      };

      handlers.node_end = (data) => {

        // Normal mode: generate iteration counter
        if (data.node === 'generate') {
          setIterations(prev => prev + 1);
        }

        // Deep Research: planner completed
        if (data.node === 'planner') {
          setSubQuestions(data.data?.sub_questions || []);
          setResearchRound(data.data?.research_round || 1);
        }

        // Deep Research: sub-question research completed
        if (data.node === 'research_sub_question' && data.data?.sub_question) {
          setSubQuestionProgress(prev => {
            const sqId = data.data.original_sq_id || data.data.sub_question;
            const current = prev[sqId] || { source_count: 0, note_count: 0, branches: [] };
            return {
              ...prev,
              [sqId]: {
                status: 'done',
                source_count: current.source_count + (data.data?.source_count || 0),
                note_count: current.note_count + (data.data?.note_count || 0),
                branches: [...(current.branches || []), {
                  query: data.data.sub_question,
                  sources: data.data?.source_count || 0,
                  claims: data.data?.note_count || 0,
                  empty_reason: data.data?.empty_reason
                }]
              }
            }
          });
        }

        // Deep Research: reflector completed
        if (data.node === 'reflector') {
          setGaps(data.data?.gaps || []);
          if (data.data?.research_round) {
            setResearchRound(data.data.research_round);
          }
        }

        // Deep Research: section written
        if (data.node === 'write_section' && data.data?.sub_question) {
          setSectionProgress(prev => ({
            ...prev,
            [data.data.sub_question]: {
              status: 'done',
              word_count: data.data?.word_count || 0,
            }
          }));
        }

        // Deep Research: merge report completed (includes stats)
        if (data.node === 'merge_report') {
          setStats(data.data || null);
        }

        // Deep Research: verification completed
        if (data.node === 'verify_report') {
          const pct = data.data?.verified_claims_pct;
          if (pct !== undefined && pct !== -1) {
            setVerifiedPct(pct);
          }
          // Update stats with verification data
          setStats(prev => prev ? { ...prev, ...data.data } : data.data);
        }

        setEvents(prev => [...prev, { type: 'end', node: data.node, details: data.data, time: Date.now() }]);
      };

      handlers.scores = (data) => {
        setScores(prev => ({ ...prev, [data.node]: data.data }));
        setEvents(prev => [...prev, { type: 'scores', node: data.node, scores: data.data, time: Date.now() }]);
      };

      handlers.progress = (data) => {
        setEvents(prev => [...prev, { type: 'progress', node: data.node, details: data.data, time: Date.now() }]);
      };

      handlers.complete = (data) => {
        setReport(data.report);
        setSources(data.sources || []);
        if (data.stats) setStats(data.stats);
        setIsComplete(true);
        finished = true;
        notifyComplete(data);
      };

      handlers.error = (data) => {
        notifyError(data.detail || 'Connection lost');
        finished = true;
      };
      const response = await fetchWithAuth(`${BASE}/sessions/${sessionId}/stream`, {
        headers: { Accept: 'text/event-stream' }, signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Research stream failed (${response.status}).`);
      }
      await readEventStream(response, (type, data) => {
        if (controller.signal.aborted) return false;
        handlers[type]?.(data);
        return !finished;
      });
      if (!finished && !controller.signal.aborted) throw new Error('Connection lost. Please reopen this session.');
    };

    initStream().catch((err) => {
      if (!controller.signal.aborted) notifyError(err.message || 'Connection lost');
    });

    return () => controller.abort();
  }, [sessionId]);

  return {
    events, currentNode, scores, isComplete, report, sources, error, iterations,
    subQuestions, subQuestionProgress, researchRound, gaps, sectionProgress, stats, verifiedPct,
  };
}
