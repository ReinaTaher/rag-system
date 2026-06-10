import { useState, useEffect } from 'react'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import Sidebar from './components/Sidebar'
import GuidedTour from './components/GuidedTour'
import { useTheme } from './context/ThemeContext'

const API = 'http://localhost:8000'

export default function App() {
  const { theme } = useTheme()
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [tourRunning, setTourRunning] = useState(false)

  // Load thread list on mount; show tour on first visit
  useEffect(() => {
    fetchThreads()
    if (!localStorage.getItem('rag_tour_done')) {
      setTourRunning(true)
    }
  }, [])

  function handleTourFinish() {
    setTourRunning(false)
    localStorage.setItem('rag_tour_done', '1')
  }

  async function fetchThreads() {
    try {
      const res = await fetch(`${API}/threads`)
      const data = await res.json()
      setThreads(data)
    } catch {
      // backend not ready yet — ignore silently
    }
  }

  async function createThread() {
    try {
      const res = await fetch(`${API}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      })
      const thread = await res.json()
      setThreads(prev => [thread, ...prev])
      setActiveThreadId(thread.id)
      setMessages([{ role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.' }])
    } catch {
      console.error('Failed to create thread')
    }
  }

  async function selectThread(threadId) {
    setActiveThreadId(threadId)
    setMessages([])
    try {
      const res = await fetch(`${API}/threads/${threadId}/messages`)
      const data = await res.json()
      const loaded = data.map(m => ({ role: m.role, content: m.content }))
      setMessages(
        loaded.length > 0
          ? loaded
          : [{ role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.' }]
      )
    } catch {
      console.error('Failed to load messages')
    }
  }

  async function sendMessage(text) {
    if (!activeThreadId) return

    const history = messages
      .filter(m => m.role !== 'assistant' || messages.indexOf(m) !== 0)
      .slice(-6)

    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/threads/${activeThreadId}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let firstToken = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const { token } = JSON.parse(data)
            if (firstToken) {
              firstToken = false
              setLoading(false)
              setStreaming(true)
              setMessages(prev => [...prev, { role: 'assistant', content: token }])
            } else {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = { ...last, content: last.content + token }
                return updated
              })
            }
          } catch { /* malformed line, skip */ }
        }
      }

      // Refresh sidebar so updated_at and title reflect latest activity
      fetchThreads()
    } catch {
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: could not reach the backend.' }])
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  return (
    <>
    <GuidedTour run={tourRunning} onFinish={handleTourFinish} />
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: theme.outerBg,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1100px',
        height: '95vh',
        backgroundColor: theme.cardBg,
        borderRadius: '16px',
        border: `1px solid ${theme.cardBorder}`,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        <Sidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelect={selectThread}
          onNewChat={createThread}
        />

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header />

          {activeThreadId ? (
            <>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ChatWindow messages={messages} loading={loading} streaming={streaming} />
              </div>
              <ChatInput onSend={sendMessage} disabled={loading || streaming} />
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              color: theme.textFaint,
            }}>
              <p style={{ fontSize: '15px' }}>Select a conversation or start a new one</p>
              <button
                onClick={createThread}
                style={{
                  padding: '10px 22px',
                  backgroundColor: theme.btnPrimary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                New Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
