import { Joyride, STATUS } from 'react-joyride'
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
    content: 'Chat with an AI trained on CIS Security Controls v8. Let\'s take a quick look around.',
  },
  {
    target: '#tour-chat-input',
    placement: 'top',
    disableBeacon: true,
    title: 'Ask Your Question',
    content: 'Type any question here and press Enter. Tap the menu icon in the top-left to access your conversation history.',
  },
]

export default function GuidedTour({ run, onFinish, isMobile }) {
  const { isDark } = useTheme()

  const bg      = isDark ? '#27272a' : '#ffffff'
  const txtMain = isDark ? '#e4e4e7' : '#18181b'
  const txtSub  = isDark ? '#71717a' : '#71717a'
  const overlay = isDark ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.14)'
  const border  = isDark ? '#3f3f46'  : '#e4e4e7'
  const shadow  = isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 24px rgba(0,0,0,0.1)'

  const tourStyles = {
    options: {
      primaryColor: '#1d4ed8',
      backgroundColor: bg,
      arrowColor: bg,
      textColor: txtMain,
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
      color: txtMain,
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

  function handleCallback({ status }) {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      onFinish()
    }
  }

  return (
    <Joyride
      steps={isMobile ? STEPS_MOBILE : STEPS_DESKTOP}
      run={run}
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
