import { Network, Search, PenLine, ShieldCheck, Check, Loader2, Circle } from 'lucide-react'
import { PipelineLayout, PipelineSteps, QualityScores } from './ResearchProgress'

const PHASES = [
  ['planner'],
  ['research_sub_question', 'reflector'],
  ['write_section', 'merge_report'],
  ['verify_report', 'deep_judge', 'deep_route'],
]
const ACTIVITY = {
  planner: 'Planning the research questions',
  research_sub_question: 'Researching the questions',
  reflector: 'Reviewing gaps in the evidence',
  write_section: 'Writing report sections',
  merge_report: 'Bringing the sections together',
  verify_report: 'Verifying claims against the sources',
  deep_judge: 'Evaluating report quality',
  deep_route: 'Checking whether the report needs another pass',
}

export default function DeepResearchLoadingView({
  topic, currentNode, scores, iterations = 0, subQuestions = [],
  subQuestionProgress = {}, researchRound = 1, gaps = [],
  sectionProgress = {}, stats = null, verifiedPct = null,
}) {
  const activeIndex = PHASES.findIndex(nodes => nodes.includes(currentNode))
  const totalNotes = Object.values(subQuestionProgress).reduce((sum, item) => sum + (item.note_count || 0), 0)
  const totalSources = Object.values(subQuestionProgress).reduce((sum, item) => sum + (item.source_count || 0), 0)
  const completedResearch = subQuestions.filter(question => subQuestionProgress[question]?.status === 'done').length
  const completedSections = subQuestions.filter(question => sectionProgress[question]?.status === 'done').length
  const verified = typeof verifiedPct === 'number' && Number.isFinite(verifiedPct) ? Math.max(0, Math.min(1, verifiedPct)) : null
  const steps = [
    { id: 'plan', color: 'blue', icon: Network, title: 'Plan the questions', description: subQuestions.length ? `${subQuestions.length} questions to explore from different angles.` : 'Breaking your topic into focused research questions.' },
    { id: 'research', color: 'red', icon: Search, title: 'Research & reflect', description: `Gathering evidence and following up on gaps · Round ${researchRound}.` },
    { id: 'write', color: 'yellow', icon: PenLine, title: 'Write & assemble', description: 'Developing each section and bringing the report together.' },
    { id: 'review', color: 'green', icon: ShieldCheck, title: 'Verify & review', description: iterations > 0 ? `Checking claims and report quality · Revision ${iterations}.` : 'Checking claims against sources and evaluating the report.' },
  ]

  return (
    <PipelineLayout title="Going deeper into your question." topic={topic} mode="Deep research" activity={ACTIVITY[currentNode] || 'Preparing your research…'}>
      <PipelineSteps steps={steps} activeIndex={activeIndex} />
      <div className="deep-research-body">
        <div>
          <section className="pipeline-section" aria-labelledby="questions-title">
            <div className="pipeline-section-heading"><h2 id="questions-title">Questions we’re exploring</h2>{subQuestions.length > 0 && <span>{completedResearch} of {subQuestions.length} researched</span>}</div>
            {subQuestions.length === 0 ? <p>The research plan will appear here as your topic is broken into questions.</p> : (
              <ul className="research-question-list">
                {subQuestions.map(question => {
                  const progress = subQuestionProgress[question]
                  const done = progress?.status === 'done'
                  const researching = !done && activeIndex === 1
                  return (
                    <li key={question}>
                      <span className={`question-status ${done ? 'is-done' : ''}`} aria-hidden="true">{done ? <Check size={16} /> : researching ? <Loader2 size={16} className="pipeline-spinner" /> : <Circle size={16} />}</span>
                      <div><h3>{question}</h3><p className="question-meta">{done ? `${progress.source_count ?? 0} sources · ${progress.note_count ?? 0} claims gathered` : researching ? 'Researching…' : 'Waiting for research'}</p>
                        {progress?.branches?.length > 0 && <ul className="research-branches">{progress.branches.map((branch, index) => <li key={`${branch.query}-${index}`}>
                          {index > 0 && <p>Follow-up: {branch.query}</p>}
                          <span>{branch.empty_reason || `${branch.sources ?? 0} sources · ${branch.claims ?? 0} claims`}</span>
                        </li>)}</ul>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          {gaps.length > 0 && <section className="pipeline-section research-gaps"><h2>What we’re looking into next</h2><ul>{gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul></section>}
          {Object.keys(sectionProgress).length > 0 && <section className="pipeline-section">
            <div className="pipeline-section-heading"><h2>Report sections</h2><span>{completedSections} of {subQuestions.length} written</span></div>
            <ul className="research-section-list">{subQuestions.map(question => {
              const section = sectionProgress[question]
              return <li key={question}><span>{question}</span><span className="section-word-count">{section?.status === 'done' ? `${section.word_count ?? 0} words` : 'Waiting'}</span></li>
            })}</ul>
          </section>}
        </div>
        <aside className="pipeline-aside">
          <section className="pipeline-section"><h2>Research so far</h2><dl className="pipeline-metrics">
            <div><dt>Sources gathered</dt><dd>{stats?.total_sources ?? totalSources}</dd></div>
            <div><dt>Claims gathered</dt><dd>{stats?.notes_count ?? totalNotes}</dd></div>
            {stats?.word_count != null && <div><dt>Words written</dt><dd>{stats.word_count}</dd></div>}
            {stats?.unique_domains != null && <div><dt>Source domains</dt><dd>{stats.unique_domains}</dd></div>}
          </dl></section>
          {verified !== null && <section className="pipeline-section research-verification"><h2>Claim verification</h2><p>{Math.round(verified * 100)}% of claims verified</p><progress aria-label="Claims verified" max="100" value={verified * 100} /><p className="pipeline-footnote">{verified >= .8 ? 'Claims checked against the gathered evidence.' : 'Some claims need more supporting evidence.'}</p></section>}
          <QualityScores scores={scores?.deep_judge} />
          <p className="pipeline-footnote">Questions may be revisited as new evidence comes in. Your report opens here when it’s ready.</p>
        </aside>
      </div>
    </PipelineLayout>
  )
}
