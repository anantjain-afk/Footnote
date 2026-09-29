import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { X, Sparkles } from 'lucide-react'

export function ChatPanel({
  messages,
  streamingMessage,
  isStreaming,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  onCloseChat
}) {
  const messagesEndRef = useRef(null)

  // Auto scroll to latest message when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="h-full flex flex-col bg-white border-l border-black/10 relative">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-black/5">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-black/5 text-black">
            <Sparkles className="w-4 h-4 animate-pulse-slow" />
          </div>
          <span className="text-sm font-bold text-black font-sans">
            Research Assistant
          </span>
        </div>

        {/* Close Chat button */}
        <button
          onClick={onCloseChat}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-black/40 hover:text-black hover:bg-black/5 transition-all duration-200 cursor-pointer"
          title="Close Chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages list container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        {messages.length === 0 && !isStreaming ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-black/5 border border-black/10 flex items-center justify-center text-black/60 mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-black/50 text-xs font-mono">
              Ask a question about the report or request updates.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))}
            {isStreaming && streamingMessage && (
              <MessageBubble message={{ role: "assistant", content: streamingMessage }} />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area fixed to the bottom */}
      <div className="p-4 border-t border-black/5 bg-white pb-6">
        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSend}
          isLoading={isLoading}
          placeholder="Ask a question or edit report..."
        />
      </div>
    </div>
  )
}

export default ChatPanel
