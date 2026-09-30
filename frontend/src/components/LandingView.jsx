import React, { useState, useEffect, useRef } from 'react'
import { Menu, Search, Sparkles, Zap, BookOpen, Shield, Brain, ArrowRight, CheckCircle2, Globe, FileText, BarChart3, RefreshCw, Clock, GraduationCap, Lightbulb, Target, Layers, ChevronRight, Star, Play } from 'lucide-react'

export default function LandingView({ onSubmit, onToggleSidebar, isSidebarOpen }) {
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState('normal')
  const [activeFeature, setActiveFeature] = useState(0)
  const [demoStep, setDemoStep] = useState(0)
  const [demoRunning, setDemoRunning] = useState(false)
  const [visibleSections, setVisibleSections] = useState(new Set())
  const sectionRefs = useRef({})

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (topic.trim()) {
      onSubmit(topic.trim(), mode)
    }
  }

  const examples = [
    "Quantum Computing advancements in cryptography",
    "Recent breakthroughs in commercial Fusion Energy",
    "LLM agents vs. traditional workflow automation"
  ]

  // Intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]))
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Demo simulation
  const demoSteps = [
    { label: 'Searching the web', detail: 'Querying 12 sources via Tavily...', icon: Globe, duration: 1800 },
    { label: 'Extracting content', detail: 'Scraping & cleaning 8 articles...', icon: FileText, duration: 1500 },
    { label: 'Generating report', detail: 'Synthesizing with Groq LLM...', icon: Brain, duration: 2000 },
    { label: 'Quality review', detail: 'Dual-judge evaluation pass...', icon: Shield, duration: 1200 },
    { label: 'Report ready', detail: '4,200 words · 12 citations · 94% quality', icon: CheckCircle2, duration: 0 },
  ]

  const runDemo = () => {
    if (demoRunning) return
    setDemoRunning(true)
    setDemoStep(0)
    let step = 0
    const advance = () => {
      if (step < demoSteps.length - 1) {
        step++
        setDemoStep(step)
        if (step < demoSteps.length - 1) {
          setTimeout(advance, demoSteps[step].duration)
        } else {
          setTimeout(() => setDemoRunning(false), 2000)
        }
      }
    }
    setTimeout(advance, demoSteps[0].duration)
  }

  const features = [
    {
      icon: Brain,
      title: 'Multi-Agent Pipeline',
      desc: 'Specialized AI agents collaborate — a searcher, an extractor, a writer, and two judges — each excelling at their task.',
      color: 'purple',
    },
    {
      icon: Shield,
      title: 'Dual-Judge Evaluation',
      desc: 'Every report passes through two independent AI judges that score quality, accuracy, and completeness before delivery.',
      color: 'yellow',
    },
    {
      icon: RefreshCw,
      title: 'Self-Refinement Loop',
      desc: 'If quality falls below threshold, the pipeline autonomously rewrites and re-evaluates — no human nudging required.',
      color: 'purple',
    },
    {
      icon: Globe,
      title: 'Deep Web Search',
      desc: 'Tavily API searches and ranks the most relevant, up-to-date sources across the entire web for your topic.',
      color: 'yellow',
    },
    {
      icon: Zap,
      title: 'Real-Time Streaming',
      desc: 'Watch every stage unfold live — from search queries to content extraction to the final polished report.',
      color: 'purple',
    },
    {
      icon: BookOpen,
      title: 'Structured Reports',
      desc: 'Get well-organized markdown reports with proper citations, sections, and export-ready formatting.',
      color: 'yellow',
    },
  ]

  const whyCards = [
    {
      icon: Clock,
      stat: '10×',
      label: 'Faster Research',
      desc: 'What takes hours of reading, comparing, and summarizing happens in under 2 minutes.',
    },
    {
      icon: GraduationCap,
      stat: '94%',
      label: 'Quality Score',
      desc: 'Dual-judge evaluation ensures reports meet academic rigor before you ever see them.',
    },
    {
      icon: Target,
      stat: '12+',
      label: 'Sources Per Report',
      desc: 'Every claim is backed by real, verifiable web sources — no hallucinated references.',
    },
    {
      icon: Lightbulb,
      stat: '0',
      label: 'Manual Steps',
      desc: 'From topic to polished report — fully autonomous. Just type and wait.',
    },
  ]

  const workflowSteps = [
    { step: '01', title: 'Enter your topic', desc: 'Type any research question — from quantum physics to market analysis.', icon: Search },
    { step: '02', title: 'AI agents search & extract', desc: 'Specialized agents scour the web, extract content, and filter noise.', icon: Globe },
    { step: '03', title: 'Report generated & judged', desc: 'A structured report is drafted, then scored by two independent AI judges.', icon: FileText },
    { step: '04', title: 'Auto-refine if needed', desc: 'Below threshold? The pipeline rewrites and re-evaluates autonomously.', icon: RefreshCw },
    { step: '05', title: 'Chat with your report', desc: 'Ask follow-up questions, request revisions, or dive deeper into sections.', icon: Sparkles },
  ]

  const sectionClass = (id) =>
    `transition-all duration-700 ease-out ${visibleSections.has(id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`

  return (
    <div className="min-h-screen bg-white overflow-y-auto overflow-x-hidden">


      {/* ════════════════════════════════════════════════════════════════
           HERO SECTION
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-28 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Ambient gradient blobs */}
        <div className="absolute top-[-120px] left-[-80px] w-[500px] h-[500px] rounded-full bg-purple-200/40 blur-[120px] pointer-events-none" />
        <div className="absolute top-[-60px] right-[-100px] w-[400px] h-[400px] rounded-full bg-yellow-200/50 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-100/30 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-3xl space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-yellow-50 border border-purple-200/60 text-sm font-medium text-purple-700">
            <Sparkles size={14} className="text-yellow-500" />
            Powered by Tavily, Groq & LangGraph
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-black leading-[1.08]">
            Research that
            <span className="relative inline-block ml-3">
              <span className="relative z-10">thinks</span>
              <span className="absolute bottom-1 left-0 right-0 h-3.5 bg-yellow-300/70 -z-0 rounded-sm" />
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">for itself.</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl text-black/55 font-medium max-w-xl mx-auto leading-relaxed">
            Type any topic. Our multi-agent AI pipeline searches the web, extracts insights, writes a structured report, and self-corrects — all in under 2 minutes.
          </p>

          {/* Search Input */}
          <form onSubmit={handleFormSubmit} className="w-full max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-400/20 via-yellow-300/20 to-purple-400/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative flex items-center bg-white rounded-2xl border border-black/10 shadow-lg shadow-black/[0.03] group-focus-within:border-purple-300 group-focus-within:shadow-purple-200/20 transition-all duration-300">
                <Search size={20} className="ml-5 text-black/30 flex-shrink-0" />
                <input
                  id="research-topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What would you like to research today?"
                  className="flex-1 px-4 py-5 text-black placeholder-black/35 text-[17px] bg-transparent focus:outline-none"
                />
                <button
                  id="generate-report-button"
                  type="submit"
                  disabled={!topic.trim()}
                  className="mr-2.5 px-7 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:from-black/15 disabled:to-black/10 disabled:text-black/30 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-purple-300/30 active:scale-[0.97] cursor-pointer flex items-center gap-2"
                >
                  Generate
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </form>

          {/* Mode Selector */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setMode('normal')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                mode === 'normal'
                  ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm'
                  : 'bg-white/60 text-black/40 border border-black/[0.06] hover:bg-white hover:text-black/60'
              }`}
            >
              <Zap size={16} className={mode === 'normal' ? 'text-purple-500' : 'text-black/30'} />
              Normal
            </button>
            <button
              onClick={() => setMode('deep_research')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                mode === 'deep_research'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                  : 'bg-white/60 text-black/40 border border-black/[0.06] hover:bg-white hover:text-black/60'
              }`}
              title="Decomposes topic into sub-questions and researches them in parallel for deeper coverage"
            >
              <Brain size={16} className={mode === 'deep_research' ? 'text-blue-500' : 'text-black/30'} />
              Deep Research
            </button>
          </div>

          {/* Example chips */}
          <div className="space-y-3">
            <span className="text-xs font-semibold tracking-wider text-black/35 uppercase">
              Try an example
            </span>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
              {examples.map((example, idx) => (
                <button
                  key={idx}
                  id={`example-prompt-${idx}`}
                  type="button"
                  onClick={() => setTopic(example)}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-black/55 hover:text-purple-700 bg-purple-50/50 border border-purple-100/60 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 cursor-pointer"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           FEATURES SECTION
         ════════════════════════════════════════════════════════════════ */}
      <section
        id="features"
        ref={(el) => (sectionRefs.current['features'] = el)}
        className={`py-24 px-6 ${sectionClass('features')}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200/60 text-xs font-bold tracking-wider text-yellow-700 uppercase">
              <Layers size={12} />
              Features
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight">
              Not just another AI tool
            </h2>
            <p className="text-lg text-black/50 font-medium max-w-lg mx-auto">
              A purpose-built research pipeline where every component is optimized for depth, accuracy, and clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon
              const isPurple = f.color === 'purple'
              return (
                <div
                  key={i}
                  onMouseEnter={() => setActiveFeature(i)}
                  className={`group relative p-7 rounded-2xl border transition-all duration-300 cursor-default
                    ${activeFeature === i
                      ? isPurple
                        ? 'bg-purple-50/70 border-purple-200 shadow-lg shadow-purple-100/40'
                        : 'bg-yellow-50/70 border-yellow-200 shadow-lg shadow-yellow-100/40'
                      : 'bg-white border-black/[0.06] hover:border-black/10 hover:shadow-md hover:shadow-black/[0.03]'
                    }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300
                    ${activeFeature === i
                      ? isPurple ? 'bg-purple-500 text-white' : 'bg-yellow-400 text-black'
                      : 'bg-black/[0.04] text-black/60 group-hover:bg-black/[0.06]'
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-[17px] font-bold text-black mb-2">{f.title}</h3>
                  <p className="text-[15px] text-black/50 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           INTERACTIVE DEMO
         ════════════════════════════════════════════════════════════════ */}
      <section
        id="demo"
        ref={(el) => (sectionRefs.current['demo'] = el)}
        className={`py-24 px-6 ${sectionClass('demo')}`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-xs font-bold tracking-wider text-purple-700 uppercase">
              <Play size={12} />
              Live Demo
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight">
              See it in action
            </h2>
            <p className="text-lg text-black/50 font-medium max-w-md mx-auto">
              Watch how ResearchAI processes a topic from start to finish.
            </p>
          </div>

          <div className="relative bg-gradient-to-br from-purple-50/50 via-white to-yellow-50/50 rounded-3xl border border-black/[0.06] p-8 md:p-12 shadow-xl shadow-purple-100/10">
            {/* Demo topic bar */}
            <div className="flex items-center gap-3 mb-10 p-4 rounded-xl bg-white border border-black/[0.06] shadow-sm">
              <Search size={18} className="text-purple-400 flex-shrink-0" />
              <span className="text-[15px] text-black/70 font-medium">"Impact of large language models on scientific peer review"</span>
            </div>

            {/* Pipeline steps */}
            <div className="space-y-4">
              {demoSteps.map((s, i) => {
                const StepIcon = s.icon
                const isActive = demoRunning && demoStep === i
                const isDone = demoRunning && demoStep > i
                const isFinal = i === demoSteps.length - 1 && demoStep === i && demoRunning
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500
                      ${isFinal
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 border-purple-500 text-white shadow-lg shadow-purple-200/40'
                        : isDone
                          ? 'bg-purple-50/60 border-purple-200/60'
                          : isActive
                            ? 'bg-yellow-50 border-yellow-300 shadow-md shadow-yellow-100/40'
                            : 'bg-white/60 border-black/[0.04]'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-500
                      ${isFinal ? 'bg-white/20 text-white'
                        : isDone ? 'bg-purple-500 text-white'
                        : isActive ? 'bg-yellow-400 text-black' : 'bg-black/[0.04] text-black/40'
                      }`}
                    >
                      {isDone && !isFinal ? <CheckCircle2 size={18} /> : <StepIcon size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[15px] font-bold ${isFinal ? 'text-white' : isDone ? 'text-purple-700' : isActive ? 'text-yellow-800' : 'text-black/40'}`}>
                        {s.label}
                      </div>
                      <div className={`text-[13px] mt-0.5 ${isFinal ? 'text-white/80' : isDone ? 'text-purple-500' : isActive ? 'text-yellow-600' : 'text-black/25'}`}>
                        {s.detail}
                      </div>
                    </div>
                    {isActive && !isFinal && (
                      <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    {isDone && !isFinal && (
                      <CheckCircle2 size={18} className="text-purple-500 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Run button */}
            <div className="mt-8 text-center">
              <button
                onClick={runDemo}
                disabled={demoRunning}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-[15px] text-black bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer shadow-md shadow-yellow-200/30 hover:shadow-lg hover:shadow-yellow-200/40 active:scale-[0.97]"
              >
                <Play size={16} />
                {demoRunning ? 'Running...' : 'Run Demo Pipeline'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           WHY RESEARCHAI — STATS
         ════════════════════════════════════════════════════════════════ */}
      <section
        id="why"
        ref={(el) => (sectionRefs.current['why'] = el)}
        className={`py-24 px-6 bg-gradient-to-b from-white via-purple-50/30 to-white ${sectionClass('why')}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/60 text-xs font-bold tracking-wider text-purple-700 uppercase">
              <Star size={12} />
              Why ResearchAI
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight">
              Built for students who
              <span className="relative inline-block ml-2">
                <span className="relative z-10">mean business</span>
                <span className="absolute bottom-0.5 left-0 right-0 h-3 bg-yellow-300/60 -z-0 rounded-sm" />
              </span>
            </h2>
            <p className="text-lg text-black/50 font-medium max-w-lg mx-auto">
              Stop spending hours on literature reviews. Let AI handle the heavy lifting while you focus on what matters — your ideas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {whyCards.map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} className="group p-7 rounded-2xl bg-white border border-black/[0.06] hover:border-purple-200 hover:shadow-xl hover:shadow-purple-100/20 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center mb-5 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                    <Icon size={20} />
                  </div>
                  <div className="text-4xl font-black text-black mb-1 tracking-tight">{card.stat}</div>
                  <div className="text-[15px] font-bold text-purple-600 mb-2">{card.label}</div>
                  <p className="text-[14px] text-black/45 leading-relaxed">{card.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           HOW IT WORKS — WORKFLOW
         ════════════════════════════════════════════════════════════════ */}
      <section
        id="workflow"
        ref={(el) => (sectionRefs.current['workflow'] = el)}
        className={`py-24 px-6 ${sectionClass('workflow')}`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200/60 text-xs font-bold tracking-wider text-yellow-700 uppercase">
              <Layers size={12} />
              How It Works
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight">
              From topic to report in 5 steps
            </h2>
            <p className="text-lg text-black/50 font-medium max-w-md mx-auto">
              A fully automated pipeline that handles every stage of the research process.
            </p>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-purple-300 via-yellow-300 to-purple-300" />

            <div className="space-y-8">
              {workflowSteps.map((ws, i) => {
                const WIcon = ws.icon
                const isPurple = i % 2 === 0
                return (
                  <div key={i} className="relative flex items-start gap-6 md:gap-8 group">
                    {/* Node */}
                    <div className={`relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300 group-hover:scale-110
                      ${isPurple
                        ? 'bg-purple-500 border-purple-500 text-white group-hover:shadow-lg group-hover:shadow-purple-200/50'
                        : 'bg-yellow-400 border-yellow-400 text-black group-hover:shadow-lg group-hover:shadow-yellow-200/50'
                      }`}
                    >
                      <WIcon size={20} />
                    </div>
                    {/* Content */}
                    <div className="pt-2 pb-2 flex-1">
                      <div className={`text-xs font-bold tracking-wider mb-1 ${isPurple ? 'text-purple-400' : 'text-yellow-500'}`}>
                        STEP {ws.step}
                      </div>
                      <h3 className="text-xl font-bold text-black mb-1.5">{ws.title}</h3>
                      <p className="text-[15px] text-black/45 leading-relaxed">{ws.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           STUDENT BENEFITS
         ════════════════════════════════════════════════════════════════ */}
      <section
        id="students"
        ref={(el) => (sectionRefs.current['students'] = el)}
        className={`py-24 px-6 ${sectionClass('students')}`}
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — text */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200/60 text-xs font-bold tracking-wider text-yellow-700 uppercase mb-5">
                  <GraduationCap size={12} />
                  For Students
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-black tracking-tight leading-tight mb-4">
                  Your research workflow,
                  <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent"> fully automated</span>
                </h2>
                <p className="text-lg text-black/50 font-medium leading-relaxed">
                  ResearchAI isn't a chatbot that guesses. It's a structured pipeline that searches real sources, extracts real data, and writes reports that pass real scrutiny.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'Literature reviews in minutes', desc: 'No more tab-hoarding. Get a synthesized overview of any topic with proper citations.' },
                  { title: 'Verifiable sources, not hallucinations', desc: 'Every claim links back to real web sources you can check yourself.' },
                  { title: 'Chat with your report', desc: 'Ask follow-up questions, request deeper dives, or challenge any section.' },
                  { title: 'Export-ready formatting', desc: 'Structured markdown with headings, bullet points, and citations — ready for your paper.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-200">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <div className="text-[15px] font-bold text-black">{item.title}</div>
                      <div className="text-[14px] text-black/45 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — visual card */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-purple-100/40 via-yellow-100/20 to-purple-100/30 blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-black/[0.06] shadow-xl shadow-purple-100/10 overflow-hidden">
                {/* Mock browser chrome */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-black/[0.06] bg-gradient-to-r from-purple-50/50 to-yellow-50/50">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  </div>
                  <div className="flex-1 text-center text-[11px] text-black/30 font-medium">researchai.app</div>
                </div>
                {/* Mock report content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 size={14} className="text-purple-500" />
                    <span className="text-[11px] font-bold text-purple-500 tracking-wider uppercase">Generated Report</span>
                  </div>
                  <div className="text-lg font-bold text-black leading-snug">Impact of Large Language Models on Scientific Peer Review</div>
                  <div className="flex gap-3 text-[11px] text-black/40 font-medium">
                    <span>4,200 words</span>
                    <span>·</span>
                    <span>12 sources</span>
                    <span>·</span>
                    <span className="text-purple-500 font-bold">94% quality</span>
                  </div>
                  <div className="h-px bg-black/[0.06]" />
                  {/* Mock sections */}
                  <div className="space-y-3">
                    {['1. Introduction & Background', '2. Current Applications in Peer Review', '3. Accuracy & Bias Analysis', '4. Ethical Considerations', '5. Future Outlook & Recommendations'].map((s, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-purple-50/40 transition-colors">
                        <ChevronRight size={14} className="text-purple-300" />
                        <span className="text-[14px] text-black/60 font-medium">{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-black/[0.06]" />
                  {/* Mock citations */}
                  <div>
                    <div className="text-[11px] font-bold text-black/30 tracking-wider uppercase mb-2">Sources</div>
                    <div className="space-y-1.5">
                      {['nature.com', 'arxiv.org', 'science.org'].map((src, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          <span className="text-[12px] text-black/40">{src}</span>
                        </div>
                      ))}
                      <span className="text-[12px] text-purple-400 font-medium">+9 more sources</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           CTA BANNER
         ════════════════════════════════════════════════════════════════ */}
      <section
        id="cta"
        ref={(el) => (sectionRefs.current['cta'] = el)}
        className={`py-20 px-6 ${sectionClass('cta')}`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-purple-700" />
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-yellow-400/20 blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-purple-300/30 blur-[60px]" />

            <div className="relative z-10 px-10 py-16 md:px-16 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Ready to automate your research?
              </h2>
              <p className="text-lg text-white/70 font-medium max-w-md mx-auto">
                Start your first AI-powered research report now. It's free, fast, and surprisingly thorough.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-[15px] text-black bg-yellow-400 hover:bg-yellow-300 transition-all duration-200 cursor-pointer shadow-lg shadow-black/10 hover:shadow-xl active:scale-[0.97]"
              >
                Start Researching
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           FOOTER
         ════════════════════════════════════════════════════════════════ */}
      <footer className="py-10 px-6 border-t border-black/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-[15px] font-bold text-black">ResearchAI</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-black/40 font-medium">
            <span>Powered by Tavily · Groq · LangGraph</span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">Built with ❤️ for students & researchers</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
