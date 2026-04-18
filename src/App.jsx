import { useState } from 'react'
import MainPage from './MainPage'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoggedIn(true)
  }

  if (loggedIn) {
    return <MainPage onLogout={() => setLoggedIn(false)} />
  }

  const switchView = (v) => {
    setView(v)
    setEmail('')
    setPassword('')
    setName('')
    setConfirmPassword('')
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
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

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

          {view === 'login' && (
            <div className="forgot-row">
              <a href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
          )}

          <button type="submit" className="btn-primary">
            {view === 'login' ? 'Sign in' : 'Create account'}
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
