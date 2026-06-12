import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useTheme } from '../context/ThemeContext'

const ChatInput = forwardRef(function ChatInput({ onSend, disabled }, ref) {
  const { theme } = useTheme()
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus()
  }, [disabled])

  useImperativeHandle(ref, () => ({
    fill(text) {
      setValue(text)
      textareaRef.current?.focus()
      // Trigger resize after value is set
      setTimeout(() => resizeTextarea(textareaRef.current), 0)
    }
  }))

  function resizeTextarea(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function handleChange(e) {
    setValue(e.target.value)
    resizeTextarea(e.target)
  }

  function handleSend() {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
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
        alignItems: 'flex-end',
        gap: '10px',
        backgroundColor: theme.inputBg,
        border: `1px solid ${theme.inputBorder}`,
        borderRadius: '12px',
        padding: '8px 8px 8px 16px',
      }}>
        <textarea
          id="tour-chat-input"
          ref={textareaRef}
          rows={1}
          placeholder="Ask about CIS Security Controls..."
          value={value}
          onChange={handleChange}
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
            resize: 'none',
            overflow: 'hidden',
            fontFamily: 'inherit',
            maxHeight: '120px',
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
            flexShrink: 0,
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
})

export default ChatInput
