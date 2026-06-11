import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function SourcesPanel({ sources }) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div style={{ marginTop: '10px' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.textMuted,
          fontSize: '12px',
          padding: '2px 0',
        }}
      >
        <span style={{
          display: 'inline-block',
          transition: 'transform 0.15s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          fontSize: '10px',
        }}>▶</span>
        {sources.length} source{sources.length !== 1 ? 's' : ''}
      </button>

      {open && (
        <div style={{
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {sources.map(src => (
            <div
              key={src.id}
              style={{
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: '6px',
                padding: '8px 10px',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  fontSize: '9px',
                  fontWeight: '700',
                  backgroundColor: theme.btnPrimary,
                  color: '#fff',
                  borderRadius: '3px',
                  flexShrink: 0,
                }}>
                  {src.id}
                </span>
                <span style={{ fontSize: '11px', fontWeight: '600', color: theme.textStrong }}>
                  {src.source}
                </span>
                <span style={{ fontSize: '10px', color: theme.textFaint, marginLeft: 'auto' }}>
                  chunk #{src.chunk_id}
                </span>
              </div>
              <p style={{
                margin: 0,
                fontSize: '11px',
                color: theme.textMuted,
                lineHeight: '1.5',
                wordBreak: 'break-word',
              }}>
                {src.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
