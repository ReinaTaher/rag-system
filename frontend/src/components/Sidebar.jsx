export default function Sidebar({ threads, activeThreadId, onSelect, onNewChat }) {
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={{
      width: '240px',
      flexShrink: 0,
      backgroundColor: '#0d0d0d',
      borderRight: '1px solid #1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 14px 12px',
        borderBottom: '1px solid #1e1e1e',
        flexShrink: 0,
      }}>
        <button
          id="tour-new-chat"
          onClick={onNewChat}
          style={{
            width: '100%',
            padding: '9px 12px',
            backgroundColor: '#1d4ed8',
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
      </div>

      {/* Thread list */}
      <div
        id="tour-thread-list"
        className="dark-scrollbar"
        style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}
      >
        {threads.length === 0 && (
          <p style={{ color: '#3f3f46', fontSize: '12px', textAlign: 'center', marginTop: '24px' }}>
            No conversations yet
          </p>
        )}
        {threads.map(thread => {
          const isActive = thread.id === activeThreadId
          return (
            <button
              key={thread.id}
              onClick={() => onSelect(thread.id)}
              style={{
                width: '100%',
                padding: '9px 10px',
                backgroundColor: isActive ? '#1c2a4a' : 'transparent',
                border: isActive ? '1px solid #1d3a7a' : '1px solid transparent',
                borderRadius: '7px',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: '3px',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#161616' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <div style={{
                color: isActive ? '#e4e4e7' : '#a1a1aa',
                fontSize: '13px',
                fontWeight: isActive ? '500' : '400',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {thread.title || 'New Chat'}
              </div>
              <div style={{ color: '#52525b', fontSize: '11px', marginTop: '2px' }}>
                {timeAgo(thread.updated_at || thread.created_at)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
