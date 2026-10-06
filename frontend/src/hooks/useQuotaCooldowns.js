import { useCallback, useEffect, useState } from 'react';

// Owned by the authenticated app, so navigation retains quotas and logout clears them.
export function useQuotaCooldowns() {
  const [deadlines, setDeadlines] = useState({ reports: 0, chat: 0 });
  const [now, setNow] = useState(() => Date.now());
  const active = deadlines.reports > now || deadlines.chat > now;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  const record = useCallback((quota, error) => {
    if (error.status !== 429 || !error.retryAfter) return;
    const time = Date.now();
    setNow(time);
    setDeadlines(previous => ({ ...previous,
      [quota]: Math.max(previous[quota], time + error.retryAfter * 1000),
    }));
  }, []);
  return {
    reports: Math.max(0, Math.ceil((deadlines.reports - now) / 1000)),
    chat: Math.max(0, Math.ceil((deadlines.chat - now) / 1000)),
    record,
  };
}

export function cooldownMessage(seconds) {
  const minutes = Math.ceil(seconds / 60);
  return seconds < 60 ? `Try again in ${seconds} second${seconds === 1 ? '' : 's'}.`
    : `Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
