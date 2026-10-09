import { Trash2, Loader2, PanelLeft, PanelLeftClose, SquarePen, Zap, Brain, Settings2 } from "lucide-react";

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
  isOpen,
  onToggle,
  sessions,
  loading,
  historyError,
  onRetryHistory,
  activeSessionId,
  onSelectSession,
  onRemoveSession,
  onDeleteSession,
  onNewResearch,
  onOpenSettings,
  settingsActive,
  email,
  onSignOut,
  signingOut,
  signOutError
}) {
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // prevent selecting the session when deleting it
    await onDeleteSession(id);
    if (activeSessionId === id) {
      onRemoveSession();
    }
  };

  return (
    <>
      {/* Floating buttons when sidebar is closed */}
      <div 
        className={`fixed top-3 left-3 z-50 flex flex-col gap-3 transition-all duration-300 ${
          isOpen ? 'opacity-0 pointer-events-none -translate-x-4' : 'opacity-100 pointer-events-auto translate-x-0'
        }`}
      >
        <button
          onClick={onToggle}
          className="p-2 bg-transparent hover:bg-black/5 rounded-lg text-black/70 hover:text-black transition-all cursor-pointer"
          title="Open Sidebar"
        >
          <PanelLeft size={22} />
        </button>
        <button
          onClick={onNewResearch}
          className="p-2 bg-transparent hover:bg-black/5 rounded-lg text-black/70 hover:text-black transition-all cursor-pointer"
          title="New Research"
        >
          <SquarePen size={22} />
        </button>
      </div>

      <aside 
        className={`h-screen bg-[#f9f9f9] border-r border-black/5 flex flex-col flex-shrink-0 z-40 relative text-black font-sans transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'w-68 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden border-r-0'
        }`}
      >
        {/* Grainy effect overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02] mix-blend-multiply z-0"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
        ></div>

        <div className="flex-1 w-68 flex flex-col overflow-hidden min-w-[272px]">
          {/* Header */}
          <div className="pt-3 pb-4 px-3 flex items-center justify-between relative z-10">
            <button
              onClick={onToggle}
              className="p-2 hover:bg-black/5 rounded-lg text-black/70 hover:text-black transition-colors cursor-pointer"
              title="Close Sidebar"
            >
              <PanelLeftClose size={22} />
            </button>
            <button
              onClick={onNewResearch}
              className="p-2 hover:bg-black/5 rounded-lg text-black/70 hover:text-black transition-colors cursor-pointer"
              title="New Research"
            >
              <SquarePen size={22} />
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
        ) : historyError ? (
          <div className="px-4 py-6">
            <p role="alert" className="text-sm text-red-700 break-words">{historyError}</p>
            <button type="button" onClick={onRetryHistory}
              className="mt-2 min-h-11 text-sm underline underline-offset-4 cursor-pointer">Retry history</button>
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
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[11px] ${activeSessionId === session.id ? 'text-black/50' : 'text-black/40'}`}>
                  {formatDate(session.created_at)}
                </span>
                
                {session.mode === 'deep_research' ? (
                  <span className="flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-600">
                    <Brain size={10} /> Deep
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500">
                    <Zap size={10} /> Normal
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
          <div className="border-t border-black/10 px-5 py-4 relative z-10">
            <button type="button" onClick={onOpenSettings} aria-current={settingsActive ? 'page' : undefined}
              className={`mb-3 flex w-full min-h-11 items-center gap-2.5 px-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-purple-800 focus-visible:outline-offset-2 ${settingsActive ? 'bg-purple-100 text-purple-900' : 'text-black/70 hover:bg-black/5 hover:text-black'}`}>
              <Settings2 size={17} aria-hidden="true" /> Settings
            </button>
            <p className="truncate text-sm text-black/60" title={email}>{email}</p>
            <button type="button" onClick={onSignOut} disabled={signingOut}
              className="mt-2 min-h-11 text-sm underline decoration-purple-300 decoration-2 underline-offset-4 hover:text-purple-800 hover:decoration-purple-800 focus-visible:outline-2 focus-visible:outline-purple-800 focus-visible:outline-offset-4 disabled:opacity-50 cursor-pointer">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
            {signOutError && <p role="alert" className="text-sm text-red-700">{signOutError}</p>}
          </div>
        </div>
      </aside>
    </>
  );
}
