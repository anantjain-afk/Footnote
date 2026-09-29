import { useState, useEffect, useRef } from 'react'
import LandingView from './components/LandingView'
import LoadingView from './components/LoadingView'
import ReportChatView from './components/ReportChatView'
import ErrorView from './components/ErrorView'
import { Sidebar } from './components/Sidebar'
import { useSessionHistory } from './hooks/useSessionHistory'
import { useResearchStream } from './hooks/useResearchStream'
import { createSession, getSession } from './api/sessions'
import { Loader2 } from 'lucide-react'

function App() {
  const [view, setView] = useState('landing') // 'landing' | 'loading' | 'report' | 'error' | 'session_loading'
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [reportData, setReportData] = useState('')
  const [sources, setSources] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedAt, setGeneratedAt] = useState('')

  const { sessions, loading: loadingSessions, refresh, removeSession } = useSessionHistory()

  // SSE Hook for real-time progress
  const { 
    events, 
    currentNode, 
    scores, 
    isComplete, 
    report: streamedReport, 
    sources: streamedSources,
    error: streamError, 
    iterations 
  } = useResearchStream(view === 'loading' ? activeSessionId : null)

  // React to SSE completion
  useEffect(() => {
    if (view === 'loading' && isComplete && streamedReport) {
      setReportData(streamedReport)
      setSources(streamedSources || [])
      setGeneratedAt(new Date().toISOString())
      setView('report')
      refresh()
    }
  }, [isComplete, streamedReport, view, refresh])

  // React to SSE error
  useEffect(() => {
    if (view === 'loading' && streamError) {
      setErrorMsg(streamError)
      setView('error')
      refresh()
    }
  }, [streamError, view, refresh])

  const handleResearch = async (searchTopic) => {
    setTopic(searchTopic)
    setView('loading')
    setErrorMsg('')
    setReportData('')
    setSources([])
    setActiveSessionId(null)

    try {
      const data = await createSession(searchTopic);
      if (data && data.session_id) {
        setActiveSessionId(data.session_id);
        // Refresh history after a short delay so sidebar shows 'running'
        setTimeout(() => refresh(), 500);
      } else {
        throw new Error("Invalid response format. Expected JSON containing session_id.");
      }
    } catch (err) {
      console.error('Research error:', err);
      setErrorMsg(err.message || 'Failed to establish connection to the research pipeline.');
      setView('error');
      refresh(); // Refresh to show 'failed' state in sidebar
    }
  }

  const handleSelectSession = async (sessionId) => {

    setActiveSessionId(sessionId);
    setView('session_loading');
    try {
      const data = await getSession(sessionId); // { session, report }
      setTopic(data.session.topic);
      
      if (data.session.status === 'running') {
        setView('loading');
      } else if (data.session.status === 'failed') {
        setErrorMsg("The research pipeline run failed.");
        setView('error');
      } else {
        const reportText = data.report?.content || "";
        setReportData(reportText);
        setSources(data.sources || []);
        setGeneratedAt(data.report?.created_at || data.session.completed_at || new Date().toISOString());
        setView('report');
      }
    } catch (err) {
      console.error("Failed to load session details:", err);
      setErrorMsg("Failed to load session history details from the database.");
      setView('error');
    }
  };

  const handleReset = () => {
    setView('landing')
    setActiveSessionId(null)
    setTopic('')
    setReportData('')
    setSources([])
    setErrorMsg('')
    setGeneratedAt('')
  }

  const handleRemoveActive = () => {
    handleReset();
  }

  const handleRetry = () => {
    if (topic) {
      handleResearch(topic)
    } else {
      handleReset()
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#f9f9f9] text-black font-sans antialiased overflow-hidden selection:bg-black/10 selection:text-black">
      {isSidebarOpen && (
        <Sidebar
          sessions={sessions}
          loading={loadingSessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onRemoveSession={handleRemoveActive}
          onDeleteSession={removeSession}
          onNewResearch={handleReset}
        />
      )}

      <main className="flex-1 h-full overflow-y-auto relative">
        {view === 'landing' && (
          <LandingView onSubmit={handleResearch} />
        )}
        
        {view === 'loading' && (
          <LoadingView 
            topic={topic}
            currentNode={currentNode}
            scores={scores}
            events={events}
            iterations={iterations}
          />
        )}
        
        {view === 'report' && (
          <ReportChatView 
            sessionId={activeSessionId}
            topic={topic} 
            initialReport={reportData} 
            sources={sources}
            generatedAt={generatedAt} 
            onReset={handleReset}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />
        )}
        
        {view === 'error' && (
          <ErrorView 
            topic={topic} 
            errorMsg={errorMsg} 
            onRetry={handleRetry} 
            onReset={handleReset} 
          />
        )}

        {view === 'session_loading' && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
