import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const REASONS = [
  'Incorrect information',
  'Incomplete answer',
  'Not relevant',
  'Too vague',
  'Other',
]

export default function FeedbackButtons({ messageId, voted, onFeedback }) {
  const { theme } = useTheme()
  const [showReasons, setShowReasons] = useState(false)
  const [selectedReason, setSelectedReason] = useState(null)

  if (!messageId) return null

  async function handleUp() {
    if (voted) return
    await onFeedback(messageId, 'up', null)
  }

  function handleDown() {
    if (voted) return
    setShowReasons(true)
  }

  async function handleSubmitReason() {
    if (!selectedReason) return
    setShowReasons(false)
    await onFeedback(messageId, 'down', selectedReason)
  }

  function handleCancel() {
    setShowReasons(false)
    setSelectedReason(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={handleUp}
          disabled={!!voted}
          title="Helpful"
          style={{
            background: 'none',
            border: `1px solid ${voted === 'up' ? '#22c55e' : theme.inputBorder}`,
            borderRadius: '6px',
            cursor: voted ? 'default' : 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            color: voted === 'up' ? '#22c55e' : theme.textFaint,
            opacity: voted && voted !== 'up' ? 0.3 : 1,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!voted) e.currentTarget.style.borderColor = '#22c55e' }}
          onMouseLeave={e => { if (!voted) e.currentTarget.style.borderColor = theme.inputBorder }}
        >
          <ThumbsUp size={13} />
        </button>
        <button
          onClick={handleDown}
          disabled={!!voted}
          title="Not helpful"
          style={{
            background: 'none',
            border: `1px solid ${voted === 'down' ? '#ef4444' : theme.inputBorder}`,
            borderRadius: '6px',
            cursor: voted ? 'default' : 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            color: voted === 'down' ? '#ef4444' : theme.textFaint,
            opacity: voted && voted !== 'down' ? 0.3 : 1,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!voted) e.currentTarget.style.borderColor = '#ef4444' }}
          onMouseLeave={e => { if (!voted) e.currentTarget.style.borderColor = theme.inputBorder }}
        >
          <ThumbsDown size={13} />
        </button>
      </div>

      {showReasons && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          backgroundColor: theme.inputBg,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: '8px',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '600', color: theme.textMuted }}>
            Why wasn't this helpful? <span style={{ color: '#ef4444' }}>*</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  borderRadius: '99px',
                  border: `1px solid ${selectedReason === reason ? theme.btnPrimary : theme.inputBorder}`,
                  backgroundColor: selectedReason === reason ? theme.btnPrimary + '33' : 'transparent',
                  color: selectedReason === reason ? theme.btnPrimary : theme.textMuted,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {reason}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleSubmitReason}
              disabled={!selectedReason}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: selectedReason ? theme.btnPrimary : theme.btnDisabled,
                color: selectedReason ? '#fff' : theme.btnDisabledText,
                border: 'none',
                borderRadius: '6px',
                cursor: selectedReason ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s',
              }}
            >
              Submit
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '5px 14px',
                fontSize: '12px',
                background: 'none',
                border: 'none',
                color: theme.textFaint,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
