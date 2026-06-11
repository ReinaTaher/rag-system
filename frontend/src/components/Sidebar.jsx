import { useTheme } from '../context/ThemeContext'

export default function Sidebar({ threads, activeThreadId, onSelect, onNewChat, onDelete, isOpen, isMobile, onClose }) {
  const { theme } = useTheme()

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (isMobile && !isOpen) return null

  return (
    <div style={{
      width: '240px',
      flexShrink: 0,
      backgroundColor: theme.sidebarBg,
      borderRight: `1px solid ${theme.sidebarBorder}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...(isMobile && {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        zIndex: 60,
        boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
      }),
    }}>
      <div style={{
        padding: '16px 14px 12px',
        borderBottom: `1px solid ${theme.sidebarBorder}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <button
          id="tour-new-chat"
          onClick={onNewChat}
          style={{
            width: '100%',
            padding: '9px 12px',
            backgroundColor: theme.btnPrimary,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          New Chat
        </button>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              background: 'none',
              border: `1px solid ${theme.sidebarBorder}`,
              borderRadius: '7px',
              cursor: 'pointer',
              color: theme.textMuted,
              fontSize: '16px',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div
        id="tour-thread-list"
        className="dark-scrollbar"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}
      >
        {threads.length === 0 && (
          <p style={{ color: theme.textFaint, fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            No conversations yet
          </p>
        )}
        {threads.map(thread => {
          const isActive = thread.id === activeThreadId
          return (
            <div
              key={thread.id}
              className="thread-row"
              style={{ position: 'relative', marginBottom: '3px' }}
            >
              <button
                onClick={() => onSelect(thread.id)}
                style={{
                  width: '100%',
                  padding: '9px 32px 9px 10px',
                  backgroundColor: isActive ? theme.activeThread : 'transparent',
                  border: `1px solid ${isActive ? theme.activeThreadBorder : 'transparent'}`,
                  borderRadius: '7px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = theme.threadHover }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <div style={{
                  color: isActive ? theme.text : theme.textMuted,
                  fontSize: '13px',
                  fontWeight: isActive ? '500' : '400',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {thread.title || 'New Chat'}
                </div>
                <div style={{ color: theme.textFaint, fontSize: '11px', marginTop: '2px' }}>
                  {timeAgo(thread.updated_at || thread.created_at)}
                </div>
              </button>

              <button
                className="delete-btn"
                onClick={e => {
                  e.stopPropagation()
                  if (window.confirm('Delete this conversation?')) onDelete(thread.id)
                }}
                title="Delete conversation"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.textFaint,
                  fontSize: '14px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  opacity: isMobile ? 0.5 : 0,
                  transition: 'opacity 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={e => { e.currentTarget.style.color = theme.textFaint }}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
