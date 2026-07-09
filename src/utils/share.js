// -----------------------------------------------------------------------------
// 결과 공유 — 정답 노출 없이 판정 그리드(🟩🟨⬛)만 공유 (Wordle 스타일)
// -----------------------------------------------------------------------------
import { stageLabel } from './format'

const EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' }
const SITE = 'https://word-challengee.web.app'

/**
 * 공유 텍스트 생성.
 * @param {{stage:number, attempts:number, maxRows:number,
 *          evaluations:string[][], won:boolean, dailyKey?:string}} p
 */
export function buildShareText(p) {
  const mode = p.dailyKey ? `데일리 #${p.dailyKey}` : stageLabel(p.stage)
  const face = p.won ? (p.stage >= 2 ? '🏆' : '🎉') : '😢'
  const tries = p.won ? `${p.attempts}/${p.maxRows}` : `X/${p.maxRows}`
  const line2 = `🎯 ${tries}`
  const grid = p.evaluations
    .map((row) => row.map((s) => EMOJI[s] || '⬛').join(''))
    .join('\n')
  return `자모 워들 · ${mode} ${face}\n${line2}\n${grid}\n${SITE}`
}

/**
 * 공유 실행. 모바일은 공유 시트, 그 외/미지원은 클립보드 복사.
 * @returns {Promise<'shared'|'copied'|'cancel'|'fail'>}
 */
export async function shareResult(text) {
  // 모바일 등 공유 시트 지원 시 우선
  if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancel'
      // 폴백으로 클립보드 시도
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'fail'
  }
}
