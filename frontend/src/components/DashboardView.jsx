import { useState } from 'react'
import { ArrowRight, Search, Loader2, FileText } from 'lucide-react'
import { cooldownMessage } from '../hooks/useQuotaCooldowns'
import './EntryViews.css'

function sessionDate(value) {
  if (!value) return ''
  const date = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DashboardView({ onSubmit, onSelectSession, onOpenSettings, deepKeyMissing = false, settingsCheckError = '', sessions, loadingSessions, historyError, onRetryHistory, cooldownSeconds = 0, initialTopic = '', initialMode = 'normal' }) {
  const [topic, setTopic] = useState(initialTopic)
  const [mode, setMode] = useState(initialMode)
  const [filter, setFilter] = useState('')
  const filteredSessions = sessions.filter(session => session.topic.toLowerCase().includes(filter.trim().toLowerCase()))

  const submit = (event) => {
    event.preventDefault()
    if (topic.trim() && cooldownSeconds === 0) onSubmit(topic.trim(), mode)
  }

  return (
    <div className="entry-page dashboard-page">
      <header className="dashboard-header"><span className="entry-brand ">Footnote.</span><span className="entry-caption">Your workspace</span></header>
      <div className="dashboard-content">
        <section aria-labelledby="dashboard-title">
          <h1 id="dashboard-title">Your research, continued.</h1>
          <p className="entry-prose">Pick up a thought, or start with a new question.</p>
          <form className="research-composer" onSubmit={submit}>
            <label htmlFor="research-topic-input">What would you like to explore?</label>
            <div className="research-input-row"><input id="research-topic-input" value={topic} onChange={event => setTopic(event.target.value)} placeholder="What would you like to research today?" required /><button className="entry-button entry-button-research" type="submit" disabled={!topic.trim() || cooldownSeconds > 0}>Research <ArrowRight size={17} aria-hidden="true" /></button></div>
            <fieldset className="research-modes"><legend className="sr-only">Research mode</legend><label><input type="radio" name="mode" value="normal" checked={mode === 'normal'} onChange={() => setMode('normal')} />Normal</label><label><input type="radio" name="mode" value="deep_research" checked={mode === 'deep_research'} onChange={() => setMode('deep_research')} />Deep research</label></fieldset>
            <p className="entry-caption">{mode === 'normal' ? 'A focused report on your topic, with sources to explore.' : 'A broader investigation with sub-questions and multiple rounds of research.'}</p>
            {mode === 'deep_research' && deepKeyMissing && <p className="entry-notice deep-key-notice" role="alert">Deep Research requires your own Firecrawl API key. Add yours in <a href="#settings" onClick={onOpenSettings}>Settings → API Keys</a> to use this mode.</p>}
            {mode === 'deep_research' && settingsCheckError && <p className="entry-notice" role="alert">{settingsCheckError}</p>}
            {cooldownSeconds > 0 && <p role="status" className="entry-notice">Report limit reached. {cooldownMessage(cooldownSeconds)}</p>}
          </form>
        </section>
        <section className="dashboard-history" aria-labelledby="history-title">
          <div className="history-heading"><h2 id="history-title">Research history</h2>{sessions.length > 0 && <label className="history-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search research history</span><input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Find a research session" /></label>}</div>
          {loadingSessions ? <p className="history-state" role="status"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Loading your research…</p> : historyError ? <div className="history-state"><p role="alert">Your research history couldn’t be loaded. Please try again.</p><button className="entry-button entry-button-outline" onClick={onRetryHistory}>Try again</button></div> : sessions.length === 0 ? <div className="history-empty"><FileText size={24} strokeWidth={1.3} aria-hidden="true" /><h3>A place for your next discovery.</h3><p>Your reports and conversations will appear here.<br />Start your first research with a question above.</p></div> : filteredSessions.length === 0 ? <div className="history-state"><p>No research matches “{filter}”.</p><button className="entry-text-link" onClick={() => setFilter('')}>Clear search</button></div> : <ul className="session-list">{filteredSessions.map(session => <li key={session.id}><button onClick={() => onSelectSession(session.id)}><div><h3>{session.topic}</h3><p>{session.mode === 'deep_research' ? 'Deep research' : 'Normal research'}<span aria-hidden="true"> · </span>{sessionDate(session.created_at)}</p></div><span className="session-status">{session.status === 'running' ? 'In progress' : session.status === 'failed' ? 'Failed' : 'View report'}</span><ArrowRight size={18} aria-hidden="true" /></button></li>)}</ul>}
        </section>
      </div>
    </div>
  )
}
