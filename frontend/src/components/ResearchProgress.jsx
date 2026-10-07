import { Check, Loader2 } from 'lucide-react'
import './EntryViews.css'
import './ResearchProgress.css'

export function PipelineLayout({ title, topic, mode, activity, children }) {
  return (
    <div className="entry-page pipeline-page">
      <header className="dashboard-header">
        <span className="entry-brand">ResearchAI.</span>
        <span className="entry-caption">{mode}</span>
      </header>
      <div className="pipeline-content">
        <div className="pipeline-heading">
          <h1>{title}</h1>
          <p className="pipeline-topic">{topic}</p>
          <p className="pipeline-activity" role="status">
            <Loader2 size={16} className="pipeline-spinner" aria-hidden="true" />
            {activity}
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PipelineSteps({ steps, activeIndex }) {
  return (
    <ol className="pipeline-steps" aria-label="Research progress">
      {steps.map((step, index) => {
        const active = index === activeIndex
        const complete = index < activeIndex
        const Icon = step.icon
        return (
          <li key={step.id} className={`pipeline-step pipeline-${step.color} ${active ? 'is-active' : ''}`} aria-current={active ? 'step' : undefined}>
            <span className="pipeline-step-icon" aria-hidden="true">
              {complete ? <Check size={20} /> : active ? <Loader2 size={20} className="pipeline-spinner" /> : <Icon size={20} />}
            </span>
            <div className="pipeline-step-copy">
              <div className="pipeline-step-title"><h2>{step.title}</h2><span>{complete ? 'Complete' : active ? 'In progress' : 'Waiting'}</span></div>
              <p>{step.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function QualityScores({ scores }) {
  const metrics = Object.entries(scores || {}).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
  if (!metrics.length) return null
  return (
    <section className="pipeline-section" aria-labelledby="quality-title">
      <h2 id="quality-title">Quality review</h2>
      <dl className="pipeline-metrics">
        {metrics.map(([name, value]) => <div key={name}><dt>{name.replaceAll('_', ' ')}</dt><dd>{(Math.max(0, Math.min(1, value)) * 10).toFixed(1)}<span> / 10</span></dd></div>)}
      </dl>
    </section>
  )
}
