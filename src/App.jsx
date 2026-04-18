import { useState } from 'react'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    console.log('Login attempt:', { email, password })
  }

  return (
    <div className="page">
      <div className="card">
        <div className="brand">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#00c9a7" strokeWidth="2" />
              <circle cx="14" cy="14" r="4" fill="#00c9a7" />
              <path d="M14 4 Q18 9 14 14 Q10 9 14 4Z" fill="#00c9a7" opacity="0.4" />
            </svg>
          </div>
          <h1 className="app-name">Loci</h1>
        </div>
        <p className="tagline">Your world, remembered.</p>

        <form className="form" onSubmit={handleLogin}>
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
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-login">
            Sign in
          </button>
        </form>

        <p className="signup-prompt">
          Don't have an account?{' '}
          <a href="#" onClick={(e) => e.preventDefault()}>
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}
