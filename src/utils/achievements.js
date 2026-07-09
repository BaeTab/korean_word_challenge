// -----------------------------------------------------------------------------
// 배지/업적 (localStorage) — 서버 랭킹과 무관한 개인 기록용 뱃지.
//  참여/승패는 이미 서버(players 컬렉션)와 로컬(stats.js)에 기록되므로,
//  여기서는 "달성 여부"만 별도로 저장해 프로필 화면에 표시한다.
// -----------------------------------------------------------------------------
const KEY = 'jamo-wordle-achievements-v1'

export const ACHIEVEMENTS = [
  { id: 'first-win', emoji: '🎉', name: '첫 승리', desc: '처음으로 정답을 맞혔어요' },
  { id: 'streak-3', emoji: '🔥', name: '3연승', desc: '3연속으로 승리했어요' },
  { id: 'streak-5', emoji: '🔥🔥', name: '5연승', desc: '5연속으로 승리했어요' },
  { id: 'streak-10', emoji: '🔥🔥🔥', name: '10연승', desc: '10연속으로 승리했어요' },
  { id: 'played-10', emoji: '🎮', name: '10판 참여', desc: '누적 10판을 플레이했어요' },
  { id: 'played-50', emoji: '🎮', name: '50판 참여', desc: '누적 50판을 플레이했어요' },
  { id: 'played-100', emoji: '🎮', name: '100판 참여', desc: '누적 100판을 플레이했어요' },
  { id: 'clear-5', emoji: '⭐', name: '5칸 첫 클리어', desc: '5칸 기본 모드를 처음 클리어했어요' },
  { id: 'clear-6', emoji: '🏆', name: '6칸 첫 클리어', desc: '6칸 챌린지 모드를 처음 클리어했어요' },
  { id: 'clear-7', emoji: '👑', name: '7칸 첫 클리어', desc: '7칸 마스터 모드를 처음 클리어했어요' },
  { id: 'accuracy-90', emoji: '💎', name: '정확도 마스터', desc: '10판 이상 참여하고 정답률 90% 이상을 달성했어요' },
  { id: 'level-5', emoji: '🆙', name: 'Lv.5 달성', desc: '레벨 5에 도달했어요' },
  { id: 'level-10', emoji: '🆙', name: 'Lv.10 달성', desc: '레벨 10에 도달했어요' },
  { id: 'level-20', emoji: '🆙', name: 'Lv.20 달성', desc: '레벨 20에 도달했어요' },
]

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { unlocked: s.unlocked || {} }
  } catch {
    return { unlocked: {} }
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 저장 실패해도 게임엔 영향 없음 */
  }
}

/** 현재까지 달성한 업적 상태를 반환. */
export function loadAchievements() {
  return load()
}

/**
 * 게임 종료 시점의 지표로 새로 달성한 업적을 판정하고 저장한다.
 * @param {{won:boolean, slots:number, streak:number, totalPlayed:number, level:number, accuracyBp:number}} ctx
 * @returns {Array<object>} 이번에 새로 달성한 업적 목록(없으면 빈 배열)
 */
export function checkAndUnlock(ctx) {
  const state = load()
  const newly = []
  const unlock = (id) => {
    if (!state.unlocked[id]) {
      state.unlocked[id] = true
      newly.push(id)
    }
  }

  if (ctx.won) unlock('first-win')
  if (ctx.streak >= 3) unlock('streak-3')
  if (ctx.streak >= 5) unlock('streak-5')
  if (ctx.streak >= 10) unlock('streak-10')
  if (ctx.totalPlayed >= 10) unlock('played-10')
  if (ctx.totalPlayed >= 50) unlock('played-50')
  if (ctx.totalPlayed >= 100) unlock('played-100')
  if (ctx.won && ctx.slots === 5) unlock('clear-5')
  if (ctx.won && ctx.slots === 6) unlock('clear-6')
  if (ctx.won && ctx.slots === 7) unlock('clear-7')
  if (ctx.totalPlayed >= 10 && ctx.accuracyBp >= 9000) unlock('accuracy-90')
  if (ctx.level >= 5) unlock('level-5')
  if (ctx.level >= 10) unlock('level-10')
  if (ctx.level >= 20) unlock('level-20')

  save(state)
  return newly.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean)
}
