import { Send, Loader2 } from 'lucide-react'

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  showHint = false,
  placeholder = "Ask about this report or request changes..."
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) {
        onSubmit()
      }
    }
  }

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Optional hint text shown above input in View 1 */}
      {showHint && (
        <p className="text-center text-xs text-zinc-500 font-mono tracking-wide leading-none">
          Ask questions or say <span className="text-indigo-400 font-semibold">"make the conclusion longer"</span> to improve
        </p>
      )}

      {/* Input container */}
      <div 
        className="relative flex items-end w-full glass-panel rounded-2xl border border-[#2a2a2a] p-2 pr-3 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all duration-200"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 max-h-32 bg-transparent text-zinc-100 placeholder-zinc-500 text-sm font-sans focus:outline-none resize-none py-2 px-3 overflow-y-auto min-h-[38px] leading-relaxed disabled:text-zinc-500 disabled:cursor-not-allowed"
          style={{ height: 'auto' }}
        />

        {/* Send / Spinner Button */}
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isLoading}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800/60 disabled:text-zinc-600 text-white font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}

export default ChatInput
