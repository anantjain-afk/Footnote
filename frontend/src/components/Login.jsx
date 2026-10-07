import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './EntryViews.css';
import { supabase, authConfigurationError, isGoogleSignInEnabled } from '../lib/supabase';
import { useAuth } from '../context/useAuth';

function authErrorMessage(error) {
  const message = error?.message || 'Unable to sign in. Please try again.';
  if (/fetch|network/i.test(message)) return 'Cannot reach the sign-in service. Check your connection and try again.';
  if (/provider.*(disabled|not enabled)|unsupported provider/i.test(message)) {
    return 'Google sign-in is not available yet. Please use email and password.';
  }
  return message;
}

export default function Login({ initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode);
  const signup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { error: sessionError, clearError } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!supabase || loading) return;
    if (signup && password.length < 6) {
      setError('Use a password with at least 6 characters.');
      return;
    }
    setLoading(signup ? 'signup' : 'signin');
    setError(null);
    setNotice(null);
    clearError();
    try {
      const credentials = { email: email.trim(), password };
      const result = signup
        ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } })
        : await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (signup && !result.data.session) {
        setNotice('Check your email for a confirmation link, then return here to sign in.');
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabase || loading) return;
    setLoading('google');
    setError(null);
    setNotice(null);
    clearError();
    try {
      if (!await isGoogleSignInEnabled()) {
        throw new Error('Google sign-in is not available yet. Please use email and password.');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const changeMode = () => {
    setMode(signup ? 'signin' : 'signup');
    setError(null);
    setNotice(null);
    clearError();
    const url = new URL(window.location.href);
    url.searchParams.set('auth', signup ? 'signin' : 'signup');
    window.history.replaceState(null, '', url);
  };

  return (
    <div className="entry-page auth-page">
      <header className="entry-header">
        <a className="entry-brand" href="/">ResearchAI.</a>
        <a className="entry-text-link" href="/"><ArrowLeft size={16} aria-hidden="true" />Back to home</a>
      </header>
      <main className="auth-content">
        <div className="auth-intro">
          <h1>{signup ? <>Good research starts with a <span className="entry-accent-underline">question.</span></> : <>Back to your next <span className="entry-accent-underline">discovery.</span></>}</h1>
          <p className="entry-prose">{signup ? 'Make room for your curiosity. Build a library of research, explore the sources, and keep the conversation going.' : 'Your reports, sources, and conversations. All here, ready for wherever your curiosity takes you next.'}</p>
          <p className="auth-aside">A question. A clearer picture. A place to keep it.</p>
        </div>
        <div className="auth-form-panel">
          <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-description">{signup ? 'Start your own research workspace.' : 'Sign in to your research workspace.'}</p>
          {(error || sessionError || authConfigurationError) && <p role="alert" className="entry-notice">{error || sessionError || authConfigurationError}</p>}
          {notice && <p role="status" className="entry-notice">{notice}</p>}
          <form onSubmit={handleEmailAuth} aria-busy={Boolean(loading)} className="auth-form">
            <div><label htmlFor="email-address">Email address</label><input id="email-address" name="email" type="email" required autoComplete="email" disabled={Boolean(loading)} placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" required minLength={signup ? 6 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} aria-describedby={signup ? 'password-hint' : undefined} disabled={Boolean(loading)} placeholder={signup ? 'Create a password' : 'Enter your password'} value={password} onChange={e => setPassword(e.target.value)} />{signup && <p id="password-hint" className="entry-caption">Use at least 6 characters.</p>}</div>
            <button type="submit" className="entry-button entry-button-auth" disabled={Boolean(loading) || Boolean(authConfigurationError)}>{loading === 'signup' ? 'Creating account…' : loading === 'signin' ? 'Signing in…' : signup ? 'Create account' : 'Sign in'}<ArrowRight size={17} aria-hidden="true" /></button>
          </form>
          <div className="auth-divider"><span>or</span></div>
          <button type="button" onClick={handleGoogleLogin} disabled={Boolean(loading) || Boolean(authConfigurationError)} className="entry-button entry-button-outline auth-google">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <p className="auth-switch">{signup ? 'Already have an account?' : 'New to ResearchAI?'} <button type="button" onClick={changeMode} disabled={Boolean(loading)} className="entry-text-link">{signup ? 'Sign in' : 'Create an account'}</button></p>
        </div>
      </main>
      <footer className="entry-footer"><span>Research that stays with you.</span><span>ResearchAI.</span></footer>
    </div>
  );
}
