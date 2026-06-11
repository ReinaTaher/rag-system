import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTheme } from '../context/ThemeContext'
import FeedbackButtons from './FeedbackButtons'

export default function ChatWindow({ messages, loading, streaming, onFeedback, messageFeedback }) {
  const { theme } = useTheme()
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
                backgroundColor: isUser ? theme.userBubble : theme.assistantBubble,
                color: isUser ? theme.userText : theme.text,
                fontSize: '14px',
                lineHeight: '1.65',
                border: isUser ? 'none' : `1px solid ${theme.assistantBubbleBorder}`,
              }}>
                {isUser ? (
                  <span>{msg.content}</span>
                ) : (
                  <>
                    <div className="markdown-body">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {streaming && isLastAssistant && (
                        <span style={{ color: theme.textFaint, marginLeft: '1px' }}>▌</span>
                      )}
                    </div>

                    {/* Feedback — only after stream finishes and message has a DB id */}
                    {!streaming && msg.id && (
                      <div style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: `1px solid ${theme.assistantBubbleBorder}`,
                      }}>
                        <FeedbackButtons messageId={msg.id} voted={messageFeedback?.[msg.id] ?? null} onFeedback={onFeedback} />
                      </div>
                    )}
                  </>
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
              backgroundColor: theme.assistantBubble,
              border: `1px solid ${theme.assistantBubbleBorder}`,
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
