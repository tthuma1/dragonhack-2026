import { useState } from 'react'
import MainPage from './MainPage'
import { signIn, signUp, signOut } from './services/api.js'

export default function App() {
  const [palIdR, setPalIdR] = useState(() => localStorage.getItem('palIdR'))
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('token'))
  const [view, setView] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)
    try {
      if (view === 'login') {
        const res = await signIn({ username, password })
        localStorage.setItem('token', res.token)
        localStorage.setItem('palIdR', res.pal_id_r)
        setToken(res.token)
        setPalIdR(res.pal_id_r)
        setLoggedIn(true)
      } else {
        await signUp({ username: name, email, password, repassword: confirmPassword })
        setView('login')
        setUsername(name)
        setName('')
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    if (token) await signOut(token).catch(() => {})
    localStorage.removeItem('token')
    localStorage.removeItem('palIdR')
    setToken(null)
    setPalIdR(null)
    setLoggedIn(false)
  }

  if (loggedIn) {
    return <MainPage onLogout={handleLogout} palIdR={palIdR} />
  }

  const switchView = (v) => {
    setView(v)
    setUsername('')
    setEmail('')
    setPassword('')
    setName('')
    setConfirmPassword('')
    setAuthError(null)
  }

  return (
    <div className="page">
      <div className="card">
        <div className="brand">
          <div className="logo">
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#CC1111" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="5" fill="#CC1111" />
              <path d="M16 4 Q21 10 16 16 Q11 10 16 4Z" fill="#CC1111" opacity="0.45" />
            </svg>
          </div>
          <h1 className="app-name">
            <span className="brand-b">B</span><span className="brand-track">Track</span>
          </h1>
        </div>
        <p className="tagline">
          {view === 'login' ? 'Welcome back. Sign in to continue.' : 'Create your account to get started.'}
        </p>

        <div className="tab-row">
          <button
            className={`tab ${view === 'login' ? 'tab-active' : ''}`}
            onClick={() => switchView('login')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`tab ${view === 'signup' ? 'tab-active' : ''}`}
            onClick={() => switchView('signup')}
            type="button"
          >
            Sign up
          </button>
        </div>

        <form key={view} className="form form-animated" onSubmit={handleSubmit}>
          {view === 'signup' && (
            <div className="field">
              <label htmlFor="name">Username</label>
              <input
                id="name"
                type="text"
                placeholder="janedoe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}

          {view === 'login' && (
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="janedoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}

          {view === 'signup' && (
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {view === 'signup' && (
            <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {authError && <p className="form-error">{authError}</p>}

          <button type="submit" className="btn-primary" disabled={authLoading}>
            {authLoading ? 'Please wait…' : view === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="switch-prompt">
          {view === 'login' ? (
            <>Don't have an account?{' '}<a href="#" onClick={(e) => { e.preventDefault(); switchView('signup') }}>Sign up</a></>
          ) : (
            <>Already have an account?{' '}<a href="#" onClick={(e) => { e.preventDefault(); switchView('login') }}>Sign in</a></>
          )}
        </p>
      </div>
    </div>
  )
}
