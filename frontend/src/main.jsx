import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import '@mantine/core/styles.css'
import { MantineProvider } from '@mantine/core'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="light">
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MantineProvider>
  </StrictMode>,
)