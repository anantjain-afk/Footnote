import React from "react";
import { Trash2, FileText, Loader2, Plus, Sparkles } from "lucide-react";

// Removed StatusBadge component per user request

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
    <aside className="w-68 h-screen bg-[#f9f9f9] border-r border-black/5 flex flex-col flex-shrink-0 z-20 relative text-black font-sans">
      {/* Grainy effect overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02] mix-blend-multiply z-0"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      ></div>

      {/* Header */}
      <div className="pt-6 pb-4 px-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <Sparkles size={18} className="text-black" />
          <h2 className="text-[15px] font-bold tracking-wide text-black">
            ResearchAI
          </h2>
        </div>
      </div>

      {/* Action / New Research Button */}
      <div className="px-3 pb-6 relative z-10">
        <button
          onClick={onNewResearch}
          className="w-full py-2.5 px-3 rounded-xl border border-black bg-yellow-400 hover:bg-amber-400 text-[14px] font-medium text-black transition-all duration-200 flex items-center gap-3 cursor-pointer"
        >
          <Plus size={16} className="text-black" />
          New Research
        </button>
      </div>

      {/* Title Subheader */}
      <div className="px-5 pb-2 text-[12px] font-medium text-black/40 uppercase tracking-wider relative z-10">
        Recent History
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
              className={`group relative py-2.5 px-3 mx-2 rounded-xl cursor-pointer transition-colors duration-200 flex flex-col justify-center
                ${
                  activeSessionId === session.id
                    ? "bg-purple-300/80 text-black font-semibold"
                    : "bg-transparent text-black/60 font-medium hover:bg-black/5 hover:text-black"
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] leading-tight truncate pr-6">
                  {session.topic}
                </span>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(e, session.id)}
                  className="absolute right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-black/10 text-black/40 hover:text-rose-600 transition-all duration-150 cursor-pointer"
                  title="Delete Session"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <span className={`text-[11px] mt-0.5 ${activeSessionId === session.id ? 'text-black/50' : 'text-black/40'}`}>
                {formatDate(session.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
