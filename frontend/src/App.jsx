import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
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

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 18
    const maxW = pageW - margin * 2
    let y = margin

    function checkPage(needed = 10) {
      if (y + needed > pageH - margin) {
        doc.addPage()
        y = margin
      }
    }

    function stripMd(text) {
      return text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[(\d+)\]/g, '[$1]')
    }

    // Header block
    doc.setFillColor(29, 78, 216)
    doc.rect(0, 0, pageW, 14, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('CIS Security Controls Assistant', margin, 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('CIS Controls v8', pageW - margin, 9, { align: 'right' })
    y = 22

    // Title + date
    doc.setTextColor(9, 9, 11)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, margin, y)
    y += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(113, 113, 122)
    doc.text(`Exported ${date}`, margin, y)
    y += 8

    // Divider
    doc.setDrawColor(228, 228, 231)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 8

    // Set the body font once so splitTextToSize always measures at the right size
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const lineH = (doc.getFontSize() * doc.getLineHeightFactor()) / doc.internal.scaleFactor
    const pad = 6  // mm padding inside bubble on each side

    for (const msg of messages) {
      const isUser = msg.role === 'user'
      const clean = stripMd(msg.content)

      if (isUser) {
        // Font must match splitTextToSize
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const bubbleW = Math.min(maxW * 0.75, pageW * 0.75)
        const bubbleX = pageW - margin - bubbleW
        const wrapped = doc.splitTextToSize(clean, bubbleW - pad * 2)
        const bH = wrapped.length * lineH + pad * 2
        checkPage(bH + 8)
        doc.setFillColor(29, 78, 216)
        doc.roundedRect(bubbleX, y, bubbleW, bH, 3, 3, 'F')
        doc.setTextColor(255, 255, 255)
        doc.text(wrapped, bubbleX + pad, y + pad + lineH * 0.8)
        y += bH + 8
      } else {
        // Label — different font, rendered BEFORE resetting to body font
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(113, 113, 122)
        checkPage(8)
        doc.text('ASSISTANT', margin, y + 3)
        y += 6

        // Reset to body font BEFORE measuring
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const wrapped = doc.splitTextToSize(clean, maxW - pad * 2)
        const bH = wrapped.length * lineH + pad * 2
        checkPage(bH + 8)
        doc.setFillColor(244, 244, 245)
        doc.setDrawColor(228, 228, 231)
        doc.setLineWidth(0.2)
        doc.roundedRect(margin, y, maxW, bH, 3, 3, 'FD')
        doc.setTextColor(24, 24, 27)
        doc.text(wrapped, margin + pad, y + pad + lineH * 0.8)
        y += bH + 8
      }

      checkPage(6)
      doc.setDrawColor(228, 228, 231)
      doc.setLineWidth(0.2)
      doc.line(margin, y, pageW - margin, y)
      y += 6
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(161, 161, 170)
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' })
    }

    doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}.pdf`)
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
