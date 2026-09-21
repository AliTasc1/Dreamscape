import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Foundations first, so component styles always layer on top of them.
import './styles/global.css'
import { App } from './App'
import { AppProvider } from './state/appState'

const container = document.getElementById('root')
if (!container) throw new Error('Dreamscape: #root is missing from the document')

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
