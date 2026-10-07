import { ArrowRight } from 'lucide-react'
import './EntryViews.css'

export default function LandingView() {
  return (
    <div className="entry-page">
      <header className="entry-header">
        <a className="entry-brand" href="/">ResearchAI<span className="brand-period">.</span></a>
        <nav aria-label="Main navigation">
          <a className="entry-text-link" href="#how-it-works">How it works</a>
          <a className="entry-button entry-button-outline entry-auth-link" href="?auth=signin">Sign in <ArrowRight size={16} aria-hidden="true" /></a>
        </nav>
      </header>
      <main id="main-content" className="landing-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-intro">
            <h1 id="landing-title">Follow your <span className="entry-accent-underline">curiosity.</span><br />Find the bigger picture.</h1>
            <p className="entry-prose">Turn a question into a sourced research report. Explore the evidence, ask follow-up questions, and keep your thinking in one place.</p>
            <a className="entry-button entry-button-research" href="?auth=signup">Start researching <ArrowRight size={17} aria-hidden="true" /></a>
            <p className="entry-caption">Your next question is a good place to start.</p>
          </div>
          <figure className="report-preview">
            <figcaption>Inside a research report <span>Illustrative example</span></figcaption>
            <h2>What makes a city<br />more walkable?</h2>
            <p className="preview-summary">A research question opens up a wider picture: street design, daily destinations, and the way people move between them.</p>
            <h3>Look beyond the sidewalk</h3>
            <p>Explore how connected streets, access to public transport, and nearby amenities shape a neighborhood.</p>
            <div className="preview-reference">Sources sit alongside the report, ready to explore.</div>
            <div className="preview-followup"><span>Then ask a follow-up</span><p>How would this apply to a smaller city?</p><ArrowRight size={18} aria-hidden="true" /></div>
          </figure>
        </section>
        <section className="landing-workflow" id="how-it-works" aria-labelledby="workflow-title">
          <div><h2 id="workflow-title">From a question<br />to a clearer view.</h2><p className="entry-prose">Research you can return to, build on, and make your own.</p></div>
          <ol>
            <li><h3>Start with what you want to know</h3><p>Choose a focused report or deep research for a broader exploration. Follow progress as the research runs.</p></li>
            <li><h3>Read the report. Explore the sources.</h3><p>Review a structured report with references. Export it as a PDF when you’re ready to take it with you.</p></li>
            <li><h3>Keep the conversation going</h3><p>Ask questions, request revisions, and revisit earlier research from your personal dashboard.</p></li>
          </ol>
        </section>
        <section className="landing-close"><h2>Where will your next question lead?</h2><a className="entry-button entry-button-research" href="?auth=signup">Create an account <ArrowRight size={17} aria-hidden="true" /></a></section>
      </main>
      <footer className="entry-footer"><a className="entry-brand" href="/">ResearchAI.</a><span>A little curiosity. A deeper understanding.</span><a className="entry-text-link entry-auth-link" href="?auth=signin">Sign in</a></footer>
    </div>
  )
}
