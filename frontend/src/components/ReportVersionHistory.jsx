import { useMemo } from 'react'
import { Clock3, History, Undo2 } from 'lucide-react'

function formatVersionDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function versionLabel(version) {
  if (version.version_type === 'original') return 'Original report'
  const label = version.version_type === 'restore'
    ? (version.change_prompt || 'Restored report')
    : (version.change_prompt || 'Chat improvement')
  return label.length > 48 ? `${label.slice(0, 45)}…` : label
}

export function ReportVersionControls({
  versions = [],
  selectedVersionNumber,
  onSelectVersion,
  onUndo,
  canUndo,
  loading,
  busy,
  error,
}) {
  const latest = versions.at(-1)
  const selected = versions.find((version) => version.version_number === selectedVersionNumber)
  const value = selected ? String(selected.version_number) : ''

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="report-version-select">Report version</label>
      <div className="relative flex min-w-0 items-center">
        <History aria-hidden="true" className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-black/55" />
        <select
          id="report-version-select"
          value={value}
          onChange={(event) => onSelectVersion(event.target.value ? Number(event.target.value) : null)}
          disabled={loading || versions.length === 0}
          className="max-w-[min(46vw,19rem)] appearance-none border border-black/15 bg-white py-2 pl-9 pr-3 text-xs font-medium text-black outline-none transition-colors hover:border-black/40 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-wait disabled:text-black/40"
        >
          <option value="">Current report{latest ? ` · v${latest.version_number}` : ''}</option>
          {versions.map((version) => (
            <option key={version.id} value={version.version_number}>
              v{version.version_number} · {versionLabel(version)} · {formatVersionDate(version.created_at)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo || busy || loading}
        title={canUndo ? 'Restore the report from before the latest improvement' : 'No recent report improvement to undo'}
        className="inline-flex items-center gap-1.5 border border-black/15 px-3 py-2 text-xs font-semibold text-black transition-colors hover:border-black hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-black/35 disabled:hover:border-black/15 disabled:hover:bg-white"
      >
        <Undo2 aria-hidden="true" className={`h-3.5 w-3.5 ${busy ? 'animate-pulse' : ''}`} />
        {busy ? 'Restoring…' : 'Undo'}
      </button>

      {loading && <span className="text-xs text-black/50" role="status">Loading versions…</span>}
      {error && <span className="text-xs text-red-800" role="alert">{error}</span>}
    </div>
  )
}

function DiffSide({ title, version, side, rows }) {
  let lineNumber = 0
  return (
    <section className="min-w-0 border border-black/10 bg-white">
      <header className="sticky top-0 z-[1] border-b border-black/10 bg-white/95 px-3 py-2 backdrop-blur-sm">
        <h3 className="truncate text-xs font-semibold text-black">{title}</h3>
        {version && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-black/55" title={version.change_prompt || ''}>
            <Clock3 aria-hidden="true" className="h-3 w-3 shrink-0" />
            <span className="truncate">{formatVersionDate(version.created_at)}{version.change_prompt ? ` · ${version.change_prompt}` : ''}</span>
          </p>
        )}
      </header>
      <div className="overflow-x-auto">
        <div className="min-w-full py-2 font-mono text-[11px] leading-[1.65]">
          {rows.map((row, index) => {
            const value = row[side]
            const isBlank = value === null && row.kind !== 'separator'
            if (row.kind !== 'separator' && !isBlank) lineNumber += 1
            const removed = side === 'left' && (row.kind === 'removed' || row.kind === 'changed')
            const added = side === 'right' && (row.kind === 'added' || row.kind === 'changed')
            const fill = removed ? 'bg-red-50' : added ? 'bg-emerald-50' : 'bg-white'
            const marker = removed ? '−' : added ? '+' : ''
            return (
              <div
                key={`${index}-${side}`}
                className={`grid min-h-[1.8em] grid-cols-[2.25rem_1rem_minmax(0,1fr)] ${fill} ${row.kind === 'separator' ? 'my-1 border-y border-dashed border-black/10 bg-[#f7f7f7]' : ''}`}
              >
                <span aria-hidden="true" className="select-none pr-2 text-right text-black/35">{isBlank || row.kind === 'separator' ? '' : lineNumber}</span>
                <span aria-hidden="true" className={`select-none text-center font-semibold ${removed ? 'text-red-800' : added ? 'text-emerald-900' : 'text-black/20'}`}>{marker}</span>
                <span className={`whitespace-pre-wrap break-words pr-3 ${isBlank ? 'select-none' : 'text-black'}`}>
                  {row.kind === 'separator' ? '···' : (isBlank ? ' ' : value)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function ReportVersionDiff({ version, previousVersion }) {
  const rows = useMemo(() => version?.diff_rows || [], [version])
  const addedCount = rows.filter((row) => row.kind === 'added' || (row.kind === 'changed' && row.right)).length
  const removedCount = rows.filter((row) => row.kind === 'removed' || (row.kind === 'changed' && row.left)).length

  if (!version || !previousVersion) return null

  return (
    <section aria-label={`Changes between report versions ${previousVersion.version_number} and ${version.version_number}`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-black">Version comparison</h2>
          <p className="mt-0.5 text-xs text-black/55">Comparing v{previousVersion.version_number} with v{version.version_number}</p>
        </div>
        <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide">
          <span className="text-emerald-900">+{addedCount} added</span>
          <span className="text-red-800">−{removedCount} removed</span>
        </p>
      </div>
      <div className="grid max-h-[calc(100vh-13rem)] grid-cols-1 gap-3 overflow-auto md:grid-cols-2">
        <DiffSide title={`Previous · v${previousVersion.version_number}`} version={previousVersion} side="left" rows={rows} />
        <DiffSide title={`Selected · v${version.version_number}`} version={version} side="right" rows={rows} />
      </div>
      <p className="text-[10px] text-black/45">Green marks added lines; red marks removed lines. Unchanged context is shown around each change.</p>
    </section>
  )
}

export function getVersionLabel(version) {
  return versionLabel(version)
}
