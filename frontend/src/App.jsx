import { useState, useEffect } from 'react'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'
import Sidebar from './components/Sidebar'
import GuidedTour from './components/GuidedTour'
import EmptyState from './components/EmptyState'
import { useTheme } from './context/ThemeContext'
import { useWindowSize } from './hooks/useWindowSize'

const API = 'http://localhost:8000'

export default function App() {
  const { theme } = useTheme()
  const windowWidth = useWindowSize()
  const isMobile = windowWidth < 640
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 640)
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [tourRunning, setTourRunning] = useState(false)
  const [messageFeedback, setMessageFeedback] = useState({})

  useEffect(() => {
    if (windowWidth >= 640) setSidebarOpen(true)
    else setSidebarOpen(false)
  }, [windowWidth])

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
      setMessages([{ role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.', id: null, sources: null, version_count: 1, displayedVersion: 1, versions: null }])
      return thread.id
    } catch {
      console.error('Failed to create thread')
      return null
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
    setMessageFeedback({})
    try {
      const res = await fetch(`${API}/threads/${threadId}/messages`)
      const data = await res.json()
      const loaded = data.map(m => ({
        id: m.id || null,
        role: m.role,
        content: m.content,
        sources: m.sources || null,
        version_count: m.version_count ?? 1,
        displayedVersion: m.version_count ?? 1,
        versions: null,
      }))
      setMessages(
        loaded.length > 0
          ? loaded
          : [{ role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.', id: null, sources: null, version_count: 1, displayedVersion: 1, versions: null }]
      )
    } catch {
      console.error('Failed to load messages')
    }
  }

  async function sendMessage(text, threadIdOverride = null) {
    const targetThreadId = threadIdOverride || activeThreadId
    if (!targetThreadId) return

    const history = messages
      .filter(m => m.role !== 'assistant' || messages.indexOf(m) !== 0)
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, { role: 'user', content: text, id: null, sources: null, version_count: 1, displayedVersion: 1, versions: null }])
    setLoading(true)

    try {
      const res = await fetch(`${API}/threads/${targetThreadId}/chat/stream`, {
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
            if (parsed.message_id) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = { ...last, id: parsed.message_id, version_count: parsed.version_count ?? 1, displayedVersion: parsed.version_count ?? 1 }
                return updated
              })
            } else if (parsed.replace !== undefined) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = { ...last, content: parsed.replace }
                return updated
              })
            } else if (parsed.sources) {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = { ...last, sources: parsed.sources }
                return updated
              })
            } else if (parsed.token !== undefined) {
              const { token } = parsed
              if (firstToken) {
                firstToken = false
                setLoading(false)
                setStreaming(true)
                setMessages(prev => [...prev, { role: 'assistant', content: token, id: null, sources: null, version_count: 1, displayedVersion: 1, versions: null }])
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: could not reach the backend.', id: null, sources: null, version_count: 1, displayedVersion: 1, versions: null }])
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  async function regenerateMessage(msgIndex) {
    const msg = messages[msgIndex]
    if (!msg.id || streaming || loading) return

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
      updated[msgIndex] = { ...updated[msgIndex], content: '', sources: null, versions: null }
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
            } else if (parsed.replace !== undefined) {
              setMessages(prev => {
                const updated = [...prev]
                updated[msgIndex] = { ...updated[msgIndex], content: parsed.replace }
                return updated
              })
            } else if (parsed.sources) {
              setMessages(prev => {
                const updated = [...prev]
                updated[msgIndex] = { ...updated[msgIndex], sources: parsed.sources }
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

  async function submitFeedback(messageId, versionNum, vote, reason) {
    try {
      await fetch(`${API}/messages/${messageId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote, reason: reason || '', version_num: versionNum }),
      })
      setMessageFeedback(prev => ({ ...prev, [`${messageId}_v${versionNum}`]: vote }))
    } catch {
      console.error('Failed to submit feedback')
    }
  }

  function exportPDF() {
    if (!activeThreadId || messages.length === 0) return
    const activeThread = threads.find(t => t.id === activeThreadId)
    const title = activeThread?.title || 'Chat Export'
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    function esc(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    function mdToHtml(text) {
      return esc(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(\d+)\]/g, '<sup style="color:#1d4ed8;font-size:0.75em">[$1]</sup>')
        .split('\n\n')
        .map(block => {
          block = block.trim()
          if (!block) return ''
          const lines = block.split('\n')
          if (lines.every(l => /^-\s/.test(l.trim()) || !l.trim())) {
            const items = lines.filter(l => l.trim()).map(l => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')
            return `<ul>${items}</ul>`
          }
          return `<p>${block.replace(/\n/g, '<br>')}</p>`
        })
        .join('')
    }

    const rows = messages.map(msg => {
      if (msg.role === 'user') {
        return `<div class="msg-wrap user-wrap">
          <div class="label">You</div>
          <div class="bubble user-bubble">${esc(msg.content)}</div>
        </div>`
      }
      return `<div class="msg-wrap asst-wrap">
        <div class="label">Assistant</div>
        <div class="bubble asst-bubble">${mdToHtml(msg.content)}</div>
      </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:48px 32px;color:#18181b;background:#fff}
.hdr{margin-bottom:32px;padding-bottom:18px;border-bottom:2px solid #e4e4e7}
.hdr h1{font-size:21px;font-weight:700;color:#09090b}
.badge{display:inline-block;font-size:11px;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:99px;font-weight:500;margin-left:8px;vertical-align:middle}
.meta{font-size:12px;color:#71717a;margin-top:6px}
.msg-wrap{margin-bottom:16px}
.label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#71717a;margin-bottom:5px}
.user-wrap{display:flex;flex-direction:column;align-items:flex-end}
.user-wrap .label{color:#1d4ed8}
.bubble{font-size:13.5px;line-height:1.65;padding:12px 16px;border-radius:12px}
.user-bubble{background:#1d4ed8;color:#fff;border-radius:16px 16px 4px 16px;max-width:78%}
.asst-bubble{background:#f4f4f5;color:#18181b;border-radius:16px 16px 16px 4px;border:1px solid #e4e4e7}
.asst-bubble p{margin-bottom:8px}.asst-bubble p:last-child{margin-bottom:0}
.asst-bubble ul{padding-left:18px;margin:4px 0 8px}.asst-bubble li{margin-bottom:3px}
.asst-bubble strong{font-weight:600;color:#09090b}
.ftr{margin-top:36px;padding-top:14px;border-top:1px solid #e4e4e7;font-size:11px;color:#a1a1aa;text-align:center}
@media print{body{padding:0;max-width:100%}.bubble{break-inside:avoid}}
</style></head><body>
<div class="hdr">
  <h1>${esc(title)}<span class="badge">CIS Controls v8</span></h1>
  <div class="meta">Exported ${date} · RAG Security Assistant</div>
</div>
${rows}
<div class="ftr">Generated by RAG Security Assistant</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  return (
    <>
    <GuidedTour run={tourRunning} onFinish={handleTourFinish} isMobile={isMobile} />
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
        maxWidth: isMobile ? '100%' : '1100px',
        height: isMobile ? '100vh' : '95vh',
        backgroundColor: theme.cardBg,
        borderRadius: isMobile ? '0' : '16px',
        border: isMobile ? 'none' : `1px solid ${theme.cardBorder}`,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Mobile backdrop — tap to close sidebar */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 50,
            }}
          />
        )}

        <Sidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelect={(id) => { selectThread(id); if (isMobile) setSidebarOpen(false) }}
          onNewChat={() => { createThread(); if (isMobile) setSidebarOpen(false) }}
          onDelete={deleteThread}
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Header
            isMobile={isMobile}
            onToggleSidebar={() => setSidebarOpen(v => !v)}
            hasActiveThread={!!activeThreadId}
            onExport={exportPDF}
          />

          {activeThreadId ? (
            <>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ChatWindow
                  messages={messages}
                  loading={loading}
                  streaming={streaming}
                  onRegenerate={regenerateMessage}
                  onSwitchVersion={switchVersion}
                  onFeedback={submitFeedback}
                  messageFeedback={messageFeedback}
                  isMobile={isMobile}
                />
              </div>
              <ChatInput onSend={sendMessage} disabled={loading || streaming} />
            </>
          ) : (
            <EmptyState onNewChat={createThread} onSend={sendMessage} />
          )}
        </div>
      </div>
    </div>
    </>
  )
}
