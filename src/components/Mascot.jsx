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

// 상점에서 구매 가능한 스킨 — 몸통/포인트 컬러만 바뀌고 표정 로직은 공유한다.
export const SKINS = {
  default: { body: '#161b22', accent: '#3ddc97', pupil: '#e6fff4' },
  cat: { body: '#1c1420', accent: '#ffb454', pupil: '#fff3de' },
  robot: { body: '#0f1620', accent: '#6fb1ff', pupil: '#e8f2ff' },
  ghost: { body: '#1a1625', accent: '#e0d6ff', pupil: '#f5f0ff' },
  alien: { body: '#0a1f0a', accent: '#9dff57', pupil: '#eaffd6' },
  panda: { body: '#0d0d0d', accent: '#f5f5f5', pupil: '#dfe6ea' },
  ninja: { body: '#1a0505', accent: '#ff3b3b', pupil: '#ffe0e0' },
}

export default function Mascot({ mood = 'idle', size = 96, className = '', skin = 'default' }) {
  const m = MOODS[mood] ?? MOODS.idle
  const s = SKINS[skin] ?? SKINS.default

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`마스코트 터밍이 (${mood})`}
    >
      {/* 고양이 스킨: 귀 */}
      {skin === 'cat' && (
        <>
          <path d="M 10 12 L 6 2 L 18 9 Z" fill={s.body} stroke={s.accent} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 54 12 L 58 2 L 46 9 Z" fill={s.body} stroke={s.accent} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )}
      {/* 로봇 스킨: 안테나 */}
      {skin === 'robot' && (
        <>
          <line x1="32" y1="8" x2="32" y2="1" stroke={s.accent} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="0" r="2.6" fill={s.accent} />
        </>
      )}
      {/* 유령 스킨: 반짝임 */}
      {skin === 'ghost' && (
        <>
          <circle cx="9" cy="6" r="1.6" fill={s.accent}>
            <animate attributeName="opacity" values="1;0.1;1" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle cx="55" cy="10" r="1.2" fill={s.accent}>
            <animate attributeName="opacity" values="0.2;1;0.2" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* 외계인 스킨: 더듬이 */}
      {skin === 'alien' && (
        <>
          <line x1="20" y1="8" x2="14" y2="0" stroke={s.accent} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="13" cy="-1" r="2.2" fill={s.accent} />
          <line x1="44" y1="8" x2="50" y2="0" stroke={s.accent} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="51" cy="-1" r="2.2" fill={s.accent} />
        </>
      )}
      {/* 판다 스킨: 둥근 귀 */}
      {skin === 'panda' && (
        <>
          <circle cx="11" cy="9" r="7" fill={s.body} stroke={s.accent} strokeWidth="2.5" />
          <circle cx="53" cy="9" r="7" fill={s.body} stroke={s.accent} strokeWidth="2.5" />
        </>
      )}
      {/* 닌자 스킨: 머리띠 */}
      {skin === 'ninja' && (
        <rect x="4" y="24" width="56" height="5" fill={s.accent} opacity="0.85" />
      )}

      {/* 몸통 (둥근 터미널 창) */}
      <rect x="4" y="8" width="56" height="48" rx="16" fill={s.body} stroke={s.accent} strokeWidth="2.5" />
      {/* 상단 신호등 버튼 */}
      <circle cx="14" cy="17" r="2.4" fill="#ff7eb6" />
      <circle cx="22" cy="17" r="2.4" fill="#ffb454" />
      <circle cx="30" cy="17" r="2.4" fill={s.accent} />

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
          <path d="M 20 33 Q 24 29 28 33" stroke={s.accent} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M 36 33 Q 40 29 44 33" stroke={s.accent} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      ) : m.eye === 'sad' ? (
        <>
          <circle cx="24" cy="33" r="2.6" fill={s.accent} />
          <circle cx="40" cy="33" r="2.6" fill={s.accent} />
          <path d="M 20 28 Q 24 30 28 28" stroke="#8b949e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M 36 28 Q 40 30 44 28" stroke="#8b949e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="24" cy="33" r="3" fill={s.accent} />
          <circle cx="40" cy="33" r="3" fill={s.accent} />
          <circle cx="25" cy="32" r="1" fill={s.pupil} />
          <circle cx="41" cy="32" r="1" fill={s.pupil} />
        </>
      )}

      {/* 입 */}
      <path d={m.mouth} stroke={s.accent} strokeWidth="2.6" fill="none" strokeLinecap="round" />

      {/* 커서 깜빡임(장식) */}
      <rect x="49" y="46" width="6" height="3" rx="1" fill="#ffb454">
        <animate attributeName="opacity" values="1;0.15;1" dur="1.2s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}
