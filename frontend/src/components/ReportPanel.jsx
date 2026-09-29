import { useEffect, useRef } from 'react'
import MarkdownReport from './MarkdownReport'
import { FileDown, Plus, Loader2, Menu, MessageSquare } from 'lucide-react'

function SourcesList({ sources }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-8 pt-6 border-t border-black/10">
      <h2 className="text-sm font-semibold text-black uppercase tracking-wider mb-4">
        References
      </h2>
      <ol className="space-y-4">
        {sources.map((source) => {
          const id = source.id || source.source_number;
          return (
          <li
            key={id}
            id={`ref-${id}`}
            className="flex gap-3 text-sm group"
          >
            <span className="text-black/50 font-mono shrink-0">
              [{id}]
            </span>
            <div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:underline underline-offset-2 font-medium break-all"
              >
                {source.title || source.url}
              </a>
              <p className="text-black/60 text-xs mt-1 line-clamp-2 break-all">
                {source.snippet}
              </p>
            </div>
          </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ReportPanel({
  topic,
  report,
  sources,
  isChatOpen,
  isUpdatingReport,
  onExportPdf,
  onNewResearch,
  exporting,
  onToggleSidebar,
  isSidebarOpen,
  hasMessages,
  onToggleChat
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
      className={`h-full flex flex-col overflow-y-auto relative bg-white transition-all duration-300 text-black ${
        isChatOpen ? 'w-full' : 'w-full px-4 md:px-12 lg:px-32 py-6 pb-32'
      }`}
    >
      {/* Grainy effect overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply z-50"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>

      {/* Sticky top navigation bar */}
      <div 
        className={`sticky top-0 z-20 flex items-center justify-between py-4 border-b border-black/10 bg-white/90 backdrop-blur-md px-6 -mx-6 mb-6`}
      >
        <div className="flex items-center gap-4 min-w-0 pr-4">
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 -ml-2 rounded-md hover:bg-black/5 text-black/60 hover:text-black transition-colors cursor-pointer"
              title="Open Sidebar"
            >
              <Menu size={20} />
            </button>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-black/50 tracking-widest uppercase font-mono mb-0.5">
              Research Dossier
            </span>
            <h1 className="text-base md:text-lg font-bold text-black truncate font-sans" title={topic}>
              {topic}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* Export PDF Button */}
          <button
            onClick={onExportPdf}
            disabled={exporting}
            className="flex items-center space-x-2 px-3 py-2 bg-black hover:bg-black/80 disabled:bg-black/10 disabled:text-black/40 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-all duration-200 cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{exporting ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* Toggle Chat Button */}
          {hasMessages && !isChatOpen && (
            <button
              onClick={onToggleChat}
              className="flex items-center space-x-2 px-3 py-2 rounded-md border border-black hover:bg-black/5 text-black text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open Chat</span>
            </button>
          )}

          {/* New Research Button (Only shown when chat is NOT open or on large screens/view 1) */}
          {!isChatOpen && (
            <button
              onClick={onNewResearch}
              className="flex items-center space-x-2 px-3 py-2 rounded-md border border-black hover:bg-black/5 text-black text-sm font-medium transition-all duration-200 cursor-pointer"
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
        <MarkdownReport content={report} sources={sources} />
        <SourcesList sources={sources} />
      </div>

      {/* Updating Loading Overlay */}
      {isUpdatingReport && (
        <div className="absolute inset-0 bg-white/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center space-y-4 px-6 text-center">
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-black/20 border-t-black animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-black font-sans text-sm font-medium">
                Updating report
              </p>
              <p className="text-black/50 font-mono text-xs max-w-xs">
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
