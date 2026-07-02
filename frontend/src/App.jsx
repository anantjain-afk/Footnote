import { useState, useEffect, useRef } from 'react'
import LandingView from './components/LandingView'
import LoadingView from './components/LoadingView'
import ReportViewer from './components/ReportViewer'
import ErrorView from './components/ErrorView'
import { Sidebar } from './components/Sidebar'
import { useSessionHistory } from './hooks/useSessionHistory'
import { createSession, getSession } from './api/sessions'
import { Loader2 } from 'lucide-react'

function App() {
  const [view, setView] = useState('landing') // 'landing' | 'loading' | 'report' | 'error' | 'session_loading'
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [topic, setTopic] = useState('')
  const [reportData, setReportData] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedAt, setGeneratedAt] = useState('')

  const { sessions, loading: loadingSessions, refresh, removeSession } = useSessionHistory()
  const pollIntervalRef = useRef(null)

  // Polling logic for running sessions
  useEffect(() => {
    // If the view is loading and we have an active session, poll the database for completion
    if (view === 'loading' && activeSessionId) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const data = await getSession(activeSessionId);
          if (data.session.status === 'completed') {
            clearInterval(pollIntervalRef.current);
            const reportText = data.report?.content || "";
            setReportData(reportText);
            setGeneratedAt(data.report?.created_at || data.session.completed_at || new Date().toISOString());
            setView('report');
            refresh(); // update sidebar status
          } else if (data.session.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            setErrorMsg("The research pipeline run failed.");
            setView('error');
            refresh(); // update sidebar status
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [view, activeSessionId, refresh]);

  const handleResearch = async (searchTopic) => {
    setTopic(searchTopic)
    setView('loading')
    setErrorMsg('')
    setReportData('')
    setActiveSessionId(null)

    // Start session creation on backend (blocks until completed or failed)
    let sessionPromise = createSession(searchTopic);

    // Refresh history after a short delay so the sidebar displays the "running" item immediately
    setTimeout(() => {
      refresh();
    }, 500);

    try {
      const data = await sessionPromise;
      if (data && data.session_id) {
        setActiveSessionId(data.session_id);
        const reportText = typeof data.report === 'object' && data.report !== null
          ? (data.report.content || JSON.stringify(data.report))
          : data.report;
        setReportData(reportText);
        setGeneratedAt(new Date().toISOString());
        setView('report');
        refresh(); // Refresh again to show 'completed' Done state
      } else {
        throw new Error("Invalid response format. Expected JSON containing session_id and report.");
      }
    } catch (err) {
      console.error('Research error:', err);
      setErrorMsg(err.message || 'Failed to establish connection to the research pipeline.');
      setView('error');
      refresh(); // Refresh to show 'failed' state in sidebar
    }
  }

  const handleSelectSession = async (sessionId) => {
    // Clear any existing polling intervals first
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

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
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setView('landing')
    setActiveSessionId(null)
    setTopic('')
    setReportData('')
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
    <div className="flex h-screen w-screen bg-[#030303] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-purple-500/30 selection:text-purple-200">
      <Sidebar
        sessions={sessions}
        loading={loadingSessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onRemoveSession={handleRemoveActive}
        onDeleteSession={removeSession}
        onNewResearch={handleReset}
      />

      <main className="flex-1 h-full overflow-y-auto relative">
        {view === 'landing' && (
          <LandingView onSubmit={handleResearch} />
        )}
        
        {view === 'loading' && (
          <LoadingView topic={topic} />
        )}
        
        {view === 'report' && (
          <ReportViewer 
            topic={topic} 
            report={reportData} 
            generatedAt={generatedAt} 
            onReset={handleReset} 
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
