// -----------------------------------------------------------------------------
// InstallBanner — PWA 홈 화면 설치 유도 배너
//  - Android/Chrome/Edge: beforeinstallprompt 캡처 → 버튼으로 네이티브 설치 프롬프트 실행
//  - iOS Safari: beforeinstallprompt 미지원 → 공유 → 홈 화면에 추가 방법 안내
//  - 이미 설치(standalone 실행) 상태면 표시 안 함. 닫으면 다시 안 뜸(로컬스토리지 기억).
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import styles from '../styles/InstallBanner.module.css'

const DISMISS_KEY = 'pwa-install-dismissed-v1'

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [iosGuide, setIosGuide] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  )

  useEffect(() => {
    if (isStandalone()) return
    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    if (isIos()) setIosGuide(true)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* noop */ }
  }

  const install = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    dismiss()
  }

  if (dismissed || isStandalone() || (!deferredPrompt && !iosGuide)) return null

  return (
    <div className={styles.banner} role="note">
      {deferredPrompt ? (
        <span className={styles.text}>📲 홈 화면에 추가하고 앱처럼 빠르게 플레이해보세요!</span>
      ) : (
        <span className={styles.text}>
          📲 iOS는 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>로 앱처럼 설치할 수 있어요!
        </span>
      )}
      <div className={styles.actions}>
        {deferredPrompt && (
          <button className={styles.install} onClick={install}>설치하기</button>
        )}
        <button className={styles.close} onClick={dismiss} aria-label="닫기">×</button>
      </div>
    </div>
  )
}
