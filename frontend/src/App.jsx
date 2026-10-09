import { useState, useRef, useEffect } from 'react'
import DashboardView from './components/DashboardView'
import SettingsView from './components/SettingsView'
import LandingView from './components/LandingView'
import LoadingView from './components/LoadingView'
import DeepResearchLoadingView from './components/DeepResearchLoadingView'
import ReportChatView from './components/ReportChatView'
import ErrorView from './components/ErrorView'
import { Sidebar } from './components/Sidebar'
import { useSessionHistory } from './hooks/useSessionHistory'
import { useResearchStream } from './hooks/useResearchStream'
import { createSession, getSession } from './api/sessions'
import { getUserSettings } from './api/userSettings'
import { Loader2 } from 'lucide-react'
import { useAuth } from './context/useAuth'
import Login from './components/Login'
import { useQuotaCooldowns } from './hooks/useQuotaCooldowns'

function App() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" role="status">Restoring your session…</div>
  }
  if (!user) {
    const query = new URLSearchParams(window.location.search)
    const authMode = query.get('auth')
    const callbackError = query.has('error_description') || new URLSearchParams(window.location.hash.slice(1)).has('error_description')
    return authMode === 'signin' || authMode === 'signup' || callbackError
      ? <Login initialMode={authMode === 'signup' ? 'signup' : 'signin'} />
      : <LandingView />
  }
  return <AuthenticatedApp key={user.id} />
}

function AuthenticatedApp() {
  const { user, signOut } = useAuth()
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('auth')) {
      url.searchParams.delete('auth')
      window.history.replaceState(null, '', url)
    }
  }, [])
  const quotas = useQuotaCooldowns()
  const researchPending = useRef(false)
  const [errorStatus, setErrorStatus] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(null)
  const [view, setView] = useState(() => window.location.hash === '#settings' ? 'settings' : 'dashboard')
  const [deepKeyMissing, setDeepKeyMissing] = useState(false)
  const [settingsCheckError, setSettingsCheckError] = useState('')
  const [mode, setMode] = useState('normal')
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [reportData, setReportData] = useState('')
  const [sources, setSources] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedAt, setGeneratedAt] = useState('')

  useEffect(() => {
    const syncHash = () => setView(previous => {
      if (window.location.hash === '#settings') return 'settings'
      return previous === 'settings' ? 'dashboard' : previous
    })
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  const openSettings = () => {
    window.location.hash = 'settings'
    setView('settings')
    setIsSidebarOpen(false)
  }

  const clearSettingsHash = () => {
    if (window.location.hash === '#settings') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }

  const { sessions, loading: loadingSessions, error: historyError, refresh, removeSession } = useSessionHistory()

  // SSE Hook for real-time progress
  const { 
    events, 
    currentNode, 
    scores, 
    iterations,
    subQuestions,
    subQuestionProgress,
    researchRound,
    gaps,
    sectionProgress,
    stats,
    verifiedPct
  } = useResearchStream(view === 'loading' ? activeSessionId : null, {
    onComplete: (data) => {
      setReportData(data.report || '')
      setSources(data.sources || [])
      setGeneratedAt(new Date().toISOString())
      setView('report')
      refresh()
    },
    onError: (message) => {
      setErrorMsg(message)
      setView('error')
      refresh()
    },
  })

  const handleResearch = async (searchTopic, searchMode = 'normal') => {
    if (researchPending.current || quotas.reports > 0) return
    researchPending.current = true
    setErrorStatus(null)
    setTopic(searchTopic)
    setMode(searchMode)
    setDeepKeyMissing(false)
    setSettingsCheckError('')
    setErrorMsg('')
    setReportData('')
    setSources([])

    try {
      if (searchMode === 'deep_research') {
        let keyStatus
        try {
          keyStatus = await getUserSettings()
        } catch {
          setSettingsCheckError('Could not check your Firecrawl key. Please try again.')
          return
        }
        if (!keyStatus.has_firecrawl_key) {
          setDeepKeyMissing(true)
          return
        }
      }
      setActiveSessionId(null)
      setView('loading')
      const data = await createSession(searchTopic, searchMode);
      if (data && data.session_id) {
        setActiveSessionId(data.session_id);
        // Refresh history after a short delay so sidebar shows 'running'
        setTimeout(() => refresh(), 500);
      } else {
        throw new Error("Invalid response format. Expected JSON containing session_id.");
      }
    } catch (err) {
      if (searchMode === 'deep_research' && err.status === 400) {
        setDeepKeyMissing(true)
        setView('dashboard')
        return
      }
      console.error('Research error:', err);
      quotas.record('reports', err);
      setErrorStatus(err.status);
      setErrorMsg(err.message || 'Failed to establish connection to the research pipeline.');
      setView('error');
      refresh(); // Refresh to show 'failed' state in sidebar
    } finally {
      researchPending.current = false;
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
    } catch {
      setSignOutError('Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const handleSelectSession = async (sessionId) => {
    clearSettingsHash()
    setErrorStatus(null)

    setActiveSessionId(sessionId);
    setView('session_loading');
    try {
      const data = await getSession(sessionId); // { session, report }
      setTopic(data.session.topic);
      setMode(data.session.mode || 'normal');
      
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
    clearSettingsHash()
    setErrorStatus(null)
    setDeepKeyMissing(false)
    setSettingsCheckError('')
    setView('dashboard')
    setActiveSessionId(null)
    setTopic('')
    setReportData('')
    setSources([])
    setErrorMsg('')
    setGeneratedAt('')
  }

  const handleBackFromSettings = () => {
    clearSettingsHash()
    setDeepKeyMissing(false)
    setSettingsCheckError('')
    setView('dashboard')
  }

  const handleRemoveActive = () => {
    handleReset();
  }

  const handleRetry = () => {
    if (topic) {
      handleResearch(topic, mode)
    } else {
      handleReset()
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#f9f9f9] text-black font-sans antialiased overflow-hidden selection:bg-black/10 selection:text-black">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions}
        loading={loadingSessions}
        historyError={historyError}
        onRetryHistory={refresh}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onRemoveSession={handleRemoveActive}
        onDeleteSession={removeSession}
        onNewResearch={handleReset}
        onOpenSettings={openSettings}
        settingsActive={view === 'settings'}
        email={user.email}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        signOutError={signOutError}
      />

      <main className="flex-1 min-w-0 h-full overflow-y-auto relative">
        {view === 'dashboard' && (
          <DashboardView
            sessions={sessions}
            loadingSessions={loadingSessions}
            historyError={historyError}
            onRetryHistory={refresh}
            onSelectSession={handleSelectSession}
            cooldownSeconds={quotas.reports}
            initialTopic={topic}
            initialMode={mode}
            onSubmit={handleResearch}
            onOpenSettings={openSettings}
            deepKeyMissing={deepKeyMissing}
            settingsCheckError={settingsCheckError}
          />
        )}

        {view === 'settings' && <SettingsView onBack={handleBackFromSettings} onKeyChange={() => { setDeepKeyMissing(false); setSettingsCheckError('') }} />}
        
        {view === 'loading' && (
          mode === 'deep_research' ? (
            <DeepResearchLoadingView 
              topic={topic}
              currentNode={currentNode}
              scores={scores}
              events={events}
              iterations={iterations}
              subQuestions={subQuestions}
              subQuestionProgress={subQuestionProgress}
              researchRound={researchRound}
              gaps={gaps}
              sectionProgress={sectionProgress}
              stats={stats}
              verifiedPct={verifiedPct}
            />
          ) : (
            <LoadingView 
              topic={topic}
              currentNode={currentNode}
              scores={scores}
              events={events}
              iterations={iterations}
            />
          )
        )}
        
        {view === 'report' && (
          <ReportChatView 
            key={activeSessionId}
            cooldownSeconds={quotas.chat}
            onQuotaError={(error) => quotas.record('chat', error)}
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
            errorStatus={errorStatus}
            cooldownSeconds={quotas.reports}
            onRetry={handleRetry} 
            onReset={() => setView('dashboard')}
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
