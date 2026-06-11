import { useState, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function CitationTooltip({ id, source, isMobile }) {
  const { theme } = useTheme()
  const [visible, setVisible] = useState(false)
  const badgeRef = useRef(null)

  if (!source) return null

  function getTooltipStyle() {
    if (!isMobile) {
      return {
        position: 'absolute',
        bottom: '24px',
        left: '0',
        width: '280px',
      }
    }
    // On mobile use fixed positioning relative to viewport
    const rect = badgeRef.current?.getBoundingClientRect()
    const tooltipWidth = Math.min(260, window.innerWidth - 32)
    let left = rect ? rect.left : 16
    // Clamp so tooltip doesn't overflow right edge
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16
    }
    // Clamp left edge
    left = Math.max(16, left)
    const top = rect ? rect.top - 12 : 100
    return {
      position: 'fixed',
      bottom: 'auto',
      top: Math.max(8, top - 120),
      left,
      width: tooltipWidth,
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        ref={badgeRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onTouchStart={() => setVisible(v => !v)}
        style={{
          fontSize: '11px',
          color: theme.btnPrimary,
          verticalAlign: 'super',
          cursor: 'default',
          margin: '0 1px',
          userSelect: 'none',
          opacity: 0.85,
        }}
      >
        [{id}]
      </span>

      {visible && (
        <div style={{
          ...getTooltipStyle(),
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: theme.btnPrimary,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            [{id}] {source.source}
          </div>
          <div style={{
            fontSize: '12px',
            color: theme.textMuted,
            lineHeight: '1.5',
            wordBreak: 'break-word',
          }}>
            {source.text}
          </div>
          {!isMobile && (
            <div style={{
              position: 'absolute',
              bottom: '-5px',
              left: '10px',
              transform: 'rotate(45deg)',
              width: '8px',
              height: '8px',
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
              borderTop: 'none',
              borderLeft: 'none',
            }} />
          )}
        </div>
      )}
    </span>
  )
}
