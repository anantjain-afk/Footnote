import React from "react";
import { Trash2, FileText, Loader2, Plus, Sparkles } from "lucide-react";

function StatusBadge({ status }) {
  const config = {
    completed: { style: "bg-emerald-950/30 text-emerald-400 border border-emerald-900/30", label: "Done" },
    running:   { style: "bg-amber-950/30 text-amber-400 border border-amber-900/30 animate-pulse", label: "Running" },
    failed:    { style: "bg-rose-950/30 text-rose-400 border border-rose-900/30", label: "Failed" },
  };
  const { style, label } = config[status] || config.failed;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${style}`}>
      {label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  // Check if date is in UTC and convert if needed
  const date = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z");
  const now = new Date();
  
  // Calculate difference in days
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays <= 1 && now.getDate() - 1 === date.getDate()) {
    return "Yesterday";
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Sidebar({
  sessions,
  loading,
  activeSessionId,
  onSelectSession,
  onRemoveSession,
  onDeleteSession,
  onNewResearch
}) {
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent selecting the session when deleting it
    await onDeleteSession(id);
    if (activeSessionId === id) {
      onRemoveSession();
    }
  };

  return (
    <aside className="w-68 h-screen bg-[#08080a] border-r border-zinc-900 flex flex-col flex-shrink-0 z-20">
      {/* Header */}
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400 animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wider text-zinc-200 uppercase font-mono">
            ResearchAI
          </h2>
        </div>
      </div>

      {/* Action / New Research Button */}
      <div className="p-3">
        <button
          onClick={onNewResearch}
          className="w-full py-2 px-4 rounded-xl border border-zinc-800/80 bg-[#0d0d10] hover:bg-[#121215] text-xs font-semibold text-zinc-300 hover:text-white hover:border-purple-500/30 hover:shadow-[0_0_10px_rgba(168,85,247,0.1)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Plus size={14} className="text-purple-400" />
          New Research
        </button>
      </div>

      {/* Title Subheader */}
      <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-zinc-500 uppercase font-mono">
        <FileText size={12} className="text-zinc-500" />
        History
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 size={18} className="text-zinc-600 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-zinc-600 text-xs font-mono">No history yet</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative p-3 rounded-xl cursor-pointer transition-all duration-200 border
                ${
                  activeSessionId === session.id
                    ? "bg-purple-950/15 border-purple-500/20 text-white shadow-[inset_0_0_10px_rgba(168,85,247,0.05)]"
                    : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                }`}
            >
              {/* Topic */}
              <p className="text-xs font-medium truncate pr-6 mb-2 text-zinc-200">
                {session.topic}
              </p>

              {/* Metadata row */}
              <div className="flex items-center justify-between">
                <StatusBadge status={session.status} />
                <span className="text-[10px] text-zinc-500 font-mono">
                  {formatDate(session.created_at)}
                </span>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-all duration-150 cursor-pointer"
                title="Delete Session"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
