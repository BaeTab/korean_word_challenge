// -----------------------------------------------------------------------------
// LevelUpOverlay — 레벨업 시 전체 화면 축하 연출(토스트 한 줄 대체).
//  풀스크린 딤 레이어 + 행복한 마스코트(현재 장착 스킨) + "LEVEL UP!" + 큰 레벨 숫자 + 색종이.
//  2.2초 후 자동으로 닫히고, 아무 곳이나 클릭/탭하면 즉시 닫힌다.
// -----------------------------------------------------------------------------
import { useEffect, useRef } from 'react'
import Mascot from './Mascot'
import ConfettiBurst from './ConfettiBurst'
import styles from '../styles/LevelUpOverlay.module.css'

export default function LevelUpOverlay({ level, skin = 'default', onClose }) {
  // onClose가 매 렌더 새 함수여도 타이머가 리셋되지 않도록 ref로 최신값만 참조.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const t = setTimeout(() => closeRef.current?.(), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={styles.layer} onClick={onClose} role="button" aria-label="레벨업 축하 닫기">
      <ConfettiBurst />
      <div className={styles.card}>
        <Mascot mood="happy" skin={skin} size={120} />
        <p className={styles.title}>LEVEL UP!</p>
        <p className={styles.level}>Lv.{level}</p>
      </div>
    </div>
  )
}
