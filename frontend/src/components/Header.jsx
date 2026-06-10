import { useTheme } from '../context/ThemeContext'

export default function Header() {
  const { theme, isDark, toggle } = useTheme()

  return (
    <div style={{
      padding: '16px 24px',
      borderBottom: `1px solid ${theme.headerBorder}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#22c55e',
        }} />
        <span style={{
          color: theme.textStrong,
          fontSize: '15px',
          fontWeight: '600',
          letterSpacing: '-0.01em',
        }}>
          RAG System
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          fontSize: '12px',
          color: theme.badgeText,
          backgroundColor: theme.badge,
          padding: '3px 10px',
          borderRadius: '99px',
          border: `1px solid ${theme.badgeBorder}`,
          letterSpacing: '0.02em',
        }}>
          CIS Controls v8
        </span>

        <button
          onClick={toggle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: theme.badge,
            border: `1px solid ${theme.badgeBorder}`,
            borderRadius: '99px',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: 1,
            color: theme.textMuted,
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  )
}
