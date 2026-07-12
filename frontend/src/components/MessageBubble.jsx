import { Sparkles, User, FileEdit } from 'lucide-react'

export function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isImprove = message.intent === 'IMPROVE'

  return (
    <div className={`flex flex-col mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Role label above bubble */}
      <div className="flex items-center space-x-1.5 mb-1.5 px-1">
        {isUser ? (
          <>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
              User
            </span>
            <User className="w-3 h-3 text-zinc-500" />
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
              Research Assistant
            </span>
          </>
        )}
      </div>

      {/* Bubble container */}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-md text-sm leading-relaxed transition-all duration-200 selection:bg-white/20 selection:text-white ${
          isUser
            ? 'bg-[#6366f1] text-white rounded-tr-none font-sans font-medium'
            : 'bg-[#1a1a1a] text-zinc-200 border border-[#2a2a2a] rounded-tl-none font-sans'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* "✏️ Report Updated" badge below bubble (only for Assistant + IMPROVE) */}
      {!isUser && isImprove && (
        <div className="flex items-center space-x-1 mt-1.5 px-1 animate-[fade-in_0.3s_ease-out]">
          <FileEdit className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-400 font-mono tracking-wide">
            Report Updated
          </span>
        </div>
      )}
    </div>
  )
}

export default MessageBubble
