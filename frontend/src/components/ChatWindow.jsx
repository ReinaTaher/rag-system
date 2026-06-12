import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTheme } from '../context/ThemeContext'
import CitationTooltip from './CitationTooltip'
import SourcesPanel from './SourcesPanel'
import FeedbackButtons from './FeedbackButtons'

function preprocessCitations(text) {
  return text.replace(/\[(\d+)\]/g, (_, n) => `[[${n}]](#cite-${n})`)
}

export default function ChatWindow({ messages, loading, streaming, onRegenerate, onSwitchVersion, onFeedback, messageFeedback, isMobile, compareMode, onCompare, onDismissCompare, onPickVersion }) {
  const { theme } = useTheme()
  const bottomRef = useRef(null)
  const [copiedIdx, setCopiedIdx] = useState(null)

  function copyMessage(idx, content) {
    const plain = content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(\d+)\]/g, '')
      .trim()
    navigator.clipboard.writeText(plain).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const lastIsAssistant = messages[messages.length - 1]?.role === 'assistant'

  return (
    <div
      className="dark-scrollbar"
      style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '16px 12px' : '24px 28px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const isLastAssistant = !isUser && i === messages.length - 1
          const isStreaming = streaming && isLastAssistant

          const displayedVersion = msg.displayedVersion ?? msg.version_count ?? 1
          const isShowingOldVersion = displayedVersion < (msg.version_count ?? 1) && msg.versions
          const displayedContent = isShowingOldVersion
            ? (msg.versions.find(v => v.version_num === displayedVersion)?.content ?? msg.content)
            : msg.content
          const displayedSources = isShowingOldVersion
            ? (msg.versions.find(v => v.version_num === displayedVersion)?.sources ?? null)
            : msg.sources

          const isComparing = !isUser && compareMode?.msgIndex === i

          // ── Compare split view (V1 vs V2, both already saved) ───────────
          if (isComparing) {
            const v1 = msg.versions?.find(v => v.version_num === 1)
            const v2Content = msg.content
            const v2Sources = msg.sources
            const bubbleBase = {
              flex: 1,
              minWidth: 0,
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: theme.assistantBubble,
              color: theme.text,
              fontSize: '14px',
              lineHeight: '1.65',
              border: `1px solid ${theme.assistantBubbleBorder}`,
            }
            return (
              <div key={i} style={{ width: '100%' }}>
                {/* Labels */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: '6px',
                  flexDirection: isMobile ? 'column' : 'row',
                }}>
                  {['Version 1 · Original', 'Version 2 · Regenerated'].map(label => (
                    <div key={label} style={{ flex: 1, fontSize: '11px', fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {label}
                    </div>
                  ))}
                </div>

                {/* Side-by-side panels */}
                <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>
                  {/* V1 */}
                  <div style={bubbleBase}>
                    <div className="markdown-body">
                      <ReactMarkdown components={{ a({ href, children }) {
                        if (href?.startsWith('#cite-')) {
                          const id = parseInt(href.slice(6), 10)
                          return <CitationTooltip id={id} source={v1?.sources?.find(s => s.id === id) || null} isMobile={isMobile} />
                        }
                        return <a href={href} target="_blank" rel="noreferrer">{children}</a>
                      }}}>
                        {preprocessCitations(v1?.content || '')}
                      </ReactMarkdown>
                    </div>
                    <SourcesPanel sources={v1?.sources} />
                  </div>

                  {/* V2 */}
                  <div style={bubbleBase}>
                    <div className="markdown-body">
                      <ReactMarkdown components={{ a({ href, children }) {
                        if (href?.startsWith('#cite-')) {
                          const id = parseInt(href.slice(6), 10)
                          return <CitationTooltip id={id} source={v2Sources?.find(s => s.id === id) || null} isMobile={isMobile} />
                        }
                        return <a href={href} target="_blank" rel="noreferrer">{children}</a>
                      }}}>
                        {preprocessCitations(v2Content)}
                      </ReactMarkdown>
                    </div>
                    <SourcesPanel sources={v2Sources} />
                  </div>
                </div>

                {/* Pick buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
                  {[1, 2].map(v => (
                    <button
                      key={v}
                      onClick={() => onPickVersion(i, v)}
                      style={{ padding: '7px 18px', backgroundColor: 'transparent', color: theme.textMuted, border: `1px solid ${theme.inputBorder}`, borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.btnPrimary; e.currentTarget.style.color = theme.textStrong }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.inputBorder; e.currentTarget.style.color = theme.textMuted }}
                    >
                      Use Version {v}
                    </button>
                  ))}
                  <button
                    onClick={onDismissCompare}
                    style={{ padding: '7px 14px', backgroundColor: 'transparent', color: theme.textFaint, border: 'none', fontSize: '13px', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          }

          // ── Normal message bubble ────────────────────────────────────────
          return (
            <div
              key={i}
              style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}
            >
              <div style={{
                maxWidth: isMobile ? '90%' : '72%',
                padding: '12px 16px',
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                backgroundColor: isUser ? theme.userBubble : theme.assistantBubble,
                color: isUser ? theme.userText : theme.text,
                fontSize: '14px',
                lineHeight: '1.65',
                border: isUser ? 'none' : `1px solid ${theme.assistantBubbleBorder}`,
              }}>
                {isUser ? (
                  <span>{msg.content}</span>
                ) : (
                  <>
                    <div className="markdown-body">
                      <ReactMarkdown
                        components={{
                          a({ href, children }) {
                            if (href?.startsWith('#cite-')) {
                              const id = parseInt(href.slice(6), 10)
                              const source = displayedSources?.find(s => s.id === id) || null
                              return <CitationTooltip id={id} source={source} isMobile={isMobile} />
                            }
                            return <a href={href} target="_blank" rel="noreferrer">{children}</a>
                          },
                        }}
                      >
                        {preprocessCitations(displayedContent)}
                      </ReactMarkdown>
                      {isStreaming && (
                        <span style={{ color: theme.textFaint, marginLeft: '1px' }}>▌</span>
                      )}
                    </div>

                    {!isStreaming && <SourcesPanel sources={displayedSources} />}

                    {/* Action row: regenerate + compare + version switcher + feedback */}
                    {!isStreaming && msg.id && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: `1px solid ${theme.assistantBubbleBorder}`,
                        flexWrap: 'wrap',
                      }}>
                        <button
                          onClick={() => onRegenerate(i)}
                          disabled={streaming || loading}
                          title="Regenerate response"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: streaming || loading ? 'not-allowed' : 'pointer',
                            color: theme.textFaint,
                            fontSize: '13px',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            opacity: streaming || loading ? 0.4 : 1,
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={e => { if (!streaming && !loading) e.currentTarget.style.color = theme.text }}
                          onMouseLeave={e => { e.currentTarget.style.color = theme.textFaint }}
                        >
                          ↺ Regenerate
                        </button>

                        {(msg.version_count ?? 1) === 2 && (
                          <button
                            onClick={() => onCompare(i)}
                            disabled={streaming || loading}
                            title="Compare Version 1 vs Version 2"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: streaming || loading ? 'not-allowed' : 'pointer',
                              color: theme.textFaint,
                              fontSize: '13px',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              opacity: streaming || loading ? 0.4 : 1,
                              transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => { if (!streaming && !loading) e.currentTarget.style.color = theme.btnPrimary }}
                            onMouseLeave={e => { e.currentTarget.style.color = theme.textFaint }}
                          >
                            ⇌ Compare
                          </button>
                        )}

                        {(msg.version_count ?? 1) > 1 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: theme.textMuted,
                          }}>
                            <button
                              onClick={() => onSwitchVersion(i, -1)}
                              disabled={displayedVersion <= 1}
                              style={{
                                background: 'none', border: 'none',
                                cursor: displayedVersion <= 1 ? 'default' : 'pointer',
                                color: displayedVersion <= 1 ? theme.textFaint : theme.textMuted,
                                fontSize: '13px', padding: '0 3px',
                              }}
                            >◀</button>
                            <span style={{ minWidth: '32px', textAlign: 'center' }}>
                              {displayedVersion}/{msg.version_count}
                            </span>
                            <button
                              onClick={() => onSwitchVersion(i, 1)}
                              disabled={displayedVersion >= msg.version_count}
                              style={{
                                background: 'none', border: 'none',
                                cursor: displayedVersion >= msg.version_count ? 'default' : 'pointer',
                                color: displayedVersion >= msg.version_count ? theme.textFaint : theme.textMuted,
                                fontSize: '13px', padding: '0 3px',
                              }}
                            >▶</button>
                          </div>
                        )}

                        <button
                          onClick={() => copyMessage(i, displayedContent)}
                          title="Copy response"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedIdx === i ? '#22c55e' : theme.textFaint,
                            fontSize: '13px',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={e => { if (copiedIdx !== i) e.currentTarget.style.color = theme.text }}
                          onMouseLeave={e => { if (copiedIdx !== i) e.currentTarget.style.color = theme.textFaint }}
                        >
                          {copiedIdx === i ? '✓ Copied' : '⎘ Copy'}
                        </button>

                        <div style={{ marginLeft: 'auto' }}>
                          <FeedbackButtons
                            messageId={msg.id}
                            versionNum={displayedVersion}
                            voted={messageFeedback?.[`${msg.id}_v${displayedVersion}`] ?? null}
                            onFeedback={onFeedback}
                            isMobile={isMobile}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}

        {loading && !lastIsAssistant && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '18px 18px 18px 4px',
              backgroundColor: theme.assistantBubble,
              border: `1px solid ${theme.assistantBubbleBorder}`,
              display: 'flex',
              gap: '5px',
              alignItems: 'center',
            }}>
              <span className="thinking-dot" style={{ animationDelay: '0ms' }} />
              <span className="thinking-dot" style={{ animationDelay: '160ms' }} />
              <span className="thinking-dot" style={{ animationDelay: '320ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
