import React, { useState } from 'react'
import { Menu } from 'lucide-react'

export default function LandingView({ onSubmit, onToggleSidebar, isSidebarOpen }) {
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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden bg-white">
      {/* Sidebar Toggle Button */}
      {!isSidebarOpen && (
        <button
          onClick={onToggleSidebar}
          className="absolute top-6 left-6 p-2 rounded-md hover:bg-black/5 text-black/60 hover:text-black transition-colors cursor-pointer z-50"
          title="Open Sidebar"
        >
          <Menu size={24} />
        </button>
      )}

      <div className="w-full max-w-2xl text-center z-10 space-y-8 animate-fade-in">
        {/* Logo and Brand */}
        <div className="space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-black/10 bg-black/5 text-black/60 text-xs font-semibold tracking-wider uppercase mb-2">
            🚀 Powered by Tavily & Groq
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-black">
            Research<span className="text-black/60">AI</span>
          </h1>
          <p className="text-black/60 text-base md:text-lg font-medium max-w-md mx-auto">
            Deep research, instantly. Input any topic and watch our multi-agent pipeline do the heavy lifting.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="relative group">
            <div className="relative flex items-center">
              <input
                id="research-topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What would you like to research today?"
                className="w-full px-6 py-5 pr-36 rounded-2xl text-black placeholder-black/40 text-lg bg-[#f4f4f5] border border-black/5 focus:outline-none focus:border-black/20 focus:bg-white focus:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all duration-300"
              />
              <button
                id="generate-report-button"
                type="submit"
                disabled={!topic.trim()}
                className="absolute right-3 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-black hover:bg-black/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Generate
              </button>
            </div>
          </div>
        </form>

        {/* Example prompts */}
        <div className="pt-4 space-y-3">
          <span className="text-xs font-semibold tracking-wider text-black/40 uppercase">
            Try searching for
          </span>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {examples.map((example, idx) => (
              <button
                key={idx}
                id={`example-prompt-${idx}`}
                type="button"
                onClick={() => setTopic(example)}
                className="px-3.5 py-1.5 rounded-lg text-xs md:text-sm text-black/60 hover:text-black bg-[#f4f4f5] border border-black/5 hover:border-black/20 transition-all duration-200 cursor-pointer"
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
