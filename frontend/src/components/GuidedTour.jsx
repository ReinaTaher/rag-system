import { Joyride, STATUS } from 'react-joyride'

const STEPS = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to the RAG Security Assistant',
    content: 'This app lets you chat with an AI trained on CIS Security Controls v8. Let\'s take a quick tour of the key features.',
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
    content: 'All your past conversations appear here. Click any thread to resume where you left off — nothing is ever lost.',
  },
  {
    target: '#tour-chat-input',
    placement: 'top',
    disableBeacon: true,
    title: 'Ask Your Question',
    content: 'Type any question about CIS Security Controls here and press Enter. The AI will stream its answer back to you in real-time.',
  },
]

const tourStyles = {
  options: {
    primaryColor: '#1d4ed8',
    backgroundColor: '#1c1c1e',
    textColor: '#e4e4e7',
    arrowColor: '#1c1c1e',
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },
  tooltip: {
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
  },
  tooltipTitle: {
    color: '#fafafa',
    fontSize: '14px',
    fontWeight: '600',
  },
  tooltipContent: {
    color: '#a1a1aa',
    fontSize: '13px',
    lineHeight: '1.6',
    paddingTop: '6px',
  },
  buttonNext: {
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    borderRadius: '7px',
    fontSize: '13px',
    fontWeight: '500',
    padding: '7px 16px',
    outline: 'none',
  },
  buttonBack: {
    color: '#71717a',
    fontSize: '13px',
    marginRight: '6px',
  },
  buttonSkip: {
    color: '#71717a',
    fontSize: '12px',
  },
  buttonClose: {
    color: '#71717a',
  },
}

export default function GuidedTour({ run, onFinish }) {
  function handleCallback({ status }) {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      onFinish()
    }
  }

  return (
    <Joyride
      steps={STEPS}
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
