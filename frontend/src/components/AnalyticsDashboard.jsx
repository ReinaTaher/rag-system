import { useState, useEffect, useCallback } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare, MessagesSquare, RefreshCw } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const API = 'http://localhost:8000'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function StatCard({ label, value, icon, accent }) {
  const { theme } = useTheme()
  return (
    <div style={{
      background: theme.assistantBubble,
      border: `1px solid ${theme.assistantBubbleBorder}`,
      borderRadius: '12px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: theme.textMuted, fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ color: accent, opacity: 0.75 }}>{icon}</span>
      </div>
      <span style={{ color: theme.textStrong, fontSize: '34px', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  )
}

function SatisfactionCard({ rate, up, down }) {
  const { theme } = useTheme()
  const color = rate >= 70 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444'
  const total = up + down

  return (
    <div style={{
      background: theme.assistantBubble,
      border: `1px solid ${theme.assistantBubbleBorder}`,
      borderRadius: '12px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <span style={{ color: theme.textMuted, fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Satisfaction Rate
      </span>
      <span style={{ color, fontSize: '34px', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {rate}%
      </span>
      {total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ width: '100%', height: '6px', borderRadius: '99px', background: theme.inputBg, overflow: 'hidden' }}>
            <div style={{ width: `${rate}%`, height: '100%', borderRadius: '99px', background: color, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ color: '#22c55e', fontSize: '11px' }}>▲ {up} up</span>
            <span style={{ color: '#ef4444', fontSize: '11px' }}>▼ {down} down</span>
          </div>
        </div>
      )}
    </div>
  )
}

function VoteBreakdown({ up, down }) {
  const { theme } = useTheme()
  const total = up + down
  const upPct = total > 0 ? Math.round((up / total) * 100) : 0
  const downPct = total > 0 ? Math.round((down / total) * 100) : 0

  return (
    <div style={{
      background: theme.assistantBubble,
      border: `1px solid ${theme.assistantBubbleBorder}`,
      borderRadius: '12px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <span style={{ color: theme.textMuted, fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Vote Breakdown
      </span>

      {total === 0 ? (
        <span style={{ color: theme.textFaint, fontSize: '13px' }}>No feedback yet</span>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <ThumbsUp size={20} style={{ color: '#22c55e', marginBottom: '8px' }} />
              <div style={{ color: '#22c55e', fontSize: '26px', fontWeight: '700' }}>{up}</div>
              <div style={{ color: theme.textMuted, fontSize: '11px' }}>{upPct}%</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <ThumbsDown size={20} style={{ color: '#ef4444', marginBottom: '8px' }} />
              <div style={{ color: '#ef4444', fontSize: '26px', fontWeight: '700' }}>{down}</div>
              <div style={{ color: theme.textMuted, fontSize: '11px' }}>{downPct}%</div>
            </div>
          </div>

          <div style={{ display: 'flex', height: '8px', borderRadius: '99px', overflow: 'hidden', gap: '2px' }}>
            <div style={{ flex: up, background: '#22c55e', borderRadius: '99px 0 0 99px', transition: 'flex 0.6s ease' }} />
            <div style={{ flex: down, background: '#ef4444', borderRadius: '0 99px 99px 0', transition: 'flex 0.6s ease' }} />
          </div>
        </>
      )}
    </div>
  )
}

function DownvoteReasons({ reasons }) {
  const { theme } = useTheme()
  const entries = Object.entries(reasons).sort((a, b) => b[1] - a[1])
  const max = entries.length > 0 ? entries[0][1] : 1

  return (
    <div style={{
      background: theme.assistantBubble,
      border: `1px solid ${theme.assistantBubbleBorder}`,
      borderRadius: '12px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      <span style={{ color: theme.textMuted, fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Downvote Reasons
      </span>

      {entries.length === 0 ? (
        <span style={{ color: theme.textFaint, fontSize: '13px' }}>No downvotes yet</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map(([reason, count]) => (
            <div key={reason} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: theme.text, fontSize: '13px' }}>{reason}</span>
                <span style={{ color: theme.textMuted, fontSize: '12px', fontWeight: '600' }}>{count}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '99px', background: theme.inputBg, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round((count / max) * 100)}%`,
                  height: '100%',
                  borderRadius: '99px',
                  background: '#ef4444',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TrendChart({ trend }) {
  const { theme } = useTheme()
  const maxCount = Math.max(...trend.map(d => d.up + d.down), 1)
  const BAR_HEIGHT = 80

  return (
    <div style={{
      background: theme.assistantBubble,
      border: `1px solid ${theme.assistantBubbleBorder}`,
      borderRadius: '12px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <span style={{ color: theme.textMuted, fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        7-Day Feedback Trend
      </span>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: `${BAR_HEIGHT + 28}px` }}>
        {trend.map((day) => {
          const dayLabel = DAY_LABELS[new Date(day.date + 'T12:00:00').getDay()]
          const total = day.up + day.down
          const upH = total > 0 ? Math.max(Math.round((day.up / maxCount) * BAR_HEIGHT), day.up > 0 ? 4 : 0) : 0
          const downH = total > 0 ? Math.max(Math.round((day.down / maxCount) * BAR_HEIGHT), day.down > 0 ? 4 : 0) : 0

          return (
            <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: `${BAR_HEIGHT}px`, gap: '2px', width: '100%' }}>
                {day.up > 0 && (
                  <div title={`${day.up} upvote${day.up !== 1 ? 's' : ''}`} style={{
                    width: '70%', height: `${upH}px`,
                    background: '#22c55e', borderRadius: '3px 3px 0 0',
                    transition: 'height 0.6s ease',
                  }} />
                )}
                {day.down > 0 && (
                  <div title={`${day.down} downvote${day.down !== 1 ? 's' : ''}`} style={{
                    width: '70%', height: `${downH}px`,
                    background: '#ef4444', borderRadius: day.up > 0 ? '0' : '3px 3px 0 0',
                    transition: 'height 0.6s ease',
                  }} />
                )}
                {total === 0 && (
                  <div style={{ width: '70%', height: '3px', background: theme.inputBg, borderRadius: '99px' }} />
                )}
              </div>
              <span style={{ color: theme.textFaint, fontSize: '10px', fontWeight: '500' }}>{dayLabel}</span>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#22c55e' }} />
          <span style={{ color: theme.textMuted, fontSize: '11px' }}>Thumbs up</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ef4444' }} />
          <span style={{ color: theme.textMuted, fontSize: '11px' }}>Thumbs down</span>
        </div>
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const { theme } = useTheme()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/analytics`)
      if (!res.ok) throw new Error('Failed to load analytics')
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textMuted, fontSize: '14px' }}>
        Loading analytics…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '14px' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ color: theme.textStrong, fontSize: '18px', fontWeight: '700', margin: 0 }}>Feedback Analytics</h2>
          <p style={{ color: theme.textMuted, fontSize: '13px', margin: '4px 0 0' }}>Usage and feedback telemetry across all conversations</p>
        </div>
        <button
          onClick={fetchData}
          title="Refresh"
          style={{
            background: theme.badge,
            border: `1px solid ${theme.badgeBorder}`,
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            color: theme.textMuted,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Top stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard label="Conversations" value={data.total_threads} icon={<MessagesSquare size={16} />} accent="#1d4ed8" />
        <StatCard label="AI Responses" value={data.total_messages} icon={<MessageSquare size={16} />} accent="#7c3aed" />
        <StatCard label="Feedback Given" value={data.total_feedback} icon={<ThumbsUp size={16} />} accent="#0891b2" />
        <SatisfactionCard rate={data.satisfaction_rate} up={data.thumbs_up} down={data.thumbs_down} />
      </div>

      {/* Middle row: vote breakdown + downvote reasons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        <VoteBreakdown up={data.thumbs_up} down={data.thumbs_down} />
        <DownvoteReasons reasons={data.downvote_reasons} />
      </div>

      {/* Trend chart */}
      <TrendChart trend={data.feedback_trend} />
    </div>
  )
}
