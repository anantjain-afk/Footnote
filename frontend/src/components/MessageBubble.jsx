import { Sparkles, User, FileEdit } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const chatMarkdownComponents = {
  h1: ({ children }) => <p className="font-bold text-base my-1">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-base my-1">{children}</p>,
  h3: ({ children }) => <p className="font-medium text-base my-1">{children}</p>,
  p: ({ children }) => <p className="my-1">{children}</p>,
  ul: ({ children }) => <ul className="my-1 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto">
      <table className="border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-black/15 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-black/15 px-2 py-1">{children}</td>,
  code: ({ children, className }) => className
    ? <code className="block overflow-x-auto rounded bg-black/5 p-2 font-mono text-[0.85em]">{children}</code>
    : <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em]">{children}</code>,
  pre: ({ children }) => <pre className="my-1 whitespace-pre-wrap">{children}</pre>,
}

export function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isImprove = message.intent === 'IMPROVE'

  return (
    <div className={`flex flex-col mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Role label above bubble */}
      <div className="flex items-center space-x-1.5 mb-1.5 px-1">
        {isUser ? (
          <>
            <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest font-sans">
              User
            </span>
            <User className="w-3 h-3 text-black/40" />
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3 text-black/60" />
            <span className="text-[10px] font-bold text-black/60 uppercase tracking-widest font-sans">
              Research Assistant
            </span>
          </>
        )}
      </div>

      {/* Bubble container */}
      <div
        className={`max-w-[85%] px-5 py-3.5 rounded-2xl leading-relaxed transition-all duration-200 selection:bg-black/10 selection:text-black ${
          isUser
            ? 'bg-[#f4f4f5] text-black rounded-tr-none font-sans text-[14px] font-medium'
            : 'bg-white text-black border border-black/5 rounded-tl-none font-serif text-[15px] shadow-[0_0_15px_rgba(0,0,0,0.02)]'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents}>
              {message.content || ''}
            </ReactMarkdown>
          </div>
        )}
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
