import { useState } from 'react'
import { Container, Paper } from '@mantine/core'
import Header from './components/Header'
import ChatWindow from './components/ChatWindow'
import ChatInput from './components/ChatInput'

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything about CIS Security Controls.' }
  ])
  const [loading, setLoading] = useState(false)   // true = waiting for first token
  const [streaming, setStreaming] = useState(false) // true = tokens arriving

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
              // Add the assistant message with the first token
              setMessages(prev => [...prev, { role: 'assistant', content: token }])
            } else {
              // Append each subsequent token to the last message
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
    <div className="h-screen w-screen bg-gray-100 flex justify-center items-center">
      <Container size="md" className="h-full w-full flex justify-center">
        <Paper
          withBorder
          shadow="md"
          radius="md"
          style={{
            width: '100%',
            maxWidth: '900px',
            height: '95vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#f3f4f6',
          }}
        >
          <Header />
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatWindow messages={messages} loading={loading} streaming={streaming} />
          </div>
          <ChatInput onSend={sendMessage} disabled={loading || streaming} />
        </Paper>
      </Container>
    </div>
  )
}
