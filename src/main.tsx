import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/shared/error-boundary'

// Mesma proteção do inovare.fisio: depois de um deploy novo, o navegador
// pode ter em cache um chunk que não existe mais no servidor — recarrega
// sozinho uma vez, sem mostrar erro pro usuário.
window.addEventListener('vite:preloadError', () => {
  const jaTentou = sessionStorage.getItem('risco:recarregado-apos-erro-chunk')
  if (jaTentou) return
  sessionStorage.setItem('risco:recarregado-apos-erro-chunk', '1')
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
