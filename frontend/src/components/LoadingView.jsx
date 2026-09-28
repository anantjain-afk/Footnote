import React from 'react'

export default function LoadingView({ topic, currentNode, scores, events, iterations }) {
  const steps = [
    {
      id: 'search',
      title: "Searching the web",
      defaultDesc: "Gathering source articles and reference data using Tavily Search API",
      provider: "Tavily"
    },
    {
      id: 'extract_contents',
      title: "Extracting content",
      defaultDesc: "Scraping page contents, filtering fluff, and cleaning raw texts via Firecrawl",
      provider: "Firecrawl"
    },
    {
      id: 'generate',
      title: "Generating report",
      defaultDesc: "Synthesizing arguments, drafting detailed markdown sections using Groq LLM",
      provider: "Groq LLM"
    },
    {
      id: 'critique',
      title: "Reviewing quality",
      defaultDesc: "Verifying formatting, fact-checking, and refining report criteria using Judge LLM",
      provider: "Judge LLM"
    }
  ]

  const getStepIndex = () => {
    if (!currentNode) return 0;
    if (currentNode === 'search') return 0;
    if (currentNode === 'extract_contents') return 1;
    if (currentNode === 'generate') return 2;
    if (currentNode === 'judge' || currentNode === 'route') return 3;
    return 3;
  }

  const activeStepIndex = getStepIndex();

  const getDescription = (stepId) => {
    if (stepId === 'search') {
      const searchEndEvent = events?.slice().reverse().find(e => e.type === 'end' && e.node === 'search');
      if (searchEndEvent) return `Found ${searchEndEvent.details?.urls?.length || 0} URLs`;
      if (currentNode === 'search') return 'Querying Tavily search API...';
      return steps[0].defaultDesc;
    }
    if (stepId === 'extract_contents') {
      const extractEndEvent = events?.slice().reverse().find(e => e.type === 'end' && e.node === 'extract_contents');
      if (extractEndEvent) return `Extracted ${extractEndEvent.details?.extracted_count || 0} pages`;
      if (currentNode === 'extract_contents') return 'Scraping page contents...';
      return steps[1].defaultDesc;
    }
    if (stepId === 'generate') {
      if (currentNode === 'generate') return iterations > 0 ? `Revising report (Iteration ${iterations})...` : 'Drafting sections...';
      if (iterations > 0) return `Drafted report after ${iterations} iterations`;
      return steps[2].defaultDesc;
    }
    if (stepId === 'critique') {
      if (scores && scores.judge) {
        const s = scores.judge;
        return `Rel: ${s.relevance?.toFixed(1)} | Dep: ${s.depth?.toFixed(1)} | Cla: ${s.clarity?.toFixed(1)} | Lng: ${s.language?.toFixed(1)} | Fmt: ${s.format?.toFixed(1)}`;
      }
      if (currentNode === 'judge') return 'Evaluating quality...';
      if (currentNode === 'route') return 'Checking metrics...';
      return steps[3].defaultDesc;
    }
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative bg-[#030303]">
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-[450px] h-[450px] bg-blue-900/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="w-full max-w-xl z-10 space-y-10 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            <span className="text-xs font-semibold text-purple-400 tracking-wider uppercase">
              Research Pipeline Active
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Investigating Topic
          </h2>
          <div className="inline-block px-5 py-2.5 rounded-xl border border-zinc-800 bg-[#0c0c0e]/80 text-zinc-300 font-mono text-sm max-w-full truncate shadow-inner">
            "{topic}"
          </div>
        </div>

        <div className="relative glass-panel rounded-2xl p-6 md:p-8 space-y-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="absolute left-[37px] top-[40px] bottom-[40px] w-0.5 bg-zinc-800 pointer-events-none">
            <div
              className="w-full bg-gradient-to-b from-purple-500 via-blue-500 to-emerald-500 transition-all duration-1000 ease-out"
              style={{
                height: `${(activeStepIndex / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {steps.map((step, idx) => {
            const isCompleted = idx < activeStepIndex
            const isActive = idx === activeStepIndex
            const isPending = idx > activeStepIndex

            return (
              <div
                key={step.id}
                className={`flex items-start space-x-6 transition-all duration-500 ${
                  isActive ? 'opacity-100 scale-[1.01]' : isPending ? 'opacity-35' : 'opacity-85'
                }`}
              >
                <div className="relative z-10 flex items-center justify-center">
                  {isCompleted ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-300">
                      <svg className="w-4 h-4 text-zinc-950 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isActive ? (
                    <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)] animate-pulse-slow">
                      <svg className="animate-spin h-4.5 w-4.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-semibold">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={`font-semibold text-base ${isActive ? 'text-purple-400' : 'text-zinc-200'}`}>
                      {step.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono tracking-wider font-semibold border ${
                      isActive 
                        ? 'bg-purple-950/40 text-purple-300 border-purple-800/40' 
                        : isCompleted
                        ? 'bg-emerald-950/20 text-emerald-300 border-emerald-900/30'
                        : 'bg-zinc-900/80 text-zinc-500 border-zinc-800'
                    }`}>
                      {step.provider}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {getDescription(step.id)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center font-mono text-xs text-zinc-500 animate-pulse">
          Retrieving web intelligence and synthesizing report. Please stand by...
        </p>
      </div>
    </div>
  )
}

