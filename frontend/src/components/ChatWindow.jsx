import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

export default function ChatWindow({ messages, loading, streaming }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const lastIsAssistant = messages[messages.length - 1]?.role === 'assistant'

  return (
    <div
      className="dark-scrollbar"
      style={{ height: '100%', overflowY: 'auto', padding: '24px 28px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const isLastAssistant = !isUser && i === messages.length - 1

          return (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
            >
              <div style={{
                maxWidth: '72%',
                padding: '12px 16px',
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                backgroundColor: isUser ? '#1d4ed8' : '#1c1c1e',
                color: '#e4e4e7',
                fontSize: '14px',
                lineHeight: '1.65',
                border: isUser ? 'none' : '1px solid #2a2a2a',
              }}>
                {isUser ? (
                  <span>{msg.content}</span>
                ) : (
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {streaming && isLastAssistant && (
                      <span style={{ color: '#52525b', marginLeft: '1px' }}>▌</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loading && !lastIsAssistant && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '18px 18px 18px 4px',
              backgroundColor: '#1c1c1e',
              border: '1px solid #2a2a2a',
              display: 'flex',
              gap: '5px',
              alignItems: 'center',
            }}>
              <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
              <span className="thinking-dot" style={{ animationDelay: '160ms' }} />
              <span className="thinking-dot" style={{ animationDelay: '320ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
