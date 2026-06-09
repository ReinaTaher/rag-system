export default function Header() {
  return (
    <div style={{
      padding: '16px 24px',
      borderBottom: '1px solid #222222',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Pulsing online indicator */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
          }} />
        </div>
        <span style={{
          color: '#fafafa',
          fontSize: '15px',
          fontWeight: '600',
          letterSpacing: '-0.01em',
        }}>
          RAG System
        </span>
      </div>

      <span style={{
        fontSize: '12px',
        color: '#52525b',
        backgroundColor: '#1c1c1e',
        padding: '3px 10px',
        borderRadius: '99px',
        border: '1px solid #2a2a2a',
        letterSpacing: '0.02em',
      }}>
        CIS Controls v8
      </span>
    </div>
  )
}
