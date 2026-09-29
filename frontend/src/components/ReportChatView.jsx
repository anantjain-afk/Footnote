import { useState, useEffect } from 'react'
import ReportPanel from './ReportPanel'
import ChatPanel from './ChatPanel'
import ChatInput from './ChatInput'
import { getChatHistory } from '../api/chat'
import { exportReportPDF } from '../api/research'
import { useChatStream } from '../hooks/useChatStream'

export function ReportChatView({
  sessionId,
  topic,
  initialReport,
  sources,
  generatedAt,
  onReset
}) {
  const [report, setReport] = useState(initialReport)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isUpdatingReport, setIsUpdatingReport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showToast, setShowToast] = useState(false)

  const { streamingMessage, isStreaming, send: sendChatStream } = useChatStream(sessionId)

  // Sync report when initialReport changes (e.g. user selects a different session)
  useEffect(() => {
    setReport(initialReport)
  }, [initialReport])

  // Restore chat history on mount or when sessionId changes
  useEffect(() => {
    let active = true
    async function restoreHistory() {
      if (!sessionId) return
      try {
        const data = await getChatHistory(sessionId)
        if (active && data && data.messages) {
          // Map DB response messages to UI message format
          const formatted = data.messages.map((m) => ({
            role: m.role,
            content: m.content,
            intent: m.intent || null
          }))
          setMessages(formatted)
          // Open split view if history exists
          if (formatted.length > 0) {
            setIsChatOpen(true)
          } else {
            setIsChatOpen(false)
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err)
      }
    }
    restoreHistory()
    return () => {
      active = false
    }
  }, [sessionId])

  const mightBeImproveIntent = (msg) => {
    const keywords = ["make", "change", "update", "rewrite", 
                      "improve", "add", "remove", "edit", "fix"]
    return keywords.some(k => msg.toLowerCase().includes(k))
  }

  const handleSend = async (messageText) => {
    if (!messageText.trim()) return

    // 1. open split view if not already open
    setIsChatOpen(true)

    // 2. optimistically add user message to UI
    setMessages(prev => [...prev, { role: "user", content: messageText }])
    setInputValue("")

    // 3. if IMPROVE intent suspected, show report overlay
    setIsLoading(true)
    if (mightBeImproveIntent(messageText)) setIsUpdatingReport(true)

    // 4. Start streaming chat
    sendChatStream(messageText, ({ intent, updated_report, finalMessage }) => {
      // 5. Stream complete, commit to messages array
      setMessages(prev => [...prev, {
        role: "assistant",
        content: finalMessage || "I encountered an error or received no response.",
        intent: intent
      }])

      // 6. if IMPROVE, update report panel
      if (intent === "IMPROVE" && updated_report) {
        setReport(updated_report)
        // Show success toast for 2 seconds
        setShowToast(true)
        setTimeout(() => setShowToast(false), 2000)
      }

      // 7. clear loading states
      setIsLoading(false)
      setIsUpdatingReport(false)
    })
  }

  const handleExportPdf = async () => {
    setExporting(true)
    try {
      await exportReportPDF(topic, report)
    } catch (e) {
      console.error('PDF export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="w-full h-full relative bg-[#0a0a0a] text-zinc-100 overflow-hidden font-sans">
      {/* Dynamic green toast notification when report updates */}
      {showToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/10 font-sans text-xs font-semibold tracking-wide animate-[fade-in_0.2s_ease-out]">
          <span>✨ Report updated successfully</span>
        </div>
      )}

      {/* Main layouts switcher */}
      {isChatOpen ? (
        // VIEW 2: SPLIT VIEW (Left Report 60%, Right Chat 40%)
        <div className="w-full h-full flex overflow-hidden">
          <div className="w-[60%] h-full relative">
            <ReportPanel
              topic={topic}
              report={report}
              sources={sources}
              isChatOpen={true}
              isUpdatingReport={isUpdatingReport}
              onExportPdf={handleExportPdf}
              onNewResearch={onReset}
              exporting={exporting}
            />
          </div>
          <div className="w-[40%] h-full">
            <ChatPanel
              messages={messages}
              streamingMessage={streamingMessage}
              isStreaming={isStreaming}
              inputValue={inputValue}
              onInputChange={setInputValue}
              onSend={() => handleSend(inputValue)}
              isLoading={isLoading || isStreaming}
              onCloseChat={() => setIsChatOpen(false)}
            />
          </div>
        </div>
      ) : (
        // VIEW 1: REPORT VIEW (Centered single layout, sticky bottom floating chat input)
        <div className="w-full h-full relative overflow-y-auto pb-32">
          <ReportPanel
            topic={topic}
            report={report}
            sources={sources}
            isChatOpen={false}
            isUpdatingReport={isUpdatingReport}
            onExportPdf={handleExportPdf}
            onNewResearch={onReset}
            exporting={exporting}
          />

          {/* Sticky bottom floating input overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent z-10 flex justify-center">
            <div className="w-full max-w-2xl px-4 md:px-0">
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={() => handleSend(inputValue)}
                isLoading={isLoading}
                showHint={true}
                placeholder="Ask about this report or request changes..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportChatView
