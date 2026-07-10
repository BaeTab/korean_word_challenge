// -----------------------------------------------------------------------------
// 테마 전환 — 다크(기본)/라이트. localStorage에 저장하고 <html data-theme>로 반영.
//  - CSS는 index.css의 :root[data-theme='light'] 팔레트로 대응(컴포넌트 수정 불필요).
// -----------------------------------------------------------------------------
const KEY = 'jamo-theme'

/** 저장된 테마 → 없으면 OS 선호(prefers-color-scheme). 반환: 'dark' | 'light' */
export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* noop */ }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  } catch { /* noop */ }
  return 'dark'
}

/** 현재 테마를 <html data-theme>에 반영. */
function apply(theme) {
  try {
    document.documentElement.dataset.theme = theme
  } catch { /* noop */ }
}

/** 앱 시작 시 1회 호출 — 저장값/OS 선호를 읽어 즉시 적용(첫 페인트 전). */
export function initTheme() {
  apply(getTheme())
}

/** 다크↔라이트 토글 후 저장하고 새 테마를 반환. */
export function toggleTheme() {
  const next = getTheme() === 'light' ? 'dark' : 'light'
  try {
    localStorage.setItem(KEY, next)
  } catch { /* noop */ }
  apply(next)
  return next
}
