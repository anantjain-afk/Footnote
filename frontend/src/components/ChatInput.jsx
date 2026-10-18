import { Send, Loader2 } from 'lucide-react'

export function ChatInput({
  notice,
  submitDisabled = false,
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
      if (value.trim() && !isLoading && !submitDisabled) {
        onSubmit()
      }
    }
  }

  return (
    <div className="w-full flex flex-col space-y-2">
      {notice && <p role="status" className="text-sm text-black/70 px-4">{notice}</p>}
      {/* Optional hint text shown above input in View 1 */}
      {/* {showHint && (
        <p className="text-center text-xs text-black/40 font-mono tracking-wide leading-none mb-2 pt-2">
          Ask questions or say <span className="text-black/70 font-semibold">"make the conclusion longer"</span> to improve
        </p>
      )} */}

      {/* Input container */}
      <div 
        className="relative flex items-end w-full bg-white rounded-[24px] border border-black/40 p-2 pr-3 focus-within:border-black/20 focus-within:bg-white focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all duration-200"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
          className="flex-1 max-h-32 bg-transparent text-black placeholder-black/40 text-base font-sans focus:outline-none resize-none py-2.5 px-4 overflow-y-auto min-h-[44px] leading-relaxed disabled:text-black/40 disabled:cursor-not-allowed"
          style={{ height: 'auto' }}
        />

        {/* Send / Spinner Button */}
        <button
          onClick={onSubmit}
          disabled={!value.trim() || isLoading || submitDisabled}
          aria-label="Send message"
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-black hover:bg-black/80 disabled:bg-black/10 disabled:text-black/30 text-white font-semibold transition-all duration-200 hover:scale-[1.05] active:scale-[0.95] cursor-pointer mb-1 mr-1"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white/50" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}

export default ChatInput
