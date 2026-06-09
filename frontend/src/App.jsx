import { useState } from 'react'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.' }
  ])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)

  async function sendMessage(text) {
    const history = messages.slice(1).slice(-6)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/chat/stream', {
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
    } catch {
      setLoading(false)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: could not reach the backend.' }])
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '860px',
        height: '95vh',
        backgroundColor: '#111111',
        borderRadius: '16px',
        border: '1px solid #222222',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Header />
        <div style={{ flex: 1, minHeight: 0 }}>
          <ChatWindow messages={messages} loading={loading} streaming={streaming} />
        </div>
        <ChatInput onSend={sendMessage} disabled={loading || streaming} />
      </div>
    </div>
  )
}
