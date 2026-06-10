import { createContext, useContext, useState, useEffect } from 'react'

const dark = {
  outerBg: '#1a1a1a',
  cardBg: '#222225',
  cardBorder: '#333336',
  sidebarBg: '#1e1e1e',
  sidebarBorder: '#2e2e2e',
  inputBg: '#2a2a2e',
  inputBorder: '#3a3a3e',
  text: '#e4e4e7',
  textMuted: '#71717a',
  textFaint: '#52525b',
  textStrong: '#fafafa',
  userBubble: '#1d4ed8',
  userText: '#ffffff',
  assistantBubble: '#2a2a2e',
  assistantBubbleBorder: '#3a3a3e',
  headerBorder: '#333336',
  activeThread: '#1c2a4a',
  activeThreadBorder: '#1d3a7a',
  threadHover: '#282828',
  btnPrimary: '#1d4ed8',
  btnDisabled: '#36363a',
  btnDisabledText: '#52525b',
  footerText: '#3f3f46',
  badge: '#222226',
  badgeBorder: '#333336',
  badgeText: '#52525b',
}

const light = {
  outerBg: '#f0f0f0',
  cardBg: '#ffffff',
  cardBorder: '#e4e4e7',
  sidebarBg: '#fafafa',
  sidebarBorder: '#e4e4e7',
  inputBg: '#f4f4f5',
  inputBorder: '#d4d4d8',
  text: '#18181b',
  textMuted: '#71717a',
  textFaint: '#a1a1aa',
  textStrong: '#09090b',
  userBubble: '#1d4ed8',
  userText: '#ffffff',
  assistantBubble: '#f4f4f5',
  assistantBubbleBorder: '#e4e4e7',
  headerBorder: '#e4e4e7',
  activeThread: '#dbeafe',
  activeThreadBorder: '#93c5fd',
  threadHover: '#f0f0f0',
  btnPrimary: '#1d4ed8',
  btnDisabled: '#e4e4e7',
  btnDisabledText: '#a1a1aa',
  footerText: '#a1a1aa',
  badge: '#f4f4f5',
  badgeBorder: '#e4e4e7',
  badgeText: '#a1a1aa',
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('rag_theme')
    return saved ? saved === 'dark' : true
  })

  useEffect(() => {
    localStorage.setItem('rag_theme', isDark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ theme: isDark ? dark : light, isDark, toggle: () => setIsDark(v => !v) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
