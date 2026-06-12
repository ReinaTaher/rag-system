import { useState, useEffect } from 'react'
import { Joyride, STATUS, ACTIONS, EVENTS } from 'react-joyride'
import { useTheme } from '../context/ThemeContext'

const STEPS_DESKTOP = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to the RAG Security Assistant',
    content: 'Chat with an AI trained on CIS Security Controls v8. Let\'s take a quick tour of the key features.',
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
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to the RAG Security Assistant',
    content: 'Chat with an AI trained on CIS Security Controls v8.',
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Access Your Chats',
    content: 'Tap the menu icon (≡) in the top-left to open the sidebar, start a new conversation, or switch between past chats.',
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Ask Away',
    content: 'Start a new chat, then type any question about CIS Security Controls and press Send. Answers stream back in real-time.',
  },
]

export default function GuidedTour({ run, onFinish, isMobile }) {
  const { isDark } = useTheme()
  const [stepIndex, setStepIndex] = useState(0)

  // Reset step index whenever the tour starts
  useEffect(() => {
    if (run) setStepIndex(0)
  }, [run])

  const bg       = '#ffffff'
  const txtTitle = '#1a1a1a'
  const txtSub   = '#52525b'
  const overlay  = isDark ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.14)'
  const border   = '#e4e4e7'
  const shadow   = '0 8px 24px rgba(0,0,0,0.12)'

  const tourStyles = {
    options: {
      primaryColor: '#1d4ed8',
      backgroundColor: bg,
      arrowColor: bg,
      textColor: txtTitle,
      overlayColor: overlay,
      zIndex: 9999,
    },
    tooltip: {
      borderRadius: '12px',
      border: `1px solid ${border}`,
      boxShadow: shadow,
    },
    tooltipTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: txtTitle,
      margin: 0,
    },
    tooltipContent: {
      fontSize: '13px',
      lineHeight: '1.6',
      color: txtSub,
      paddingBottom: '8px',
    },
    buttonPrimary: {
      backgroundColor: '#1d4ed8',
      color: '#ffffff',
      borderRadius: '7px',
      fontSize: '13px',
      fontWeight: '500',
      padding: '7px 16px',
      outline: 'none',
    },
    buttonBack: {
      color: txtSub,
      fontSize: '13px',
      marginRight: '6px',
    },
    buttonSkip: {
      color: txtSub,
      fontSize: '12px',
    },
    buttonClose: {
      color: txtSub,
    },
  }

  function handleCallback({ action, index, status, type }) {
    // X button or skip → end immediately, don't advance
    if (
      action === ACTIONS.CLOSE ||
      action === ACTIONS.SKIP ||
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status)
    ) {
      onFinish()
      return
    }

    // Next / Back — advance the controlled step index ourselves
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(i => i + (action === ACTIONS.PREV ? -1 : 1))
    }
  }

  return (
    <Joyride
      steps={isMobile ? STEPS_MOBILE : STEPS_DESKTOP}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      styles={tourStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
      callback={handleCallback}
    />
  )
}
