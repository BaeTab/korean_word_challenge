// -----------------------------------------------------------------------------
// ConfettiBurst — 승리 시 살짝 터지는 CSS 색종이 (외부 라이브러리 없이)
// -----------------------------------------------------------------------------
import styles from '../styles/Confetti.module.css'

const PIECES = ['🎉', '✨', '⭐', '🎊', '💚', '🧡', '💛', '🩷', '🌟', '✦', '★', '❁']

export default function ConfettiBurst({ count = 24 }) {
  const items = Array.from({ length: count }, (_, i) => {
    const left = (i * 97) % 100 // 의사난수 분포(결정적)
    const delay = (i % 6) * 0.12
    const dur = 2.2 + (i % 5) * 0.35
    const glyph = PIECES[i % PIECES.length]
    return (
      <span
        key={i}
        className={styles.piece}
        style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
      >
        {glyph}
      </span>
    )
  })
  return <div className={styles.layer} aria-hidden="true">{items}</div>
}
