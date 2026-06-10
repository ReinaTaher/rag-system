import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function ChatInput({ onSend, disabled }) {
  const { theme } = useTheme()
  const [value, setValue] = useState('')

  function handleSend() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const btnDisabled = disabled || !value.trim()

  return (
    <div style={{
      padding: '16px 20px',
      borderTop: `1px solid ${theme.headerBorder}`,
      backgroundColor: theme.cardBg,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: theme.inputBg,
        border: `1px solid ${theme.inputBorder}`,
        borderRadius: '12px',
        padding: '8px 8px 8px 16px',
      }}>
        <input
          id="tour-chat-input"
          type="text"
          placeholder="Ask about CIS Security Controls..."
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: theme.text,
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        />
        <button
          onClick={handleSend}
          disabled={btnDisabled}
          style={{
            backgroundColor: btnDisabled ? theme.btnDisabled : theme.btnPrimary,
            color: btnDisabled ? theme.btnDisabledText : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: btnDisabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s, color 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {disabled ? 'Thinking…' : 'Send'}
        </button>
      </div>
      <p style={{ margin: '8px 4px 0', fontSize: '11px', color: theme.footerText }}>
        Answers are based solely on CIS Controls v8 documentation.
      </p>
    </div>
  )
}
