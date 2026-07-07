// -----------------------------------------------------------------------------
// 한글 자모 분리 & 워들 판정 핵심 로직
//
//  유니코드 조합 공식:
//    음절코드 = 0xAC00 + (초성index * 21 * 28) + (중성index * 28) + 종성index
//
//  게임 규칙:
//   - 각 음절을 초/중/종성으로 분해한 뒤, "원자(atomic) 자모" 배열로 평탄화한다.
//   - 쌍자음(ㄲ,ㄸ,ㅃ,ㅆ,ㅉ)은 기본 자음 2개로 확장 → 2칸 차지 (예: 토'끼' → ...ㄱ,ㄱ,ㅣ)
//   - 겹받침(ㄳ,ㄵ,ㄶ,ㄺ,ㄻ...)도 구성 자음 2개로 분해한다.
//   - 예) '녹차' → ㄴ,ㅗ,ㄱ,ㅊ,ㅏ (5칸)  /  '토끼' → ㅌ,ㅗ,ㄱ,ㄱ,ㅣ (5칸)
// -----------------------------------------------------------------------------

const HANGUL_BASE = 0xac00
const HANGUL_END = 0xd7a3

// 초성 19자
const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

// 중성 21자
const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
]

// 종성 28자 (첫 칸은 받침 없음)
const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

// 쌍자음 → 기본 자음 2개
const DOUBLE_CONSONANT = {
  ㄲ: ['ㄱ', 'ㄱ'],
  ㄸ: ['ㄷ', 'ㄷ'],
  ㅃ: ['ㅂ', 'ㅂ'],
  ㅆ: ['ㅅ', 'ㅅ'],
  ㅉ: ['ㅈ', 'ㅈ'],
}

// 이중모음 → 기본 모음 조합 (게임 규칙: ㅐ=ㅏ+ㅣ, ㅔ=ㅓ+ㅣ …)
const COMPOUND_VOWEL = {
  ㅐ: ['ㅏ', 'ㅣ'],
  ㅔ: ['ㅓ', 'ㅣ'],
  ㅒ: ['ㅑ', 'ㅣ'],
  ㅖ: ['ㅕ', 'ㅣ'],
}

// 겹받침 → 구성 자음 2개
const COMPOUND_JONG = {
  ㄳ: ['ㄱ', 'ㅅ'],
  ㄵ: ['ㄴ', 'ㅈ'],
  ㄶ: ['ㄴ', 'ㅎ'],
  ㄺ: ['ㄹ', 'ㄱ'],
  ㄻ: ['ㄹ', 'ㅁ'],
  ㄼ: ['ㄹ', 'ㅂ'],
  ㄽ: ['ㄹ', 'ㅅ'],
  ㄾ: ['ㄹ', 'ㅌ'],
  ㄿ: ['ㄹ', 'ㅍ'],
  ㅀ: ['ㄹ', 'ㅎ'],
  ㅄ: ['ㅂ', 'ㅅ'],
}

// 게임 가상 키보드에서 사용하는 기본 자음/모음(단자음 + 단순·이중모음)
export const BASIC_CONSONANTS = [
  'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ',
  'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]
// 기본 모음(단모음/기본 이중모음). ㅐ·ㅔ 등은 ㅏ+ㅣ, ㅓ+ㅣ 조합으로 입력하므로 제외.
export const BASIC_VOWELS = [
  'ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ',
  'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ',
]

// 가상 키보드로 입력 가능한 전체 자모 집합 (단어 유효성 검증에 사용)
export const KEYBOARD_JAMO = new Set([...BASIC_CONSONANTS, ...BASIC_VOWELS])

/**
 * 이 단어가 가상 키보드만으로 입력 가능한지 검사.
 * (복합모음 ㅘ/ㅚ/ㅢ 등이 섞이면 false → 단어 풀에서 자동 제외)
 * @param {string} word
 */
export function isTypable(word) {
  return decomposeWord(word).every((j) => KEYBOARD_JAMO.has(j))
}

/** 한 자모를 원자 자모 배열로 확장 (쌍자음/이중모음/겹받침 분해). */
function expandJamo(jamo) {
  if (!jamo) return []
  if (DOUBLE_CONSONANT[jamo]) return DOUBLE_CONSONANT[jamo]
  if (COMPOUND_VOWEL[jamo]) return COMPOUND_VOWEL[jamo]
  if (COMPOUND_JONG[jamo]) return COMPOUND_JONG[jamo]
  return [jamo]
}

/**
 * 한 음절을 원자 자모 배열로 분해.
 * @param {string} syllable 완성형 한글 한 글자
 * @returns {string[]}
 */
export function decomposeSyllable(syllable) {
  const code = syllable.codePointAt(0)
  // 완성형 한글이 아니면 그대로 (공백/기호 등)
  if (code < HANGUL_BASE || code > HANGUL_END) return [syllable]

  const offset = code - HANGUL_BASE
  const choIdx = Math.floor(offset / (21 * 28))
  const jungIdx = Math.floor((offset % (21 * 28)) / 28)
  const jongIdx = offset % 28

  return [
    ...expandJamo(CHO[choIdx]),
    ...expandJamo(JUNG[jungIdx]),
    ...expandJamo(JONG[jongIdx]),
  ]
}

/**
 * 단어(여러 음절)를 원자 자모 배열로 분해.
 * @param {string} word 예) '녹차'
 * @returns {string[]} 예) ['ㄴ','ㅗ','ㄱ','ㅊ','ㅏ']
 */
export function decomposeWord(word) {
  return [...word].flatMap(decomposeSyllable)
}

// ---- 판정 (Wordle 로직, 중복 자모 대응 2-pass) --------------------------------

export const TILE = {
  CORRECT: 'correct', // 초록: 자모 O, 위치 O
  PRESENT: 'present', // 노랑: 자모 O, 위치 X
  ABSENT: 'absent', // 회색: 자모 X
  EMPTY: 'empty',
  FILLED: 'filled', // 입력됐지만 아직 미제출
}

/**
 * 한 번의 추측을 정답과 비교해 각 칸의 상태를 반환.
 * @param {string[]} guess  분해된 추측 자모 배열
 * @param {string[]} answer 분해된 정답 자모 배열
 * @returns {('correct'|'present'|'absent')[]}
 */
export function evaluateGuess(guess, answer) {
  const n = answer.length
  const result = new Array(n).fill(TILE.ABSENT)

  // 정답 자모의 남은 개수 카운트
  const remaining = {}
  for (const j of answer) remaining[j] = (remaining[j] || 0) + 1

  // 1-pass: 초록(정확 위치) 먼저 확정하고 카운트 차감
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      result[i] = TILE.CORRECT
      remaining[guess[i]] -= 1
    }
  }

  // 2-pass: 남은 칸 중 정답에 남아있는 자모면 노랑
  for (let i = 0; i < n; i++) {
    if (result[i] === TILE.CORRECT) continue
    const j = guess[i]
    if (remaining[j] > 0) {
      result[i] = TILE.PRESENT
      remaining[j] -= 1
    }
  }

  return result
}

/**
 * 키보드 상태 병합. 우선순위: correct > present > absent.
 * @param {Record<string,string>} prev 기존 키 상태 맵
 * @param {string[]} guess 분해된 추측 자모
 * @param {('correct'|'present'|'absent')[]} evaluation evaluateGuess 결과
 * @returns {Record<string,string>} 새 키 상태 맵
 */
export function mergeKeyStates(prev, guess, evaluation) {
  const rank = { [TILE.ABSENT]: 0, [TILE.PRESENT]: 1, [TILE.CORRECT]: 2 }
  const next = { ...prev }
  for (let i = 0; i < guess.length; i++) {
    const key = guess[i]
    const state = evaluation[i]
    if (next[key] == null || rank[state] > rank[next[key]]) {
      next[key] = state
    }
  }
  return next
}
