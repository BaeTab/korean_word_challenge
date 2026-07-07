// -----------------------------------------------------------------------------
// Mascot — 인라인 SVG 마스코트 "터밍이(Termie)"
//  둥근 터미널 창 몸통 + 표정. mood 로 감정 전환.
//  외부 이미지 없이 벡터로 그려 어떤 배경에서도 선명하게 렌더된다.
// -----------------------------------------------------------------------------

const MOODS = {
  idle: { mouth: 'M 24 40 Q 32 44 40 40', blush: true, eye: 'open' },
  happy: { mouth: 'M 22 38 Q 32 50 42 38', blush: true, eye: 'happy' },
  think: { mouth: 'M 27 42 Q 32 39 37 42', blush: false, eye: 'open' },
  sad: { mouth: 'M 24 44 Q 32 38 40 44', blush: false, eye: 'sad' },
}

export default function Mascot({ mood = 'idle', size = 96, className = '' }) {
  const m = MOODS[mood] ?? MOODS.idle

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`마스코트 터밍이 (${mood})`}
    >
      {/* 몸통 (둥근 터미널 창) */}
      <rect x="4" y="8" width="56" height="48" rx="16" fill="#161b22" stroke="#3ddc97" strokeWidth="2.5" />
      {/* 상단 신호등 버튼 */}
      <circle cx="14" cy="17" r="2.4" fill="#ff7eb6" />
      <circle cx="22" cy="17" r="2.4" fill="#ffb454" />
      <circle cx="30" cy="17" r="2.4" fill="#3ddc97" />

      {/* 볼터치 */}
      {m.blush && (
        <>
          <ellipse cx="17" cy="40" rx="4.5" ry="3" fill="#ff7eb6" opacity="0.55" />
          <ellipse cx="47" cy="40" rx="4.5" ry="3" fill="#ff7eb6" opacity="0.55" />
        </>
      )}

      {/* 눈 */}
      {m.eye === 'happy' ? (
        <>
          <path d="M 20 33 Q 24 29 28 33" stroke="#3ddc97" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M 36 33 Q 40 29 44 33" stroke="#3ddc97" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      ) : m.eye === 'sad' ? (
        <>
          <circle cx="24" cy="33" r="2.6" fill="#3ddc97" />
          <circle cx="40" cy="33" r="2.6" fill="#3ddc97" />
          <path d="M 20 28 Q 24 30 28 28" stroke="#8b949e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M 36 28 Q 40 30 44 28" stroke="#8b949e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="24" cy="33" r="3" fill="#3ddc97" />
          <circle cx="40" cy="33" r="3" fill="#3ddc97" />
          <circle cx="25" cy="32" r="1" fill="#e6fff4" />
          <circle cx="41" cy="32" r="1" fill="#e6fff4" />
        </>
      )}

      {/* 입 */}
      <path d={m.mouth} stroke="#3ddc97" strokeWidth="2.6" fill="none" strokeLinecap="round" />

      {/* 커서 깜빡임(장식) */}
      <rect x="49" y="46" width="6" height="3" rx="1" fill="#ffb454">
        <animate attributeName="opacity" values="1;0.15;1" dur="1.2s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}
