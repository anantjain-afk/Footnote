import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2,
  CheckCircle2, 
  Circle,
  Network,
  Search,
  BrainCircuit,
  PenTool,
  Merge,
  ShieldCheck,
  Scale,
  RefreshCw,
  FileText,
  Link,
  Target
} from 'lucide-react'

// ── Icons for the nodes ──────────────────────────────────────────────────────────
const NodeIcon = ({ node, status, isCurrent, className = "" }) => {
  const getIcon = () => {
    switch (node) {
      case 'planner': return Network
      case 'research_sub_question': return Search
      case 'reflector': return BrainCircuit
      case 'write_section': return PenTool
      case 'merge_report': return Merge
      case 'verify_report': return ShieldCheck
      case 'deep_judge': return Scale
      case 'deep_route': return RefreshCw
      default: return Circle
    }
  }
  const Icon = getIcon()
  return (
    <div className={`
      relative flex items-center justify-center p-2.5 rounded-xl border
      ${isCurrent 
        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' 
        : status === 'done' 
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
          : 'bg-zinc-800/50 border-white/5 text-zinc-500'}
      ${className}
    `}>
      <Icon className="w-5 h-5" />
      {isCurrent && (
        <span className="absolute flex h-2.5 w-2.5 -top-1 -right-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
        </span>
      )}
      {status === 'done' && !isCurrent && (
         <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 absolute -bottom-1 -right-1 bg-zinc-900 rounded-full" />
      )}
    </div>
  )
}

// ── Node Pipeline Tracker ────────────────────────────────────────────────────────
const PIPELINE = [
  { id: 'planner', label: 'Plan & Decompose' },
  { id: 'research_sub_question', label: 'Research & Extract' },
  { id: 'reflector', label: 'Reflect & Gap Fill' },
  { id: 'write_section', label: 'Write Sections' },
  { id: 'merge_report', label: 'Merge & Format' },
  { id: 'verify_report', label: 'Verify Claims' },
  { id: 'deep_judge', label: 'Deep Evaluation' }
]

const getPipelineStatus = (nodeId, currentNode, events) => {
  const hasStarted = events.some(e => e.node === nodeId && e.type === 'start')
  const hasEnded = events.some(e => e.node === nodeId && e.type === 'end')
  if (currentNode === nodeId) return 'current'
  if (hasEnded) return 'done'
  if (hasStarted) return 'running'
  return 'waiting'
}


export default function DeepResearchLoadingView({ 
  topic, 
  currentNode, 
  scores, 
  events, 
  iterations,
  subQuestions = [],
  subQuestionProgress = {},
  researchRound = 1,
  gaps = [],
  sectionProgress = {},
  stats = null,
  verifiedPct = null
}) {

  // Total notes and sources across all sub-questions
  const totalNotes = Object.values(subQuestionProgress).reduce((acc, curr) => acc + (curr.note_count || 0), 0)
  const totalSources = Object.values(subQuestionProgress).reduce((acc, curr) => acc + (curr.source_count || 0), 0)
  
  // Progress calculations
  const sqCount = subQuestions.length || 1
  const completedResearch = Object.values(subQuestionProgress).filter(p => p.status === 'done').length
  const completedSections = Object.values(sectionProgress).filter(p => p.status === 'done').length

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col p-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3 pt-8 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-2">
            <Network className="w-4 h-4" />
            Deep Research Architecture v2
          </div>
          <h2 className="text-2xl font-bold text-white max-w-2xl mx-auto leading-snug">
            {topic || "Initializing deep research..."}
          </h2>
          <div className="flex items-center justify-center gap-3 text-sm text-zinc-400">
             {iterations > 0 && (
               <span className="flex items-center gap-1.5 text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                 <RefreshCw className="w-3.5 h-3.5" /> Revision {iterations}
               </span>
             )}
             <span className="flex items-center gap-1.5">
               <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
               Building comprehensive report
             </span>
          </div>
        </div>

        {/* Top Pipeline visualization */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-8 right-8 h-px bg-zinc-800 -z-10" />
            
            {PIPELINE.map((node, i) => {
              const status = getPipelineStatus(node.id, currentNode, events)
              const isCurrent = status === 'current'
              return (
                <div key={node.id} className="flex flex-col items-center gap-3 relative z-10 w-24">
                  <NodeIcon 
                    node={node.id} 
                    status={status} 
                    isCurrent={isCurrent}
                  />
                  <span className={`text-[11px] font-medium text-center ${isCurrent ? 'text-purple-300' : status === 'done' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {node.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Three Column Layout for active execution state */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Column 1: Sub-Questions & Research */}
          <div className="md:col-span-2 space-y-4">
            
            {subQuestions.length > 0 && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <Search className="w-4 h-4 text-blue-400" />
                    Parallel Research Engine (Round {researchRound})
                  </div>
                  <div className="text-xs text-zinc-500 font-medium bg-zinc-800/50 px-2 py-1 rounded">
                    {completedResearch} / {sqCount} branches
                  </div>
                </div>
                
                <div className="space-y-3">
                  {subQuestions.map((sq, i) => {
                    const prog = subQuestionProgress[sq]
                    const isDone = prog?.status === 'done'
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${isDone ? 'bg-zinc-800/20 border-white/5' : 'bg-blue-500/5 border-blue-500/20'}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200">{sq}</p>
                            
                            {prog?.branches && prog.branches.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {prog.branches.map((b, bi) => (
                                      <div key={bi} className="text-xs border border-white/5 bg-zinc-900/50 p-2 rounded-md">
                                        {bi > 0 && <div className="text-indigo-400 font-semibold mb-1 flex items-center gap-1"><Search className="w-3 h-3"/> Follow-up: {b.query}</div>}
                                        {b.empty_reason ? (
                                            <div className="text-rose-400/80 italic">{b.empty_reason}</div>
                                        ) : (
                                            <div className="flex items-center gap-4 text-zinc-400">
                                              <span className="flex items-center gap-1.5"><Link className="w-3.5 h-3.5" /> {b.sources} sources</span>
                                              <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {b.claims} claims</span>
                                            </div>
                                        )}
                                      </div>
                                  ))}
                                </div>
                            )}
                            
                            {isDone && prog && (!prog.branches || prog.branches.length === 0) && (
                              <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
                                <span className="flex items-center gap-1.5"><Link className="w-3.5 h-3.5" /> {prog.source_count} sources</span>
                                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> {prog.note_count} claims extracted</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reflection Gaps (if any) */}
            {gaps.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                  <BrainCircuit className="w-4 h-4" />
                  Reflection: Knowledge Gaps Identified
                </div>
                <ul className="space-y-1">
                  {gaps.map((gap, i) => (
                    <li key={i} className="text-sm text-amber-200/70 flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span> {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Section Writing Progress */}
            {Object.keys(sectionProgress).length > 0 && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-4">
                 <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                    <PenTool className="w-4 h-4 text-purple-400" />
                    Parallel Section Writers
                  </div>
                  <div className="text-xs text-zinc-500 font-medium bg-zinc-800/50 px-2 py-1 rounded">
                    {completedSections} / {sqCount} sections
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   {subQuestions.map((sq, i) => {
                     const sp = sectionProgress[sq]
                     const done = sp?.status === 'done'
                     if (!sp) return null
                     return (
                       <div key={i} className="p-3 rounded-lg border border-white/5 bg-zinc-800/30 flex items-center justify-between">
                         <span className="text-xs text-zinc-300 truncate pr-2">{sq}</span>
                         {done ? (
                           <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">{sp.word_count}w</span>
                         ) : (
                           <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                         )}
                       </div>
                     )
                   })}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Stats & Verification & Scores */}
          <div className="space-y-4">
            
            {/* Accumulating Stats */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Research Vault</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-2xl font-light text-blue-400">{stats?.total_sources || totalSources}</div>
                  <div className="text-[10px] text-zinc-400 uppercase mt-1 flex items-center gap-1"><Link className="w-3 h-3"/> Sources scraped</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5">
                  <div className="text-2xl font-light text-emerald-400">{stats?.notes_count || totalNotes}</div>
                  <div className="text-[10px] text-zinc-400 uppercase mt-1 flex items-center gap-1"><Target className="w-3 h-3"/> Claims logged</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-white/5 col-span-2 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-light text-purple-400">{stats?.word_count || '---'}</div>
                    <div className="text-[10px] text-zinc-400 uppercase mt-0.5">Total Words</div>
                  </div>
                   <div>
                    <div className="text-lg font-light text-indigo-400">{stats?.unique_domains || '---'}</div>
                    <div className="text-[10px] text-zinc-400 uppercase mt-0.5">Unique Domains</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification & Groundedness */}
            {verifiedPct !== null && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Claim Verification
                  </h3>
                  <span className={`text-sm font-medium ${verifiedPct >= 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {(verifiedPct * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${verifiedPct * 100}%` }}
                    className={`h-full ${verifiedPct >= 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                </div>
                <p className="text-[10px] text-zinc-500">
                  {verifiedPct >= 0.8 ? 'Excellent grounding against scraped notes.' : 'Flagged unsupported claims detected.'}
                </p>
              </div>
            )}

            {/* Deep Judge Scores */}
            {scores && Object.keys(scores).length > 0 && (
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" /> Deep Judge Scores
                </h3>
                <div className="space-y-2.5 mt-3">
                  {Object.entries(scores).map(([metric, score]) => (
                    <div key={metric} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-400 capitalize">{metric.replace('_', ' ')}</span>
                        <span className={score >= 0.7 ? 'text-emerald-400' : 'text-rose-400'}>{(score * 10).toFixed(1)}/10</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${score * 100}%` }}
                          className={`h-full ${score >= 0.7 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
