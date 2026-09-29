import React from "react";
import { Trash2, FileText, Loader2, Plus, Sparkles } from "lucide-react";

function StatusBadge({ status }) {
  const config = {
    completed: { style: "bg-emerald-100 text-emerald-700 border border-emerald-200", label: "Done" },
    running:   { style: "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse", label: "Running" },
    failed:    { style: "bg-rose-100 text-rose-700 border border-rose-200", label: "Failed" },
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
    <aside className="w-68 h-screen bg-[#f9f9f9] border-r border-black/10 flex flex-col flex-shrink-0 z-20 relative text-black">
      {/* Grainy effect overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply z-0"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>

      {/* Header */}
      <div className="p-4 border-b border-black/10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-black animate-pulse" />
          <h2 className="text-sm font-semibold tracking-wider text-black uppercase font-mono">
            ResearchAI
          </h2>
        </div>
      </div>

      {/* Action / New Research Button */}
      <div className="p-3 relative z-10">
        <button
          onClick={onNewResearch}
          className="w-full py-2 px-4 rounded-md border border-black/20 bg-white hover:bg-black/5 text-xs font-semibold text-black hover:text-black hover:border-black/40 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Plus size={14} className="text-black" />
          New Research
        </button>
      </div>

      {/* Title Subheader */}
      <div className="px-4 py-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-black/50 uppercase font-mono relative z-10">
        <FileText size={12} className="text-black/50" />
        History
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 relative z-10">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 size={18} className="text-black/40 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-black/40 text-xs font-mono">No history yet</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group relative p-3 rounded-md cursor-pointer transition-all duration-200 border
                ${
                  activeSessionId === session.id
                    ? "bg-white border-black/20 text-black shadow-sm"
                    : "bg-transparent border-transparent text-black/60 hover:text-black hover:bg-black/5"
                }`}
            >
              {/* Topic */}
              <p className="text-xs font-medium truncate pr-6 mb-2 text-black">
                {session.topic}
              </p>

              {/* Metadata row */}
              <div className="flex items-center justify-between">
                <StatusBadge status={session.status} />
                <span className="text-[10px] text-black/50 font-mono">
                  {formatDate(session.created_at)}
                </span>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(e, session.id)}
                className="absolute top-2.5 right-2.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-black/10 text-black/40 hover:text-rose-600 transition-all duration-150 cursor-pointer"
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
