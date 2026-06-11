import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

const SUGGESTIONS = [
  { label: 'List all 18 CIS Controls', text: 'List all 18 CIS Critical Security Controls v8.' },
  { label: 'Audit Log Management', text: 'How does CIS Control 8 handle Audit Log Management?' },
  { label: 'Protect sensitive data', text: 'What safeguards does CIS v8 recommend for Data Protection?' },
  { label: 'Account Management', text: 'How can I implement Account Management per CIS Control 5?' },
  { label: 'Malware Defenses', text: 'What does CIS Control 10 say about Malware Defenses?' },
  { label: 'Penetration Testing', text: 'How does Penetration Testing fit into CIS Controls v8?' },
]

const FLOAT_ANIMS = ['float-a', 'float-b', 'float-c']

export default function EmptyState({ onNewChat, onSend }) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  async function handleSuggestion(text) {
    const threadId = await onNewChat()
    if (threadId) onSend(text, threadId)
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      gap: '28px',
    }}>
      {/* Logo + title */}
      <div style={{
        textAlign: 'center',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.5s, transform 0.5s',
      }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #4ade80, #16a34a)',
          margin: '0 auto 14px',
          boxShadow: '0 0 24px rgba(34,197,94,0.3)',
        }} />
        <h2 style={{
          color: theme.textStrong,
          fontSize: '20px',
          fontWeight: '600',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
        }}>
          CIS Security Controls Assistant
        </h2>
        <p style={{
          color: theme.textMuted,
          fontSize: '13px',
          margin: 0,
        }}>
          Ask anything about CIS Critical Security Controls v8
        </p>
      </div>

      {/* Suggestion chips */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        justifyContent: 'center',
        maxWidth: '540px',
      }}>
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => handleSuggestion(s.text)}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${theme.inputBorder}`,
              borderRadius: '99px',
              color: theme.textMuted,
              fontSize: '13px',
              cursor: 'pointer',
              opacity: mounted ? 0.85 : 0,
              transition: `opacity 0.4s ${i * 55}ms, border-color 0.2s, color 0.2s, background-color 0.2s`,
              animation: mounted
                ? `${FLOAT_ANIMS[i % 3]} ${3.5 + (i % 2) * 0.8}s ease-in-out ${i * 0.35}s infinite`
                : 'none',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.animationPlayState = 'paused'
              e.currentTarget.style.borderColor = theme.btnPrimary
              e.currentTarget.style.color = theme.textStrong
              e.currentTarget.style.backgroundColor = theme.inputBg
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.animationPlayState = 'running'
              e.currentTarget.style.borderColor = theme.inputBorder
              e.currentTarget.style.color = theme.textMuted
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.opacity = '0.85'
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Divider + New Chat button */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.5s 0.4s',
      }}>
        <span style={{ color: theme.textFaint, fontSize: '12px' }}>or start a fresh conversation</span>
        <button
          onClick={onNewChat}
          style={{
            padding: '9px 22px',
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
    </div>
  )
}
