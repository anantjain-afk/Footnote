import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, FileText, Search } from 'lucide-react'
import city from '../assets/landing/city-optimized.png'
import evidencePaper from '../assets/landing/evidence-paper.png'
import reportPaper from '../assets/landing/report-paper.png'
import reviewPaper from '../assets/landing/review-paper.png'
import './LandingView.css'

const FLOWS = {
  normal: [
    { title: 'Search the web', tone: 'violet', summary: 'Finding sources and different perspectives.', entries: [
      { label: 'Source 01', title: 'Urban greenery and cooler cities', detail: 'A place to investigate tree cover and shade.' },
      { label: 'Source 02', title: 'Reflective materials in hot climates', detail: 'Another perspective on urban heat.' },
    ] },
    { title: 'Read the sources', tone: 'blue', summary: 'Reading pages and gathering useful evidence.', entries: [
      { label: 'Source 01', title: 'What does tree cover change?', detail: 'The relevant passages are gathered as evidence.' },
      { label: 'Source 02', title: 'Where do cool roofs help?', detail: 'Findings are compared across the sources.' },
    ] },
    { title: 'Write the report', tone: 'coral', summary: 'Bringing the findings together with references.', entries: [
      { label: 'Report draft', title: 'How can cities stay cooler?', detail: 'Sections connect the question to cited evidence.' },
      { label: 'References', title: 'Sources stay close to the answer', detail: 'Readers can open the material behind a claim.' },
    ] },
    { title: 'Review & refine', tone: 'green', summary: 'Checking relevance, depth, clarity and citations.', entries: [
      { label: 'Quality review', title: 'A closer look at the answer', detail: 'The report is checked before it is ready.' },
      { label: 'Ready to explore', title: 'Read, ask, and revise', detail: 'Continue the conversation with your report.' },
    ] },
  ],
  deep: [
    { title: 'Plan the questions', tone: 'violet', summary: 'Breaking a broad topic into focused questions.', entries: [
      { label: 'Question 01', title: 'What creates urban heat?', detail: 'Investigate the built environment.' },
      { label: 'Question 02', title: 'Which changes make a difference?', detail: 'Compare possible approaches.' },
    ] },
    { title: 'Research & reflect', tone: 'blue', summary: 'Gathering evidence and returning to gaps.', entries: [
      { label: 'Evidence', title: 'Sources across several questions', detail: 'Claims are gathered for each part of the plan.' },
      { label: 'Follow-up', title: 'What is still unclear?', detail: 'Missing evidence leads to another research pass.' },
    ] },
    { title: 'Write & assemble', tone: 'coral', summary: 'Writing sections and bringing them together.', entries: [
      { label: 'Section 01', title: 'How heat builds up', detail: 'Findings become a structured report section.' },
      { label: 'Section 02', title: 'Ways cities can respond', detail: 'Each section keeps its source trail.' },
    ] },
    { title: 'Verify & review', tone: 'green', summary: 'Checking claims against sources and evaluating quality.', entries: [
      { label: 'Verification', title: 'Trace claims to evidence', detail: 'The report is checked against gathered sources.' },
      { label: 'Quality review', title: 'Another pass when needed', detail: 'Gaps can return the report to research.' },
    ] },
  ],
}
const PAPER_ART = [null, evidencePaper, reportPaper, reviewPaper]

function MiniDocument({ step }) {
  if (step === 0) return <span className="lp-mini-search"><Search size={17} /> How can cities stay cooler? <ArrowRight size={18} /></span>
  return <img className="lp-mini-paper" src={PAPER_ART[step]} alt="" />
}

export default function LandingView() {
  const [mode, setMode] = useState('normal')
  const [stage, setStage] = useState(0)
  const storyRef = useRef(null)
  const current = FLOWS[mode][0]

  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const story = storyRef.current
        if (!story) return
        const chapters = [...story.querySelectorAll('[data-chapter]')]
        const midpoint = window.innerHeight * .45
        const active = chapters.findLastIndex(chapter => chapter.getBoundingClientRect().top <= midpoint)
        setStage(Math.max(0, active))
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const chapters = [...(storyRef.current?.querySelectorAll('.lp-chapter') ?? [])]
    if (!('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting))
    }, { threshold: .2 })
    chapters.forEach(chapter => observer.observe(chapter))
    return () => observer.disconnect()
  }, [mode])

  const goToStage = index => {
    setStage(index)
    const chapter = storyRef.current?.querySelector(`[data-chapter="${index}"]`)
    if (!chapter) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    chapter.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })
  }

  const chooseMode = next => setMode(next)
  const onTabKeyDown = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const next = mode === 'normal' ? 'deep' : 'normal'
    chooseMode(next)
    event.currentTarget.parentElement.querySelector(`[data-mode="${next}"]`)?.focus()
  }

  return (
    <div className="lp-page">
      <div className="lp-scroll-story" ref={storyRef}>
        <div className="lp-sticky" data-chapter="0">
          <header className="lp-header">
            <a className="lp-brand" href="/" aria-label="Footnote home">Footnote<span>.</span></a>
            <a className="lp-signin" href="?auth=signin">Sign in <ArrowRight size={17} aria-hidden="true" /></a>
          </header>

          <main id="main-content" className="lp-main">
            <div className="lp-intro">
              <div className="lp-tabs" role="tablist" aria-label="Research mode">
                <button type="button" role="tab" data-mode="normal" aria-selected={mode === 'normal'} tabIndex={mode === 'normal' ? 0 : -1} onClick={() => chooseMode('normal')} onKeyDown={onTabKeyDown}>Normal</button>
                <button type="button" role="tab" data-mode="deep" aria-selected={mode === 'deep'} tabIndex={mode === 'deep' ? 0 : -1} onClick={() => chooseMode('deep')} onKeyDown={onTabKeyDown}>Deep research</button>
              </div>
              <h1>Every answer<br />has a story<span>.</span></h1>
              <p>Follow a question from search to sourced report.</p>
              <a className="lp-primary" href="?auth=signup">Start researching <ArrowRight size={25} aria-hidden="true" /></a>
              {mode === 'deep' && <p className="lp-key-note">Deep research uses your own Firecrawl key.</p>}
            </div>

            <section className="lp-scene" data-stage="0" aria-label={`Illustrative ${mode === 'normal' ? 'normal' : 'deep'} research example`}>
              <img className="lp-city" src={city} alt="" />
              <img className="lp-hero-paper" src={evidencePaper} alt="" />
              <div className="lp-scene-content" role="tabpanel" aria-label={mode === 'normal' ? 'Normal research' : 'Deep research'}>
                <div className="lp-sample-line"><span>Illustrative example</span><i /></div>
                <div className="lp-scene-heading" aria-live="polite" aria-atomic="true"><span>01</span><h2>{current.title}</h2></div>
                <div className="lp-question"><Search size={26} aria-hidden="true" /><span>How can cities stay cooler?</span><span className="lp-question-arrow" aria-hidden="true"><ArrowRight size={24} /></span></div>
                <div className="lp-evidence" key={mode}>
                  <p className="lp-stage-summary">{current.summary}</p>
                  {current.entries.map(entry => <div className="lp-evidence-row" key={entry.label}>
                    <FileText size={29} strokeWidth={1.35} aria-hidden="true" />
                    <div><span>{entry.label}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div>
                  </div>)}
                </div>
              </div>
            </section>
          </main>

          <nav className="lp-filmstrip" aria-label={`${mode === 'normal' ? 'Normal' : 'Deep'} research stages`}>
            {FLOWS[mode].map((step, index) => <button key={step.title} type="button" className={`lp-frame lp-frame-${index} ${stage === index ? 'is-active' : ''}`} onClick={() => goToStage(index)} aria-current={stage === index ? 'step' : undefined} aria-label={`Show step ${index + 1}: ${step.title}`}>
              {index === 0 && <img src={city} alt="" className="lp-frame-city" />}
              <span className="lp-frame-heading"><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong></span>
              <MiniDocument step={index} />
            </button>)}
          </nav>
          <div className="lp-scroll-prompt"><ArrowDown size={20} aria-hidden="true" /><span>Scroll to follow the research</span></div>
        </div>
        {FLOWS[mode].slice(1).map((step, offset) => {
          const index = offset + 1
          return <section className={`lp-chapter lp-chapter-${index}`} data-chapter={index} key={`${mode}-${index}`} aria-labelledby={`lp-chapter-title-${index}`}>
            <div className="lp-chapter-copy">
              <h2 id={`lp-chapter-title-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{step.title}<i>.</i></h2>
              <p>{step.summary}</p>
              <div className="lp-chapter-progress" aria-hidden="true">{FLOWS[mode].map((item, itemIndex) => <span key={item.title} className={itemIndex <= index ? 'is-filled' : ''} />)}</div>
              <button type="button" className="lp-next-step" onClick={() => goToStage(index < 3 ? index + 1 : 0)}>{index < 3 ? 'Follow the next step' : 'Back to the beginning'} <ArrowRight size={19} aria-hidden="true" /></button>
            </div>
            <div className="lp-chapter-art">
              <img src={PAPER_ART[index]} alt="" className="lp-chapter-paper-art" />
              <div className="lp-chapter-sheet">
                <span className="lp-sheet-label">{index === 2 ? 'Report in progress' : index === 3 ? 'Research review' : 'Evidence board'}</span>
                <h3>{step.title}</h3>
                {step.entries.map(entry => <div className="lp-sheet-entry" key={entry.label}><span>{entry.label}</span><strong>{entry.title}</strong><p>{entry.detail}</p></div>)}
              </div>
              <span className="lp-chapter-caption">Illustrative {mode === 'normal' ? 'normal' : 'deep'} research example</span>
            </div>
          </section>
        })}
      </div>

      <section className="lp-result" aria-labelledby="lp-result-title">
        <div className="lp-result-heading"><h2 id="lp-result-title">A report you can follow.</h2><p>The research leads to a structured report. References stay alongside the writing, ready for a closer look.</p></div>
        <div className="lp-report-sample">
          <div className="lp-report-top"><span>Illustrative report</span><span>How can cities stay cooler?</span></div>
          <h3>What shapes a cooler city?</h3>
          <p>Start with the evidence. Explore how shade, materials, and the design of public space may affect a city’s experience of heat. <a href="#lp-source-1">[1]</a> <a href="#lp-source-2">[2]</a></p>
          <h4>Questions worth pursuing</h4>
          <p>Which approaches suit different neighborhoods? What evidence is still missing? A research report gives those questions room to be examined.</p>
          <div className="lp-report-references"><strong>References in this example</strong><span id="lp-source-1">[1] Illustrative source on urban shade</span><span id="lp-source-2">[2] Illustrative source on building materials</span></div>
        </div>
      </section>

      <section className="lp-conversation" aria-labelledby="lp-conversation-title">
        <div><h2 id="lp-conversation-title">The first answer is a beginning.</h2><p>Ask a follow-up, explore a different angle, or request a revision. Your research stays in one place.</p><a href="?auth=signup">Start your research <ArrowRight size={20} aria-hidden="true" /></a></div>
        <div className="lp-chat-sample" aria-label="Illustrative follow-up conversation"><span>Illustrative follow-up</span><p>How would this change for a smaller city?</p><div>Explore that question with the sources and report already in view. <ArrowRight size={20} aria-hidden="true" /></div></div>
      </section>

      <footer className="lp-footer"><a className="lp-brand" href="/">Footnote<span>.</span></a><span>A question is a good place to start.</span><a href="?auth=signin">Sign in</a></footer>
    </div>
  )
}
