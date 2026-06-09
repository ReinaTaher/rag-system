import { useEffect, useRef } from 'react'
import { ScrollArea, Text } from '@mantine/core'
import ReactMarkdown from 'react-markdown'

export default function ChatWindow({ messages, loading, streaming }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const lastIsAssistant = messages[messages.length - 1]?.role === 'assistant'

  return (
    <ScrollArea
      className="h-full p-4"
      style={{ backgroundColor: 'transparent' }}
    >
      <div className="flex flex-col gap-3">
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const isLastAssistant = !isUser && i === messages.length - 1

          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  backgroundColor: isUser ? '#2563eb' : '#ffffff',
                  color: isUser ? '#ffffff' : '#111827',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
              >
                {isUser ? (
                  <Text size="sm" style={{ color: 'inherit' }}>{msg.content}</Text>
                ) : (
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {streaming && isLastAssistant && (
                      <span style={{ opacity: 0.6 }}>▌</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {loading && !lastIsAssistant && (
          <div className="flex justify-start">
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                color: '#6b7280',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <Text size="sm">Thinking...</Text>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
