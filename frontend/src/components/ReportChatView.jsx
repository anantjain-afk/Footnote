import { cooldownMessage } from '../hooks/useQuotaCooldowns'
import { useState, useEffect, useRef } from 'react'
import ReportPanel from './ReportPanel'
import ChatPanel from './ChatPanel'
import ChatInput from './ChatInput'
import { getChatHistory } from '../api/chat'
import { approveReportVersion, getReportVersions } from '../api/sessions'
import { exportReportPDF } from '../api/research'
import { useChatStream } from '../hooks/useChatStream'

export function ReportChatView({
  cooldownSeconds = 0,
  onQuotaError,
  sessionId,
  topic,
  initialReport,
  sources,
  generatedAt,
  onReset,
  onToggleSidebar,
  isSidebarOpen
}) {
  const pending = useRef(false)
  const [chatError, setChatError] = useState(null)
  const chatNotice = cooldownSeconds > 0 ? `Chat limit reached. ${cooldownMessage(cooldownSeconds)}` : chatError?.status === 429 ? 'You can try sending your message again.' : chatError?.message
  const [report, setReport] = useState(initialReport)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isUpdatingReport, setIsUpdatingReport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('Report updated successfully')
  const [versions, setVersions] = useState([])
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(null)
  const [pendingChange, setPendingChange] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyBusy, setHistoryBusy] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const inputNotice = pendingChange
    ? 'Approve or reject the proposed changes before sending another request.'
    : chatNotice

  const { streamingMessage, isStreaming, send: sendChatStream } = useChatStream(sessionId)

  // Sync report when initialReport changes (e.g. user selects a different session)
  useEffect(() => {
    setReport(initialReport)
    setPendingChange(null)
    setSelectedVersionNumber(null)
  }, [initialReport])

  useEffect(() => {
    let active = true
    setVersions([])
    setSelectedVersionNumber(null)
    setHistoryError('')
    if (!sessionId) return undefined

    setHistoryLoading(true)
    getReportVersions(sessionId)
      .then((data) => {
        if (active) setVersions(data.versions || [])
      })
      .catch((error) => {
        if (active) setHistoryError(error.message || 'Could not load report versions.')
      })
      .finally(() => {
        if (active) setHistoryLoading(false)
      })

    return () => {
      active = false
    }
  }, [sessionId])

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

  const refreshVersions = async () => {
    const data = await getReportVersions(sessionId)
    setVersions(data.versions || [])
    setHistoryError('')
    return data.versions || []
  }

  const flashToast = (message) => {
    setToastMessage(message)
    setShowToast(true)
    window.setTimeout(() => setShowToast(false), 2200)
  }

  const handleSend = async (messageText) => {
    if (!messageText.trim() || pending.current || pendingChange || cooldownSeconds > 0) return
    pending.current = true
    setSelectedVersionNumber(null)
    setChatError(null)
    setIsChatOpen(true)
    const optimisticMessage = { role: 'user', content: messageText }
    setMessages(prev => [...prev, optimisticMessage])
    setInputValue('')
    setIsLoading(true)
    if (mightBeImproveIntent(messageText)) setIsUpdatingReport(true)
    try {
      const { intent, updated_report, finalMessage } = await sendChatStream(messageText)
      setMessages(prev => [...prev, { role: 'assistant', content: finalMessage, intent }])
      if (intent === 'IMPROVE' && updated_report) {
        const reportChanged = updated_report !== report
        setSelectedVersionNumber(null)
        if (reportChanged) {
          setPendingChange({
            previousContent: report,
            proposedContent: updated_report,
            request: messageText,
          })
        }
      }
    } catch (error) {
      onQuotaError?.(error)
      setChatError(error)
      setMessages(prev => prev.filter(message => message !== optimisticMessage))
      setInputValue(messageText)
    } finally {
      pending.current = false
      setIsLoading(false)
      setIsUpdatingReport(false)
    }
  }

  const handleApproveChanges = async () => {
    if (!pendingChange || historyBusy || !sessionId) return
    setHistoryBusy(true)
    setHistoryError('')
    try {
      const result = await approveReportVersion(sessionId, pendingChange.proposedContent, pendingChange.request)
      setReport(result.report)
      setPendingChange(null)
      setSelectedVersionNumber(null)
      try {
        await refreshVersions()
      } catch (error) {
        setHistoryError(error.message || 'Changes were approved, but version history could not refresh.')
      }
      flashToast('Report changes approved')
    } catch (error) {
      setHistoryError(error.message || 'Could not approve report changes.')
    } finally {
      setHistoryBusy(false)
    }
  }

  const handleRejectChanges = () => {
    if (!pendingChange || historyBusy) return
    setPendingChange(null)
    setSelectedVersionNumber(null)
    setHistoryError('')
    flashToast('Changes rejected. Current report kept.')
  }

  const latestVersion = versions.at(-1)
  const previousVersions = latestVersion ? versions.slice(0, -1) : []
  const selectedVersion = previousVersions.find(
    (version) => version.version_number === selectedVersionNumber
  )

  const handleExportPdf = async () => {
    if (pendingChange || exporting) return
    setExporting(true)
    try {
      await exportReportPDF(topic, selectedVersion ? selectedVersion.content : report, sources)
    } catch (e) {
      console.error('PDF export failed:', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="w-full h-full relative bg-[#f9f9f9] text-black overflow-hidden font-sans">
      {/* Dynamic green toast notification when report updates */}
      {showToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-900/10 font-sans text-xs font-semibold tracking-wide animate-[fade-in_0.2s_ease-out]">
          <span>{toastMessage}</span>
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
              onToggleSidebar={onToggleSidebar}
              isSidebarOpen={isSidebarOpen}
              hasMessages={messages.length > 0}
              onToggleChat={() => setIsChatOpen(false)}
              versions={previousVersions}
              selectedVersionNumber={selectedVersionNumber}
              currentVersionNumber={latestVersion?.version_number}
              onSelectVersion={setSelectedVersionNumber}
              pendingChange={pendingChange}
              onApproveChanges={handleApproveChanges}
              onRejectChanges={handleRejectChanges}
              historyLoading={historyLoading}
              historyBusy={historyBusy}
              historyError={historyError}
            />
          </div>
          <div className="w-[40%] h-full">
            <ChatPanel
              notice={inputNotice}
              submitDisabled={cooldownSeconds > 0 || Boolean(pendingChange)}
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
        <div className="w-full h-full relative overflow-y-auto ">
          <ReportPanel
            topic={topic}
            report={report}
            sources={sources}
            isChatOpen={false}
            isUpdatingReport={isUpdatingReport}
            onExportPdf={handleExportPdf}
            onNewResearch={onReset}
            exporting={exporting}
            onToggleSidebar={onToggleSidebar}
            isSidebarOpen={isSidebarOpen}
            hasMessages={messages.length > 0}
            onToggleChat={() => setIsChatOpen(true)}
            versions={previousVersions}
            selectedVersionNumber={selectedVersionNumber}
            currentVersionNumber={latestVersion?.version_number}
            onSelectVersion={setSelectedVersionNumber}
            pendingChange={pendingChange}
            onApproveChanges={handleApproveChanges}
            onRejectChanges={handleRejectChanges}
            historyLoading={historyLoading}
            historyBusy={historyBusy}
            historyError={historyError}
          />

          {/* Sticky bottom floating input overlay */}
          <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center pointer-events-none">
  <div className="relative w-full max-w-2xl pointer-events-auto">
    <ChatInput
      submitDisabled={cooldownSeconds > 0 || Boolean(pendingChange)}
      notice={inputNotice}
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
