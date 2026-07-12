import { useEffect, useRef } from 'react'
import MarkdownReport from './MarkdownReport'
import { FileDown, Plus, Loader2 } from 'lucide-react'

export function ReportPanel({
  topic,
  report,
  isChatOpen,
  isUpdatingReport,
  onExportPdf,
  onNewResearch,
  exporting
}) {
  const panelRef = useRef(null)

  // Reset scroll position to top when report content updates
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [report])

  return (
    <div 
      ref={panelRef}
      className={`h-full flex flex-col overflow-y-auto relative bg-[#0a0a0a] transition-all duration-300 ${
        isChatOpen ? 'w-full' : 'max-w-4xl mx-auto w-full px-4 md:px-6 py-6 pb-32'
      }`}
    >
      {/* Sticky top navigation bar */}
      <div 
        className={`sticky top-0 z-20 flex items-center justify-between py-4 border-b border-[#2a2a2a] bg-[#0a0a0a]/90 backdrop-blur-md px-6 -mx-6 mb-6`}
      >
        <div className="flex flex-col min-w-0 pr-4">
          <span className="text-[10px] font-semibold text-indigo-400 tracking-widest uppercase font-mono mb-0.5">
            Research Dossier
          </span>
          <h1 className="text-base md:text-lg font-bold text-white truncate font-sans" title={topic}>
            {topic}
          </h1>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* Export PDF Button */}
          <button
            onClick={onExportPdf}
            disabled={exporting}
            className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-900/40 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* New Research Button (Only shown when chat is NOT open or on large screens/view 1) */}
          {!isChatOpen && (
            <button
              onClick={onNewResearch}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all duration-200 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Research</span>
            </button>
          )}
        </div>
      </div>

      {/* Report Markdown Area */}
      <div 
        key={report} 
        className={`flex-1 relative animate-[fade-in_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards] ${
          isChatOpen ? 'px-6 md:px-8 pb-12' : ''
        }`}
      >
        <MarkdownReport content={report} />
      </div>

      {/* Updating Loading Overlay */}
      {isUpdatingReport && (
        <div className="absolute inset-0 bg-[#0a0a0a]/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center space-y-4 px-6 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute w-8 h-8 rounded-full bg-indigo-500/5 blur-md animate-pulse" />
            </div>
            <div className="space-y-1">
              <p className="text-white font-sans text-sm font-semibold tracking-wide">
                Updating report
              </p>
              <p className="text-zinc-500 font-mono text-xs max-w-xs">
                Refining report structure based on requests...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportPanel
