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
      setMessages([{ role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.', id: null, version_count: 1, displayedVersion: 1, versions: null }])
    } catch {
      console.error('Failed to create thread')
    }
  }

  async function deleteThread(threadId) {
    try {
      await fetch(`${API}/threads/${threadId}`, { method: 'DELETE' })
      setThreads(prev => prev.filter(t => t.id !== threadId))
      if (activeThreadId === threadId) {
        setActiveThreadId(null)
        setMessages([])
      }
    } catch {
      console.error('Failed to delete thread')
    }
  }

  async function selectThread(threadId) {
    setActiveThreadId(threadId)
    setMessages([])
    try {
      const res = await fetch(`${API}/threads/${threadId}/messages`)
      const data = await res.json()
      const loaded = data.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        version_count: m.version_count ?? 1,
        displayedVersion: m.version_count ?? 1,
        versions: null,
      }))
      setMessages(
        loaded.length > 0
          ? loaded
          : [{ role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.', id: null, version_count: 1, displayedVersion: 1, versions: null }]
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
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, { role: 'user', content: text, id: null, version_count: 1, displayedVersion: 1, versions: null }])
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
            const parsed = JSON.parse(data)
            if (parsed.message_id !== undefined) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = { ...last, id: parsed.message_id, version_count: parsed.version_count ?? 1, displayedVersion: parsed.version_count ?? 1 }
                return updated
              })
            } else if (parsed.token !== undefined) {
              const { token } = parsed
              if (firstToken) {
                firstToken = false
                setLoading(false)
                setStreaming(true)
                setMessages(prev => [...prev, { role: 'assistant', content: token, id: null, version_count: 1, displayedVersion: 1, versions: null }])
              } else {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  updated[updated.length - 1] = { ...last, content: last.content + token }
                  return updated
                })
              }
            }
          } catch { /* malformed line, skip */ }
        }
      }

      fetchThreads()
    } catch {
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: could not reach the backend.', id: null, version_count: 1, displayedVersion: 1, versions: null }])
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  async function regenerateMessage(msgIndex) {
    const msg = messages[msgIndex]
    if (!msg.id || streaming || loading) return

    // Find the preceding user message for the original query + history
    let userQuery = ''
    let historyUpToMsg = []
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = messages[i].content
        historyUpToMsg = messages.slice(0, i).map(m => ({ role: m.role, content: m.content })).slice(-6)
        break
      }
    }
    if (!userQuery) return

    setStreaming(true)
    setMessages(prev => {
      const updated = [...prev]
      updated[msgIndex] = { ...updated[msgIndex], content: '', versions: null }
      return updated
    })

    try {
      const res = await fetch(`${API}/threads/${activeThreadId}/messages/${msg.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userQuery, history: historyUpToMsg }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.version_count !== undefined) {
              setMessages(prev => {
                const updated = [...prev]
                updated[msgIndex] = { ...updated[msgIndex], version_count: parsed.version_count, displayedVersion: parsed.version_count }
                return updated
              })
            } else if (parsed.token !== undefined) {
              setMessages(prev => {
                const updated = [...prev]
                updated[msgIndex] = { ...updated[msgIndex], content: updated[msgIndex].content + parsed.token }
                return updated
              })
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      console.error('Regeneration failed')
    } finally {
      setStreaming(false)
    }
  }

  async function switchVersion(msgIndex, delta) {
    const msg = messages[msgIndex]
    const currentV = msg.displayedVersion ?? msg.version_count
    const newV = currentV + delta
    if (newV < 1 || newV > msg.version_count) return

    // Load old versions from API if not yet loaded
    if (!msg.versions) {
      try {
        const res = await fetch(`${API}/messages/${msg.id}/versions`)
        const data = await res.json()
        setMessages(prev => {
          const updated = [...prev]
          updated[msgIndex] = { ...updated[msgIndex], versions: data, displayedVersion: newV }
          return updated
        })
      } catch {
        console.error('Failed to load versions')
      }
    } else {
      setMessages(prev => {
        const updated = [...prev]
        updated[msgIndex] = { ...updated[msgIndex], displayedVersion: newV }
        return updated
      })
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
        <Sidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelect={selectThread}
          onNewChat={createThread}
          onDelete={deleteThread}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header />

          {activeThreadId ? (
            <>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ChatWindow
                  messages={messages}
                  loading={loading}
                  streaming={streaming}
                  onRegenerate={regenerateMessage}
                  onSwitchVersion={switchVersion}
                />
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
