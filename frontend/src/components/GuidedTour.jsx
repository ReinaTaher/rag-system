import { useState } from 'react'
import { Joyride, STATUS, ACTIONS } from 'react-joyride'
import { useTheme } from '../context/ThemeContext'

const STEPS_DESKTOP = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to the RAG Security Assistant',
    content: "Chat with an AI trained on CIS Security Controls v8. Let's take a quick tour of the key features.",
  },
  {
    target: '#tour-new-chat',
    placement: 'right',
    disableBeacon: true,
    title: 'Start a New Chat',
    content: 'Click here to create a new conversation. Each chat is saved automatically so you can come back to it later.',
  },
  {
    target: '#tour-thread-list',
    placement: 'right',
    disableBeacon: true,
    title: 'Your Conversation History',
    content: 'All your past conversations appear here. Click any thread to resume where you left off.',
  },
  {
    target: '#tour-chat-input',
    placement: 'top',
    disableBeacon: true,
    title: 'Ask Your Question',
    content: 'Type any question about CIS Security Controls and press Enter. The AI streams its answer back in real-time.',
  },
]

const STEPS_MOBILE = [
  {
    title: 'Welcome to the RAG Security Assistant',
    content: 'Chat with an AI trained on CIS Security Controls v8.',
  },
  {
    title: 'Access Your Chats',
    content: 'Tap the menu icon (≡) in the top-left to open the sidebar, start a new conversation, or switch between past chats.',
  },
  {
    title: 'Ask Away',
    content: 'Start a new chat, then type any question about CIS Security Controls and press Send. Answers stream back in real-time.',
  },
]

// Fully custom modal for mobile — no joyride timing issues
function MobileTour({ run, onFinish }) {
  const [idx, setIdx] = useState(0)

  if (!run) return null

  const step = STEPS_MOBILE[idx]
  const isLast = idx === STEPS_MOBILE.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        padding: '24px',
        maxWidth: '320px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1a1a1a', paddingRight: '12px' }}>
            {step.title}
          </h3>
          <button
            onClick={onFinish}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#52525b', lineHeight: '1.6' }}>
          {step.content}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
            {idx + 1} / {STEPS_MOBILE.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {idx > 0 && (
              <button
                onClick={() => setIdx(i => i - 1)}
                style={{ padding: '7px 14px', background: 'none', border: '1px solid #e4e4e7', borderRadius: '7px', fontSize: '13px', cursor: 'pointer', color: '#52525b' }}
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={onFinish}
                style={{ padding: '7px 16px', background: '#1d4ed8', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#fff' }}
              >
                Done
              </button>
            ) : (
              <button
                onClick={() => setIdx(i => i + 1)}
                style={{ padding: '7px 16px', background: '#1d4ed8', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', color: '#fff' }}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GuidedTour({ run, onFinish, isMobile }) {
  const { isDark } = useTheme()

  if (isMobile) {
    return <MobileTour run={run} onFinish={onFinish} />
  }

  const bg      = '#ffffff'
  const txtTitle = '#1a1a1a'
  const txtSub  = '#52525b'
  const overlay = isDark ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.14)'
  const border  = '#e4e4e7'
  const shadow  = '0 8px 24px rgba(0,0,0,0.12)'

  const tourStyles = {
    options: {
      primaryColor: '#1d4ed8',
      backgroundColor: bg,
      arrowColor: bg,
      textColor: txtTitle,
      overlayColor: overlay,
      zIndex: 9999,
    },
    tooltip: { borderRadius: '12px', border: `1px solid ${border}`, boxShadow: shadow },
    tooltipTitle: { fontSize: '14px', fontWeight: '600', color: txtTitle, margin: 0 },
    tooltipContent: { fontSize: '13px', lineHeight: '1.6', color: txtSub, paddingBottom: '8px' },
    buttonPrimary: { backgroundColor: '#1d4ed8', color: '#ffffff', borderRadius: '7px', fontSize: '13px', fontWeight: '500', padding: '7px 16px', outline: 'none' },
    buttonBack: { color: txtSub, fontSize: '13px', marginRight: '6px' },
    buttonSkip: { color: txtSub, fontSize: '12px' },
    buttonClose: { color: txtSub },
  }

  function handleCallback({ action, status }) {
    if (
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status) ||
      action === ACTIONS.CLOSE
    ) {
      onFinish()
    }
  }

  return (
    <Joyride
      steps={STEPS_DESKTOP}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      styles={tourStyles}
      locale={{ back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip tour' }}
      callback={handleCallback}
    />
  )
}
