// -----------------------------------------------------------------------------
// 단어 사전
//  - ANSWERS: 정답 후보 = 흔한 실제 단어(큐레이션). 공정한 문제 출제.
//  - guessDict: 국어사전 기반 실제 2음절 단어 약 5.7만 개(자모 5/6칸·키보드 입력 가능).
//    → 제출 시 "실제로 존재하는 단어"인지 검사. (별도 청크로 지연 로드/생성)
//
//  두 목록 모두 런타임에 length·isTypable 로 재검증하여 안전.
// -----------------------------------------------------------------------------
import { decomposeWord, isTypable } from '../utils/hangul'
import { seededPick } from '../utils/daily'
import { ANSWERS } from './answers'

const key = (w) => decomposeWord(w).join('')

// 정답 풀(길이별). 실재성은 생성 단계에서 이미 사전과 교차검증됨.
export const WORD_LIST_5 = ANSWERS.filter((w) => isTypable(w) && decomposeWord(w).length === 5)
export const WORD_LIST_6 = ANSWERS.filter((w) => isTypable(w) && decomposeWord(w).length === 6)

// 추측 검증용 자모열 Set — 대량 사전(약 5.7만)은 동적 import 로 지연 로드.
let _set5 = null
let _set6 = null
let _loading = null

/** 추측 사전을 백그라운드로 미리 로드(인트로 화면에서 호출). */
export function preloadGuessDict() {
  if (_set5) return Promise.resolve()
  if (_loading) return _loading
  _loading = import('./guessDict').then((m) => {
    _set5 = new Set()
    _set6 = new Set()
    for (const w of m.default.split('\n')) {
      if (!w) continue
      const k = key(w) // 문자열 길이 == 자모 수
      if (k.length === 5) _set5.add(k)
      else if (k.length === 6) _set6.add(k)
    }
    for (const w of ANSWERS) {
      const k = key(w)
      if (k.length === 5) _set5.add(k)
      else if (k.length === 6) _set6.add(k)
    }
  })
  return _loading
}

/**
 * 제출된 자모열이 실제 사전에 있는 단어인지 검사.
 * 사전이 아직 로드 전이면 통과(fail-open)하여 입력을 막지 않는다.
 * @param {string[]} jamoArr 입력된 자모 배열
 * @param {number} slots 5 또는 6
 */
export function isValidGuess(jamoArr, slots) {
  if (!_set5) {
    preloadGuessDict() // 아직이면 로드 시작
    return true // 로딩 전에는 통과
  }
  const set = slots === 6 ? _set6 : _set5
  return set.has(jamoArr.join(''))
}

/**
 * 데일리 챌린지용 '오늘의 단어'(5칸). 날짜키가 같으면 항상 같은 단어.
 * @param {string} dateKey 'YYYY-MM-DD'
 */
export function pickDailyWord(dateKey) {
  return seededPick(WORD_LIST_5, dateKey)
}

/**
 * 모드별(5|6) 랜덤 정답 1개 선택.
 * @param {number} slots 5 또는 6
 * @param {string} [exclude] 직전 정답(연속 중복 방지)
 */
export function pickRandomWord(slots, exclude) {
  const base = slots === 6 ? WORD_LIST_6 : WORD_LIST_5
  const list = exclude && base.length > 1 ? base.filter((w) => w !== exclude) : base
  return list[Math.floor(Math.random() * list.length)]
}

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(`[words] 정답 5칸 ${WORD_LIST_5.length} · 6칸 ${WORD_LIST_6.length} (추측사전은 지연 로드)`)
}
