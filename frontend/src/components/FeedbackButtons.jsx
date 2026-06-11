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

export default function FeedbackButtons({ messageId, versionNum = 1, voted, onFeedback }) {
  const { theme } = useTheme()
  const [showReasons, setShowReasons] = useState(false)
  const [selectedReason, setSelectedReason] = useState(null)

  if (!messageId) return null

  async function handleUp() {
    if (voted) return
    await onFeedback(messageId, versionNum, 'up', null)
  }

  function handleDown() {
    if (voted) return
    setShowReasons(true)
  }

  async function handleSubmitReason() {
    if (!selectedReason) return
    setShowReasons(false)
    setSelectedReason(null)
    await onFeedback(messageId, versionNum, 'down', selectedReason)
  }

  function handleCancel() {
    setShowReasons(false)
    setSelectedReason(null)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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

      {/* Reason panel — absolutely positioned so it never pushes other elements */}
      {showReasons && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          right: 0,
          width: '260px',
          padding: '12px',
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 20,
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '500', color: theme.textMuted }}>
            Why wasn't this helpful? <span style={{ color: '#ef4444' }}>*</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  borderRadius: '99px',
                  border: `1px solid ${selectedReason === reason ? theme.textMuted : theme.inputBorder}`,
                  backgroundColor: selectedReason === reason ? theme.inputBorder : 'transparent',
                  color: selectedReason === reason ? theme.text : theme.textMuted,
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
                padding: '4px 12px',
                fontSize: '11px',
                fontWeight: '500',
                backgroundColor: selectedReason ? theme.textMuted : theme.btnDisabled,
                color: selectedReason ? theme.cardBg : theme.btnDisabledText,
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
                padding: '4px 12px',
                fontSize: '11px',
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
