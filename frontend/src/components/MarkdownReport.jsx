import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownReport({ content }) {
  return (
    <div className="max-w-[800px] mx-auto markdown-body font-serif selection:bg-indigo-500/30 selection:text-indigo-200">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownReport
