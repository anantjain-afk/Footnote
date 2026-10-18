import { Search, FileText, PenLine, ShieldCheck } from 'lucide-react'
import { PipelineLayout, PipelineSteps, QualityScores } from './ResearchProgress'

const NODES = ['search', 'extract_contents', 'generate', 'judge']

export default function LoadingView({ topic, currentNode, scores, events = [], iterations = 0 }) {
  const activeIndex = currentNode === 'route' ? 3 : NODES.indexOf(currentNode)
  const lastResult = node => events.findLast(event => event.type === 'end' && event.node === node)?.details
  const search = lastResult('search')
  const extraction = lastResult('extract_contents')
  const steps = [
    { id: 'search', color: 'blue', icon: Search, title: 'Search the web', description: search?.urls ? `${search.urls.length} sources found for your question.` : 'Finding relevant sources and different perspectives.' },
    { id: 'extract_contents', color: 'red', icon: FileText, title: 'Read the sources', description: extraction?.extracted_count != null ? `${extraction.extracted_count} pages read and prepared for research.` : 'Reading the source material and gathering useful evidence.' },
    { id: 'generate', color: 'yellow', icon: PenLine, title: 'Write the report', description: iterations > 0 ? `Refining the report after quality review · Revision ${iterations}.` : 'Bringing the findings together into a report with citations.' },
    { id: 'judge', color: 'green', icon: ShieldCheck, title: 'Review & refine', description: 'Checking relevance, depth, clarity, language, and formatting.' },
  ]

  return (
    <PipelineLayout title="A clearer picture is taking shape." topic={topic} mode="Research" activity={activeIndex < 0 ? 'Preparing your research…' : `Step ${activeIndex + 1} of 4 · ${steps[activeIndex].title}`}>
      <div className="pipeline-body">
        <PipelineSteps steps={steps} activeIndex={activeIndex} />
        <aside className="pipeline-aside">
          <section className="pipeline-section"><h2>Room for a better answer.</h2><p>Your report is reviewed before it’s ready. If it needs another pass, you’ll see the writing and review steps run again.</p></section>
          <QualityScores scores={scores?.judge} />
          <p className="pipeline-footnote">Your report and sources will open here when the research is complete.</p>
        </aside>
      </div>
    </PipelineLayout>
  )
}
