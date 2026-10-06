import { cooldownMessage } from '../hooks/useQuotaCooldowns'
import React from 'react'

export default function ErrorView({ topic, errorMsg, onRetry, onReset, errorStatus, cooldownSeconds = 0 }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative bg-[#030303]">
      {/* Background ambient glows */}
      <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-red-950/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6 text-center animate-fade-in">
        {/* Error Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {errorStatus === 429 ? 'Report limit reached' : errorStatus === 503 ? 'Temporarily unavailable' : 'Research Failed'}
          </h2>
          <p className="text-zinc-400 text-sm">
            {errorStatus === 429 ? 'Your report allowance will become available as earlier requests leave the hourly window.' : errorStatus === 503 ? 'Please try again shortly. You can still read your saved reports.' : 'We encountered an unexpected error while retrieving or formatting the research report.'}
          </p>
        </div>

        {/* Failed Topic and Detail Box */}
        <div className="bg-zinc-900 rounded-2xl p-5 space-y-4 border border-red-500/10 text-left">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
              Target Topic
            </span>
            <span className="text-sm font-semibold text-zinc-300 font-mono">
              "{topic}"
            </span>
          </div>

          <div className="border-t border-zinc-800/60 pt-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
              Error Details
            </span>
            <p role="alert" className="text-xs text-red-400 font-mono leading-relaxed bg-red-950/20 p-3 rounded-lg border border-red-950/30 break-words">
              {errorStatus === 429 ? (cooldownSeconds > 0 ? cooldownMessage(cooldownSeconds) : 'You can try generating your report again.') : errorMsg || 'Unable to connect. Please try again.'}
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="retry-research-button"
            onClick={onRetry}
            disabled={cooldownSeconds > 0}
            className="disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            {cooldownSeconds > 0 ? cooldownMessage(cooldownSeconds) : 'Try Again'}
          </button>
          
          <button
            id="back-to-start-button"
            onClick={onReset}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all duration-300"
          >
            Back to Start
          </button>
        </div>
      </div>
    </div>
  )
}
