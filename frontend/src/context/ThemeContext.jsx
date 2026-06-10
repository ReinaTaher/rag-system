import { createContext, useContext, useState, useEffect } from 'react'

const dark = {
  outerBg: '#0a0a0a',
  cardBg: '#111111',
  cardBorder: '#222222',
  sidebarBg: '#0d0d0d',
  sidebarBorder: '#1e1e1e',
  inputBg: '#1c1c1e',
  inputBorder: '#2a2a2a',
  text: '#e4e4e7',
  textMuted: '#71717a',
  textFaint: '#52525b',
  textStrong: '#fafafa',
  userBubble: '#1d4ed8',
  userText: '#ffffff',
  assistantBubble: '#1c1c1e',
  assistantBubbleBorder: '#2a2a2a',
  headerBorder: '#222222',
  activeThread: '#1c2a4a',
  activeThreadBorder: '#1d3a7a',
  threadHover: '#161616',
  btnPrimary: '#1d4ed8',
  btnDisabled: '#27272a',
  btnDisabledText: '#52525b',
  footerText: '#3f3f46',
  badge: '#1c1c1e',
  badgeBorder: '#2a2a2a',
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
