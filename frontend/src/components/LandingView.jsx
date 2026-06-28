import React, { useState } from 'react'

export default function LandingView({ onSubmit }) {
  const [topic, setTopic] = useState('')

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (topic.trim()) {
      onSubmit(topic.trim())
    }
  }

  const examples = [
    "Quantum Computing advancements in cryptography",
    "Recent breakthroughs in commercial Fusion Energy",
    "LLM agents vs. traditional workflow automation"
  ]

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden bg-[#030303]">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-2xl text-center z-10 space-y-8 animate-fade-in">
        {/* Logo and Brand */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5 text-purple-300 text-xs font-semibold tracking-wider uppercase mb-2">
            🚀 Powered by Tavily & Groq
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent animate-glow-pulse">
            Research<span className="bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">AI</span>
          </h1>
          <p className="text-zinc-400 text-base md:text-lg font-medium max-w-md mx-auto">
            Deep research, instantly. Input any topic and watch our multi-agent pipeline do the heavy lifting.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="relative group">
            {/* Ambient glow behind the input box */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-50" />
            
            <div className="relative flex items-center">
              <input
                id="research-topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What would you like to research today?"
                className="w-full px-6 py-5 pr-36 rounded-2xl text-zinc-100 placeholder-zinc-500 text-lg bg-[#0c0c0e]/90 border border-zinc-800/85 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all duration-300 glass-input"
              />
              <button
                id="generate-report-button"
                type="submit"
                disabled={!topic.trim()}
                className="absolute right-3 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Generate
              </button>
            </div>
          </div>
        </form>

        {/* Example prompts */}
        <div className="pt-4 space-y-3">
          <span className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Try searching for
          </span>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {examples.map((example, idx) => (
              <button
                key={idx}
                id={`example-prompt-${idx}`}
                type="button"
                onClick={() => setTopic(example)}
                className="px-3.5 py-1.5 rounded-lg text-xs md:text-sm text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800/80 hover:border-purple-500/30 transition-all duration-200 cursor-pointer"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
