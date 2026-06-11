import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function CitationTooltip({ id, source }) {
  const { theme } = useTheme()
  const [visible, setVisible] = useState(false)

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
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

      {visible && source && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '280px',
          backgroundColor: theme.cardBg,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: '8px',
          padding: '10px 12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          zIndex: 100,
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
          {/* arrow */}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%) rotate(45deg)',
            width: '8px',
            height: '8px',
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderTop: 'none',
            borderLeft: 'none',
          }} />
        </div>
      )}
    </span>
  )
}
