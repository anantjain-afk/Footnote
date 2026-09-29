import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function CitationText({ children, sources = [] }) {
  // match [1] or [1,2] or [1,2,3] pattern
  const citationRegex = /\[(\d+(?:,\d+)*)\]/g;
  const text = String(children);

  if (!citationRegex.test(text)) return <>{children}</>;

  const parts = text.split(/(\[\d+(?:,\d+)*\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+(?:,\d+)*)\]$/);
        if (match) {
          const ids = match[1].split(',');
          return (
            <sup key={i} className="ml-0.5">
              [
              {ids.map((idStr, index) => {
                const id = parseInt(idStr.trim());
                const source = sources.find(s => (s.id === id || s.source_number === id));
                const url = source ? source.url : `#ref-${id}`;
                return (
                  <span key={index}>
                    <a
                      href={url}
                      target={source ? "_blank" : undefined}
                      rel={source ? "noopener noreferrer" : undefined}
                      className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                    >
                      {idStr}
                    </a>
                    {index < ids.length - 1 ? ',' : ''}
                  </span>
                )
              })}
              ]
            </sup>
          );
        }
        return part;
      })}
    </>
  );
}

export function MarkdownReport({ content, sources = [] }) {
  return (
    <div className="max-w-[800px] mx-auto markdown-body font-serif selection:bg-indigo-500/30 selection:text-indigo-200">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{ 
          p: ({ children }) => <p><CitationText sources={sources}>{children}</CitationText></p>,
          li: ({ children }) => <li><CitationText sources={sources}>{children}</CitationText></li>,
          td: ({ children }) => <td><CitationText sources={sources}>{children}</CitationText></td>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownReport
