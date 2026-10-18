import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, KeyRound, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { deleteFirecrawlKey, getUserSettings, saveFirecrawlKey } from '../api/userSettings'
import './SettingsView.css'

export default function SettingsView({ onBack, onKeyChange }) {
  const [loading, setLoading] = useState(true)
  const [hasKey, setHasKey] = useState(false)
  const [editing, setEditing] = useState(false)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    getUserSettings().then(data => {
      if (active) setHasKey(data.has_firecrawl_key)
    }).catch(() => {
      if (active) setError('Could not load your settings. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const save = async event => {
    event.preventDefault()
    if (!key.trim() || busy) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await saveFirecrawlKey(key.trim())
      setKey('')
      setHasKey(true)
      setEditing(false)
      setSuccess('Firecrawl key saved.')
      onKeyChange?.(true)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await deleteFirecrawlKey()
      setHasKey(false)
      setEditing(false)
      setKey('')
      setSuccess('Firecrawl key removed.')
      onKeyChange?.(false)
    } catch (removeError) {
      setError(removeError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="entry-page settings-page">
      <header className="dashboard-header settings-header"><span className="entry-brand">Footnote.</span><span className="entry-caption">Your workspace</span></header>
      <div className="settings-content">
        <button type="button" className="settings-back" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" /> Back to research</button>
        <div className="settings-intro">
          <h1>Settings</h1>
          <p className="entry-prose">Your research tools, set up your way.</p>
        </div>

        <section className="settings-section" aria-labelledby="api-keys-title">
          <div className="settings-section-heading">
            <div className="settings-icon"><KeyRound size={22} strokeWidth={1.7} aria-hidden="true" /></div>
            <div><h2 id="api-keys-title">API Keys</h2><p>Connect your Firecrawl account for Deep Research.</p></div>
          </div>

          {loading ? <p role="status" className="settings-loading"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Loading your settings…</p> : (
            <div className="settings-key-area">
              <div className="settings-field-heading">{hasKey && !editing ? <span className="settings-field-label">Firecrawl API Key</span> : <label htmlFor="firecrawl-key">Firecrawl API Key</label>}{hasKey && <span className="settings-status"><Check size={14} aria-hidden="true" /> Saved</span>}</div>
              {hasKey && !editing ? (
                <div className="settings-saved">
                  <div id="firecrawl-key" className="settings-masked" aria-label="Firecrawl API key saved and hidden">fc-••••••••••••</div>
                  <button type="button" onClick={() => { setEditing(true); setSuccess('') }}>Edit</button>
                  <button type="button" className="settings-remove" onClick={remove} disabled={busy}><Trash2 size={15} aria-hidden="true" /> {busy ? 'Removing…' : 'Remove'}</button>
                </div>
              ) : (
                <form onSubmit={save} className="settings-key-form">
                  <input id="firecrawl-key" type="password" value={key} onChange={event => setKey(event.target.value)} placeholder="fc-••••••••••••" autoComplete="off" spellCheck="false" autoCapitalize="off" aria-describedby="firecrawl-hint" maxLength={512} required />
                  <div className="settings-actions"><button type="submit" className="entry-button entry-button-research" disabled={busy || !key.trim()}>{busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Saving…</> : 'Save key'}</button>{editing && <button type="button" className="settings-cancel" onClick={() => { setEditing(false); setKey(''); setError('') }}>Cancel</button>}</div>
                </form>
              )}
              <p id="firecrawl-hint" className="settings-hint">Need a key? <a href="https://www.firecrawl.dev/" target="_blank" rel="noopener noreferrer">Get your free API key at firecrawl.dev <ArrowUpRight size={14} aria-hidden="true" /></a></p>
              {error && <p className="settings-feedback settings-error" role="alert">{error}</p>}
              {success && <p className="settings-feedback settings-success" role="status">{success}</p>}
            </div>
          )}
        </section>
        <div className="settings-note"><ShieldCheck size={20} strokeWidth={1.7} aria-hidden="true" /><p>Your key is encrypted when saved. Normal research works without one; Deep Research uses your key.</p></div>
      </div>
    </div>
  )
}
