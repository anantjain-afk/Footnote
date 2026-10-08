import { useMemo } from 'react'
import { Clock3, History } from 'lucide-react'

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
  currentVersionNumber,
  onSelectVersion,
  loading,
  error,
}) {
  const selected = versions.find((version) => version.version_number === selectedVersionNumber)
  const value = selected ? String(selected.version_number) : ''

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="report-version-select">Previous report versions</label>
      <div className="relative flex min-w-0 items-center">
        <History aria-hidden="true" className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-black/55" />
        <select
          id="report-version-select"
          value={value}
          onChange={(event) => onSelectVersion(event.target.value ? Number(event.target.value) : null)}
          disabled={loading || versions.length === 0}
          className="max-w-[min(46vw,19rem)] appearance-none border border-black/15 bg-white py-2 pl-9 pr-3 text-xs font-medium text-black outline-none transition-colors hover:border-black/40 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-wait disabled:text-black/40"
        >
          <option value="">Current report{currentVersionNumber ? ` · v${currentVersionNumber}` : ''}</option>
          {versions.map((version) => (
            <option key={version.id} value={version.version_number}>
              v{version.version_number} · {versionLabel(version)} · {formatVersionDate(version.created_at)}
            </option>
          ))}
        </select>
      </div>
      {loading && <span className="text-xs text-black/50" role="status">Loading versions…</span>}
      {error && <span className="text-xs text-red-800" role="alert">{error}</span>}
    </div>
  )
}

function buildDiffRows(previous, proposed) {
  const oldLines = previous.split('\n')
  const newLines = proposed.split('\n')
  const countLines = (lines) => {
    const counts = new Map()
    lines.forEach((line) => counts.set(line, (counts.get(line) || 0) + 1))
    return counts
  }
  const oldCounts = countLines(oldLines)
  const newCounts = countLines(newLines)
  const newPositions = new Map()
  newLines.forEach((line, index) => {
    if (newCounts.get(line) === 1) newPositions.set(line, index)
  })

  // Unique shared lines make stable anchors without allocating an O(n²) matrix.
  const candidates = []
  oldLines.forEach((line, index) => {
    if (oldCounts.get(line) === 1 && newPositions.has(line)) {
      candidates.push({ oldIndex: index, newIndex: newPositions.get(line) })
    }
  })

  const tails = []
  const tailCandidates = []
  const previousCandidate = new Array(candidates.length).fill(-1)
  candidates.forEach((candidate, index) => {
    let low = 0
    let high = tails.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (tails[middle] < candidate.newIndex) low = middle + 1
      else high = middle
    }
    if (low > 0) previousCandidate[index] = tailCandidates[low - 1]
    tails[low] = candidate.newIndex
    tailCandidates[low] = index
  })

  const anchors = []
  if (tailCandidates.length) {
    let candidateIndex = tailCandidates[tailCandidates.length - 1]
    while (candidateIndex >= 0) {
      anchors.push(candidates[candidateIndex])
      candidateIndex = previousCandidate[candidateIndex]
    }
    anchors.reverse()
  }

  const rows = []
  let oldCursor = 0
  let newCursor = 0
  const appendGap = (oldEnd, newEnd) => {
    const oldGap = oldLines.slice(oldCursor, oldEnd)
    const newGap = newLines.slice(newCursor, newEnd)
    const paired = Math.min(oldGap.length, newGap.length)
    for (let index = 0; index < paired; index += 1) {
      rows.push({ kind: 'changed', left: oldGap[index], right: newGap[index] })
    }
    for (let index = paired; index < oldGap.length; index += 1) {
      rows.push({ kind: 'removed', left: oldGap[index], right: null })
    }
    for (let index = paired; index < newGap.length; index += 1) {
      rows.push({ kind: 'added', left: null, right: newGap[index] })
    }
  }

  anchors.forEach(({ oldIndex, newIndex }) => {
    appendGap(oldIndex, newIndex)
    rows.push({ kind: 'equal', left: oldLines[oldIndex], right: newLines[newIndex] })
    oldCursor = oldIndex + 1
    newCursor = newIndex + 1
  })
  appendGap(oldLines.length, newLines.length)

  // Keep the comparison scannable while preserving a little context around each change.
  const compact = []
  let index = 0
  while (index < rows.length) {
    if (rows[index].kind !== 'equal') {
      compact.push(rows[index])
      index += 1
      continue
    }
    const start = index
    while (index < rows.length && rows[index].kind === 'equal') index += 1
    const run = rows.slice(start, index)
    if (run.length > 8) {
      compact.push(...run.slice(0, 3), { kind: 'separator', left: null, right: null }, ...run.slice(-3))
    } else {
      compact.push(...run)
    }
  }
  return compact
}

function DiffSide({ title, contentKey, side, rows }) {
  let lineNumber = 0
  return (
    <section className="min-w-0 border border-black/10 bg-white">
      <header className="sticky top-0 z-[1] border-b border-black/10 bg-white/95 px-3 py-2 backdrop-blur-sm">
        <h3 className="text-xs font-semibold text-black">{title}</h3>
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
                key={`${contentKey}-${index}-${side}`}
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

export function ReportVersionDiff({ previousContent, proposedContent }) {
  const rows = useMemo(
    () => buildDiffRows(previousContent || '', proposedContent || ''),
    [previousContent, proposedContent],
  )
  const addedCount = rows.filter((row) => row.kind === 'added' || (row.kind === 'changed' && row.right !== null)).length
  const removedCount = rows.filter((row) => row.kind === 'removed' || (row.kind === 'changed' && row.left !== null)).length

  return (
    <section aria-label="Proposed report changes" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-black">Review your proposed changes</h2>
          <p className="mt-0.5 text-xs text-black/55">Compare your current report with the suggested revision.</p>
        </div>
        <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide">
          <span className="text-emerald-900">+{addedCount} added</span>
          <span className="text-red-800">−{removedCount} removed</span>
        </p>
      </div>
      <div className="grid max-h-[calc(100vh-17rem)] grid-cols-1 gap-3 overflow-auto md:grid-cols-2">
        <DiffSide title="Current report" contentKey="current" side="left" rows={rows} />
        <DiffSide title="Proposed changes" contentKey="proposed" side="right" rows={rows} />
      </div>
      <p className="text-[10px] text-black/45">Green marks added lines; red marks removed lines.</p>
    </section>
  )
}
