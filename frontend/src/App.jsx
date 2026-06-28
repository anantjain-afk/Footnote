import { useState } from 'react'
import LandingView from './components/LandingView'
import LoadingView from './components/LoadingView'
import ReportView from './components/ReportView'
import ErrorView from './components/ErrorView'

function App() {
  const [view, setView] = useState('landing') // 'landing' | 'loading' | 'report' | 'error'
  const [topic, setTopic] = useState('')
  const [reportData, setReportData] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedAt, setGeneratedAt] = useState('')

  const handleResearch = async (searchTopic) => {
    setTopic(searchTopic)
    setView('loading')
    setErrorMsg('')

    try {
      const response = await fetch('http://localhost:8000/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: searchTopic }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText || 'Server Error'}`)
      }

      const data = await response.json()

      if (data && data.report) {
        const reportText = typeof data.report === 'object' && data.report !== null
          ? (data.report.content || JSON.stringify(data.report))
          : data.report
        setReportData(reportText)
        setGeneratedAt(new Date().toISOString())
        setView('report')
      } else {
        throw new Error("Invalid response format. Expected JSON: { \"report\": \"...\" }")
      }
    } catch (err) {
      console.error('Research error:', err)
      setErrorMsg(err.message || 'Failed to establish connection to the research pipeline.')
      setView('error')
    }
  }

  const handleReset = () => {
    setView('landing')
    setTopic('')
    setReportData('')
    setErrorMsg('')
    setGeneratedAt('')
  }

  const handleRetry = () => {
    if (topic) {
      handleResearch(topic)
    } else {
      handleReset()
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans antialiased selection:bg-purple-500/30 selection:text-purple-200">
      {view === 'landing' && (
        <LandingView onSubmit={handleResearch} />
      )}
      
      {view === 'loading' && (
        <LoadingView topic={topic} />
      )}
      
      {view === 'report' && (
        <ReportView 
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
    </div>
  )
}

export default App
