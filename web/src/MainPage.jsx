import { useState, useRef, useEffect } from 'react'
import './MainPage.css'
import locationLogs from './data/locationLogs.js'
import { analyzeLocationLogs, generateInstagramCaption, generateRecommendations, sendChatMessage } from './services/gemini.js'
import MapView from './MapView.jsx'

const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconMap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)

const IconAnalysis = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
)

const IconAI = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
    <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    <path d="M9 14s1 1 3 1 3-1 3-1" />
  </svg>
)

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

const MOCK_RESULTS = [
  { id: 1, name: 'Central Park', type: 'Park', dist: '0.3 km' },
  { id: 2, name: 'Times Square', type: 'Landmark', dist: '1.2 km' },
  { id: 3, name: 'Brooklyn Bridge', type: 'Bridge', dist: '3.4 km' },
  { id: 4, name: 'Grand Central', type: 'Station', dist: '0.8 km' },
  { id: 5, name: 'The High Line', type: 'Park', dist: '2.1 km' },
]

const MOCK_CHAT = [
  { role: 'ai', text: 'Hi! I\'m BTrack AI. Ask me anything about your tracked locations.' },
]

function RecCard({ rec, outside }) {
  return (
    <div className={`rec-card ${outside ? 'rec-card-outside' : ''}`}>
      <div className="rec-card-top">
        <span className={`rec-category ${outside ? 'rec-category-outside' : ''}`}>{rec.category}</span>
        <span className="rec-vibe">{rec.vibe}</span>
      </div>
      <h3 className="rec-name">{rec.name}</h3>
      <p className="rec-reason">{rec.reason}</p>
      <div className="rec-best-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        {rec.bestTime}
      </div>
    </div>
  )
}

function renderMarkdown(text) {
  return text.split('\n').map((line, li) => {
    const parts = []
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
    let last = 0, match
    while ((match = re.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index))
      if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>)
      else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>)
      last = match.index + match[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return <span key={li}>{parts}{li < text.split('\n').length - 1 && <br />}</span>
  })
}

const IconHeart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)
const IconComment = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconShare = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)
const IconBookmark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function InstagramModal({ onClose, analysis }) {
  const [caption, setCaption] = useState('')
  const [captionLoading, setCaptionLoading] = useState(true)
  const [captionError, setCaptionError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCaptionLoading(true)
    setCaptionError(null)
    generateInstagramCaption(analysis)
      .then(setCaption)
      .catch(e => setCaptionError(e.message))
      .finally(() => setCaptionLoading(false))
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(caption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ig-backdrop" onClick={onClose}>
      <div className="ig-modal" onClick={e => e.stopPropagation()}>
        {/* Top bar with close */}
        <div className="ig-topbar">
          <span className="ig-topbar-title">Instagram preview</span>
          <button className="ig-close" onClick={onClose}><IconClose /></button>
        </div>

        {/* Header */}
        <div className="ig-header">
          <div className="ig-avatar">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#CC1111" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="5" fill="#CC1111" />
              <path d="M16 4 Q21 10 16 16 Q11 10 16 4Z" fill="#CC1111" opacity="0.45" />
            </svg>
          </div>
          <div className="ig-header-info">
            <span className="ig-username">btrack_app</span>
            <span className="ig-location">Your City · Yesterday</span>
          </div>
          <button className="ig-follow-btn">Follow</button>
        </div>

        {/* Image placeholder */}
        <div className="ig-image">
          <div className="ig-image-inner">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" opacity="0.35">
              <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="5" fill="white" />
              <path d="M16 4 Q21 10 16 16 Q11 10 16 4Z" fill="white" opacity="0.6" />
            </svg>
            <span className="ig-image-label">BTrack · Map Preview</span>
          </div>
        </div>

        {/* Actions */}
        <div className="ig-actions">
          <div className="ig-actions-left">
            <button className="ig-icon-btn"><IconHeart /></button>
            <button className="ig-icon-btn"><IconComment /></button>
            <button className="ig-icon-btn"><IconShare /></button>
          </div>
          <button className="ig-icon-btn"><IconBookmark /></button>
        </div>

        <div className="ig-likes">1,284 likes</div>

        {/* Caption */}
        <div className="ig-caption-block">
          <div className="ig-caption-header">
            <span className="ig-caption-label">AI-generated caption</span>
            {!captionLoading && !captionError && (
              <button className={`ig-copy-btn ${copied ? 'ig-copy-btn-done' : ''}`} onClick={handleCopy} disabled={!caption}>
                <IconCopy />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          {captionLoading && (
            <div className="ig-caption-loading">
              <div className="analysis-spinner" />
              Generating caption…
            </div>
          )}
          {captionError && (
            <p className="ig-caption-error">{captionError}</p>
          )}
          {!captionLoading && !captionError && (
            <p className="ig-caption">{caption}</p>
          )}
        </div>

        <div className="ig-date">April 17, 2026</div>
      </div>
    </div>
  )
}

export default function MainPage({ onLogout }) {
  const [mainView, setMainView] = useState('map')
  const [panel, setPanel] = useState(null) // 'search' | 'ai' | null
  const [searchQuery, setSearchQuery] = useState('')
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [igOpen, setIgOpen] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [analysisTab, setAnalysisTab] = useState('overview')
  const [recommendations, setRecommendations] = useState(null)
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsError, setRecsError] = useState(null)
  const chatEndRef = useRef(null)

  const filteredResults = MOCK_RESULTS.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const togglePanel = (name) => {
    setPanel(prev => prev === name ? null : name)
  }

  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return
    const userMsg = { role: 'user', text: chatInput.trim() }
    const updatedMessages = [...chatMessages, userMsg]
    setChatMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const reply = await sendChatMessage(updatedMessages, analysis, locationLogs)
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'ai', text: `Error: ${e.message}` }])
    } finally {
      setChatLoading(false)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (analysisTab !== 'recommendations' || !analysis || recommendations || recsLoading) return
    setRecsLoading(true)
    setRecsError(null)
    generateRecommendations(analysis)
      .then(setRecommendations)
      .catch(e => setRecsError(e.message))
      .finally(() => setRecsLoading(false))
  }, [analysisTab, analysis])

  useEffect(() => {
    if (mainView !== 'analysis' || analysis || analysisLoading) return
    setAnalysisLoading(true)
    setAnalysisError(null)
    analyzeLocationLogs(locationLogs)
      .then(setAnalysis)
      .catch(e => setAnalysisError(e.message))
      .finally(() => setAnalysisLoading(false))
  }, [mainView])

  return (
    <div className="main-layout">
      {igOpen && <InstagramModal onClose={() => setIgOpen(false)} analysis={analysis} />}
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#CC1111" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="5" fill="#CC1111" />
              <path d="M16 4 Q21 10 16 16 Q11 10 16 4Z" fill="#CC1111" opacity="0.45" />
            </svg>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-btn ${panel === 'search' ? 'nav-btn-active' : ''}`}
              onClick={() => togglePanel('search')}
              title="Search"
            >
              <IconSearch />
              <span>Search</span>
            </button>

            <button
              className={`nav-btn ${mainView === 'map' ? 'nav-btn-active' : ''}`}
              onClick={() => setMainView('map')}
              title="Map"
            >
              <IconMap />
              <span>Map</span>
            </button>

            <button
              className={`nav-btn ${mainView === 'analysis' ? 'nav-btn-active' : ''}`}
              onClick={() => setMainView('analysis')}
              title="Analysis"
            >
              <IconAnalysis />
              <span>Analysis</span>
            </button>

            <button
              className={`nav-btn ${panel === 'ai' ? 'nav-btn-active' : ''}`}
              onClick={() => togglePanel('ai')}
              title="AI Assistant"
            >
              <IconAI />
              <span>AI</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button className="nav-btn nav-btn-logout" onClick={onLogout} title="Sign out">
            <IconLogout />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Side panel */}
      <div className={`side-panel ${panel ? 'side-panel-open' : ''}`}>
        {panel === 'search' && (
          <div className="panel-inner" key="search">
            <p className="panel-label">Search places</p>
            <div className="search-input-wrap">
              <IconSearch />
              <input
                type="text"
                placeholder="Search by place, type…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="search-results">
              {searchQuery === '' ? (
                <p className="panel-hint">Start typing to find places</p>
              ) : filteredResults.length === 0 ? (
                <p className="panel-hint">No results found</p>
              ) : (
                filteredResults.map(r => (
                  <div key={r.id} className="search-result-item">
                    <div className="result-dot" />
                    <div className="result-info">
                      <span className="result-name">{r.name}</span>
                      <span className="result-meta">{r.type} · {r.dist}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {panel === 'ai' && (
          <div className="panel-inner ai-panel-inner" key="ai">
            <p className="panel-label">BTrack AI</p>
            <div className="chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
                  {msg.role === 'ai' ? renderMarkdown(msg.text) : msg.text}
                </div>
              ))}
              {chatLoading && (
                <div className="chat-bubble chat-bubble-ai chat-bubble-typing">
                  <span /><span /><span />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form className="chat-input-row" onSubmit={handleSendChat}>
              <input
                type="text"
                placeholder="Ask something…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                autoFocus
                disabled={chatLoading}
              />
              <button type="submit" className="chat-send-btn" disabled={chatLoading}>
                {chatLoading ? <div className="chat-send-spinner" /> : <IconSend />}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="main-content">
        {mainView === 'map' ? (
          <MapView key="map" analysis={analysis} />
        ) : (
          <div className="analysis-view" key="analysis">
            <div className="analysis-header">
              <h2>Analysis Dashboard</h2>
              <p>Your location activity at a glance · {locationLogs.length} events logged</p>
            </div>

            <div className="analysis-tab-row">
              <button className={`analysis-tab ${analysisTab === 'overview' ? 'analysis-tab-active' : ''}`} onClick={() => setAnalysisTab('overview')}>Overview</button>
              <button className={`analysis-tab ${analysisTab === 'recommendations' ? 'analysis-tab-active' : ''}`} onClick={() => setAnalysisTab('recommendations')}>Recommendations</button>
            </div>

            {analysisTab === 'overview' && (
              <>
                {analysisLoading && (
                  <div className="analysis-loading">
                    <div className="analysis-spinner" />
                    <span>Analysing your day with AI…</span>
                  </div>
                )}

                {analysisError && (
                  <div className="analysis-error">
                    <strong>Could not load analysis</strong>
                    <span>{analysisError}</span>
                    <button onClick={() => { setAnalysis(null); setAnalysisLoading(false); setAnalysisError(null); setMainView('map'); setTimeout(() => setMainView('analysis'), 50) }}>
                      Retry
                    </button>
                  </div>
                )}

                {analysis && !analysisLoading && (
                  <>
                    <div className="analysis-stats-row">
                      <div className="stat-card-solo-inner">
                        <span className="stat-value-big">{analysis.timeTracked}</span>
                        <span className="stat-label-big">Time tracked yesterday</span>
                        <div className="stat-bar-wide">
                          <div className="stat-bar-fill-wide" style={{ width: `${Math.min(100, (analysis.movingTimeMinutes / (analysis.movingTimeMinutes + analysis.stationaryTimeMinutes)) * 100 + 20)}%` }} />
                        </div>
                        <span className="stat-sub">{analysis.totalDistanceKm} km · most active {analysis.mostActiveHour}</span>
                      </div>

                      <div className="stat-card-solo-inner">
                        <span className="stat-value-big" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>{analysis.favoritePlace.name}</span>
                        <span className="stat-label-big">Favourite place</span>
                        <div className="stat-bar-wide">
                          <div className="stat-bar-fill-wide" style={{ width: '100%' }} />
                        </div>
                        <span className="stat-sub">{analysis.favoritePlace.totalDuration} · {analysis.favoritePlace.visits} visit{analysis.favoritePlace.visits !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="places-card">
                      <p className="places-card-label">Places visited</p>
                      <div className="places-list">
                        {analysis.placesVisited.map((p, i) => (
                          <div key={i} className="place-row">
                            <div className="place-index">{i + 1}</div>
                            <div className="place-info">
                              <span className="place-name">{p.name}</span>
                              <span className="place-meta">{p.arrivalTime} – {p.departureTime} · {p.durationMinutes} min</span>
                            </div>
                            <div className="place-coords">{p.coordinates.lat.toFixed(4)}, {p.coordinates.lng.toFixed(4)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="summary-card">
                      <p className="places-card-label">AI summary</p>
                      <p className="summary-text">{analysis.summary}</p>
                      <p className="summary-path-note">📍 {analysis.path?.length ?? 0} path points ready for map rendering</p>
                    </div>
                  </>
                )}
              </>
            )}

            {analysisTab === 'recommendations' && (
              <>
                {!analysis && !analysisLoading && (
                  <div className="analysis-loading">
                    <div className="analysis-spinner" />
                    <span>Waiting for analysis to complete…</span>
                  </div>
                )}

                {recsLoading && (
                  <div className="analysis-loading">
                    <div className="analysis-spinner" />
                    <span>Finding places you'd love…</span>
                  </div>
                )}

                {recsError && (
                  <div className="analysis-error">
                    <strong>Could not load recommendations</strong>
                    <span>{recsError}</span>
                    <button onClick={() => { setRecommendations(null); setRecsLoading(false); setRecsError(null); setAnalysisTab('overview'); setTimeout(() => setAnalysisTab('recommendations'), 50) }}>Retry</button>
                  </div>
                )}

                {recommendations && !recsLoading && (
                  <div className="recs-section">
                    <p className="recs-intro">We think you'd like:</p>
                    <div className="recs-grid">
                      {recommendations.forYou?.map((rec, i) => (
                        <RecCard key={i} rec={rec} />
                      ))}
                    </div>

                    <div className="recs-divider">
                      <span>Step outside your comfort zone</span>
                    </div>

                    <div className="recs-grid">
                      {recommendations.stepOutside?.map((rec, i) => (
                        <RecCard key={i} rec={rec} outside />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="analysis-footer">
              <button className="btn-generate-ig" onClick={() => setIgOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                </svg>
                Generate Instagram post
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
