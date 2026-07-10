import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { runSeasonResetOnce } from './utils/seasonReset'
import { initTheme } from './utils/theme'
import './styles/index.css'

// createRoot 호출 전에 실행 — App의 useState(loadStats)가 초기화된 값을 읽도록.
runSeasonResetOnce()
// 저장/OS 선호 테마를 첫 페인트 전에 <html data-theme>로 적용.
initTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
