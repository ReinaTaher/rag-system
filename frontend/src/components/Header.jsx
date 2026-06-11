import { Sun, Moon, Menu, Download } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function Header({ isMobile, onToggleSidebar, hasActiveThread, onExport }) {
  const { theme, isDark, toggle } = useTheme()

  return (
    <div style={{
      padding: isMobile ? '12px 16px' : '16px 24px',
      borderBottom: `1px solid ${theme.headerBorder}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: theme.textMuted,
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Menu size={18} />
          </button>
        )}
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
        {!isMobile && (
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
        )}

        {hasActiveThread && (
          <button
            onClick={onExport}
            title="Export conversation as PDF"
            style={{
              background: theme.badge,
              border: `1px solid ${theme.badgeBorder}`,
              borderRadius: '99px',
              padding: '4px 10px',
              cursor: 'pointer',
              lineHeight: 1,
              color: theme.textMuted,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Download size={14} />
          </button>
        )}

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
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  )
}
