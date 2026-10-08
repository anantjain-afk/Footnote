import { useEffect, useRef } from 'react'
import MarkdownReport from './MarkdownReport'
import { FileDown, Loader2, MessageSquare } from 'lucide-react'
import { ReportVersionControls, ReportVersionDiff } from './ReportVersionHistory'

function SourcesList({ sources }) {
  if (!sources || sources.length === 0) return null;
  const displayText = (value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(', ');
    if (value && typeof value === 'object') {
      return displayText(value.title || value.name || value.text || value.url || value.value || '');
    }
    return '';
  };
  return (
    <div className="mt-8 pt-6 border-t border-black/10">
      <h2 className="text-sm font-semibold text-black uppercase tracking-wider mb-4">
        References
      </h2>
      <ol className="space-y-4">
        {sources.map((source) => {
          const id = source.id || source.source_number;
          const url = displayText(source.url);
          const title = displayText(source.title) || url || `Source ${id}`;
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
                href={url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black hover:underline underline-offset-2 font-medium break-all"
              >
                {title}
              </a>
              {/* <p className="text-black/60 text-xs mt-1 line-clamp-2 break-all">
                {source.snippet}
              </p> */}
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
  onToggleChat,
  versions = [],
  selectedVersionNumber,
  onSelectVersion,
  onUndoVersion,
  canUndoVersion,
  historyLoading,
  historyBusy,
  historyError
}) {
  const panelRef = useRef(null)
  const selectedVersion = versions.find((version) => version.version_number === selectedVersionNumber)
  const previousVersion = selectedVersion
    ? versions.find((version) => version.version_number === selectedVersion.version_number - 1)
    : null

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
        isChatOpen ? 'w-full' : 'w-full px-4 md:px-12 lg:px-32 py-6 '
      }`}
    >
      {/* Grainy effect overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply z-50"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>

      {/* Sticky top navigation bar */}
      <div 
        className={`sticky top-0 z-20 flex flex-wrap items-center justify-between gap-y-3 py-4 border-b border-black/10 bg-white/90 backdrop-blur-md px-6 ${
          isChatOpen ? (isSidebarOpen ? '' : 'pl-16') : '-mx-6'
        } mb-6`}
      >
        <div className="flex items-center gap-4 min-w-0 pr-4">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-black/50 tracking-widest uppercase font-mono mb-0.5">
              Research Dossier
            </span>
            <h1 className="text-base md:text-lg font-bold text-black truncate font-sans" title={topic}>
              {topic}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <ReportVersionControls
            versions={versions}
            selectedVersionNumber={selectedVersionNumber}
            onSelectVersion={onSelectVersion}
            onUndo={onUndoVersion}
            canUndo={canUndoVersion}
            loading={historyLoading}
            busy={historyBusy}
            error={historyError}
          />

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
              className="flex items-center space-x-2 px-3 py-2 rounded-md border bg-yellow-400 border-black hover:bg-yellow-500 text-black text-sm font-light transition-all duration-200 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 " />
              <span>Open Chat</span>
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
        {selectedVersion && selectedVersion.version_number > 1 && previousVersion ? (
          <ReportVersionDiff version={selectedVersion} previousVersion={previousVersion} />
        ) : (
          <>
            <MarkdownReport content={selectedVersion?.content || report} sources={sources} />
            <SourcesList sources={sources} />
            {selectedVersion?.version_number === 1 && versions.length > 1 && (
              <p className="mt-8 border-t border-black/10 pt-4 text-xs text-black/55">
                This is the original report. Select a later version to compare its changes.
              </p>
            )}
          </>
        )}
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
