import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { exportReportPDF } from '../api/research'

export function ReportViewer({ topic, report, sources = [], generatedAt, onReset }) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportReportPDF(topic, report, sources)
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  // Format date nicely
  const formatDate = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  return (
    <div className="min-h-screen py-10 px-4 md:px-6 relative bg-[#030303]">
      {/* Background ambient glows */}
      <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-purple-900/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-blue-900/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto space-y-8 z-10 relative">
        {/* Navigation & Metadata Header */}
        <div className="glass-panel rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-zinc-800/80">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-purple-400 tracking-wider uppercase font-mono">
              Research Dossier
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-white truncate max-w-lg" title={topic}>
              {topic}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-zinc-500 font-mono">
              <span>Generated at:</span>
              <span className="text-zinc-400">{formatDate(generatedAt)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Copy Button */}
            <button
              id="copy-report-button"
              onClick={handleCopy}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                copied
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                  : 'bg-zinc-900/60 border-zinc-850 hover:border-purple-500/30 text-zinc-300 hover:text-white'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Report</span>
                </>
              )}
            </button>

            {/* Export PDF Button */}
            <button
              id="export-pdf-button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-900/40 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{exporting ? 'Generating PDF...' : 'Export PDF'}</span>
            </button>

            {/* Reset Button */}
            <button
              id="new-research-button"
              onClick={onReset}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold transition-all duration-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Research</span>
            </button>
          </div>
        </div>

        {/* Report Content Container */}
        <div className="glass-panel rounded-3xl p-6 md:p-12 shadow-2xl border border-zinc-800/80 relative overflow-hidden">
          {/* Subtle side glowing effects */}
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-500/5 rounded-full blur-[60px]" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-blue-500/5 rounded-full blur-[60px]" />

          {/* Scrollable markdown body */}
          <div className="max-w-[800px] mx-auto overflow-y-auto markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {report}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportViewer
