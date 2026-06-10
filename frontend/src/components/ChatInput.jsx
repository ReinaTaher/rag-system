import { useState } from 'react'

export default function ChatInput({ onSend, disabled }) {
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

  return (
    <div style={{
      padding: '16px 20px',
      borderTop: '1px solid #222222',
      backgroundColor: '#111111',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#1c1c1e',
        border: '1px solid #2a2a2a',
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
            color: '#e4e4e7',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={{
            backgroundColor: disabled || !value.trim() ? '#27272a' : '#1d4ed8',
            color: disabled || !value.trim() ? '#52525b' : '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s, color 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {disabled ? 'Thinking…' : 'Send'}
        </button>
      </div>
      <p style={{ margin: '8px 4px 0', fontSize: '11px', color: '#3f3f46' }}>
        Answers are based solely on CIS Controls v8 documentation.
      </p>
    </div>
  )
}
