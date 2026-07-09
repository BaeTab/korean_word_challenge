// -----------------------------------------------------------------------------
// useWordleGame — 자모 워들 게임 상태/규칙 훅
//  - 5칸/6칸/7칸 모드(인트로에서 직접 선택, 체인 없음)
//  - 입력/삭제/제출, 판정, 키보드 상태 병합
//  - 시간요소 없음: 시도 횟수만으로 승패를 가른다.
// -----------------------------------------------------------------------------
import { useCallback, useMemo, useState } from 'react'
import {
  decomposeWord,
  evaluateGuess,
  mergeKeyStates,
  TILE,
} from '../utils/hangul'
import { obfuscate, deobfuscate } from '../utils/secret'
import { pickRandomWord, pickDailyWord } from '../constants/words'

export const MAX_ROWS = 6

/**
 * 새 게임 상태 생성.
 * 정답은 평문으로 두지 않고 answerEnc(난독화)만 보관한다. (anti-peek)
 * @param {object} [opts] { fixedWord, daily, dailyKey, room, roomId }
 */
function freshGame(slots, exclude, opts = {}) {
  const answer = opts.fixedWord || pickRandomWord(slots, exclude)
  return {
    slots,
    stage: slots === 7 ? 3 : slots === 6 ? 2 : 1,
    answerEnc: obfuscate(answer), // 정답은 암호화 상태로만 저장
    guesses: [], // [{ jamo:string[], evaluation:string[] }]
    current: [], // 진행 중인 행의 자모 배열
    keyStates: {}, // jamo -> 'correct'|'present'|'absent'
    status: 'playing', // 'playing' | 'won' | 'lost'
    hintUsed: false, // 스테이지당 힌트 1회
    isDaily: !!opts.daily, // 데일리 챌린지 여부
    dailyKey: opts.dailyKey || null, // 'YYYY-MM-DD'
    isRoom: !!opts.room, // 커스텀 방 여부(친구가 고른 단어 — XP/포인트 미지급)
    roomId: opts.roomId || null,
  }
}

export function useWordleGame() {
  const [game, setGame] = useState(() => freshGame(5))
  const [started, setStarted] = useState(false) // 인트로(닉네임)에서 시작 버튼을 눌러야 true

  // ---- 입력 액션 ----------------------------------------------------------
  const pressKey = useCallback((jamo) => {
    setGame((g) => {
      if (g.status !== 'playing') return g
      if (g.current.length >= g.slots) return g
      return { ...g, current: [...g.current, jamo] }
    })
  }, [])

  const pressDelete = useCallback(() => {
    setGame((g) => {
      if (g.status !== 'playing') return g
      if (g.current.length === 0) return g
      return { ...g, current: g.current.slice(0, -1) }
    })
  }, [])

  /** 현재 입력 중인 행을 통째로 비운다(사전에 없는 단어일 때 등). */
  const clearCurrent = useCallback(() => {
    setGame((g) => (g.status !== 'playing' || g.current.length === 0 ? g : { ...g, current: [] }))
  }, [])

  /** 힌트: 다음 빈 칸의 정답 자모 1개를 채워준다. 스테이지당 1회, 페널티 없음. */
  const useHint = useCallback(() => {
    setGame((g) => {
      if (g.status !== 'playing' || g.hintUsed) return g
      if (g.current.length >= g.slots) return g // 행이 꽉 차면 사용 불가
      const answerJamo = decomposeWord(deobfuscate(g.answerEnc))
      const pos = g.current.length
      return {
        ...g,
        current: [...g.current, answerJamo[pos]],
        hintUsed: true,
      }
    })
  }, [])

  const pressEnter = useCallback(() => {
    setGame((g) => {
      if (g.status !== 'playing') return g
      if (g.current.length !== g.slots) return g // 다 안 채우면 무시

      // 판정 순간에만 정답을 잠깐 복호화(지역 변수)하고 버린다.
      const answerJamo = decomposeWord(deobfuscate(g.answerEnc))
      const evaluation = evaluateGuess(g.current, answerJamo)
      const guesses = [...g.guesses, { jamo: g.current, evaluation }]
      const keyStates = mergeKeyStates(g.keyStates, g.current, evaluation)
      const won = evaluation.every((e) => e === TILE.CORRECT)
      const lost = !won && guesses.length >= MAX_ROWS
      const status = won ? 'won' : lost ? 'lost' : 'playing'

      return { ...g, guesses, current: [], keyStates, status }
    })
  }, [])

  // 직전 정답(중복 방지용)을 안전하게 얻는다.
  const prevAnswer = (g) => (g.answerEnc ? deobfuscate(g.answerEnc) : undefined)

  // ---- 게임 흐름 ----------------------------------------------------------
  /** 인트로(닉네임)에서 '시작'을 눌러 게임을 개시. */
  const begin = useCallback((slots = 5) => {
    setStarted(true)
    setGame((g) => freshGame(slots, prevAnswer(g)))
  }, [])

  /** 데일리 챌린지 시작 — 날짜 기준 고정 단어(5칸), 챌린지 진행 없음. */
  const beginDaily = useCallback((dateKey) => {
    setStarted(true)
    setGame(() =>
      freshGame(5, undefined, { fixedWord: pickDailyWord(dateKey), daily: true, dailyKey: dateKey }),
    )
  }, [])

  /** 커스텀 방 시작 — 방장이 고른 단어로 진행. XP/포인트 미지급(freshGame의 room 플래그로 App에서 분기). */
  const beginRoom = useCallback((roomId, word, slots) => {
    setStarted(true)
    setGame(() => freshGame(slots, undefined, { fixedWord: word, room: true, roomId }))
  }, [])

  /** 인트로(모드 선택) 화면으로 돌아간다. */
  const exitToIntro = useCallback(() => {
    setStarted(false)
  }, [])

  /** 같은 모드로 다시 (새 단어). 데일리면 같은 오늘의 단어로 재도전. 방은 재도전 없음(홈으로만). */
  const retrySameMode = useCallback(() => {
    setGame((g) =>
      g.isDaily
        ? freshGame(5, undefined, { fixedWord: pickDailyWord(g.dailyKey), daily: true, dailyKey: g.dailyKey })
        : freshGame(g.slots, prevAnswer(g)),
    )
  }, [])

  // ---- 렌더용 그리드 파생 -------------------------------------------------
  const grid = useMemo(() => {
    const rows = []
    for (let r = 0; r < MAX_ROWS; r++) {
      const cells = []
      const submitted = game.guesses[r]
      const isCurrent = r === game.guesses.length && game.status === 'playing'
      for (let c = 0; c < game.slots; c++) {
        if (submitted) {
          cells.push({ jamo: submitted.jamo[c], state: submitted.evaluation[c] })
        } else if (isCurrent) {
          const jamo = game.current[c]
          cells.push({ jamo: jamo ?? '', state: jamo ? TILE.FILLED : TILE.EMPTY })
        } else {
          cells.push({ jamo: '', state: TILE.EMPTY })
        }
      }
      rows.push(cells)
    }
    return rows
  }, [game.guesses, game.current, game.slots, game.status])

  // 정답 평문은 게임이 끝난 뒤에만 노출(진행 중엔 빈 문자열).
  const answer = game.status === 'playing' ? '' : deobfuscate(game.answerEnc)

  return {
    // 상태
    started,
    isDaily: game.isDaily,
    dailyKey: game.dailyKey,
    isRoom: game.isRoom,
    roomId: game.roomId,
    slots: game.slots,
    stage: game.stage,
    answer,
    status: game.status,
    keyStates: game.keyStates,
    attempts: game.guesses.length,
    current: game.current,
    currentLength: game.current.length,
    maxRows: MAX_ROWS,
    grid,
    evaluations: game.guesses.map((g) => g.evaluation), // 제출된 행별 판정(공유용)
    hintUsed: game.hintUsed,
    // 액션
    begin,
    beginDaily,
    beginRoom,
    pressKey,
    pressDelete,
    clearCurrent,
    useHint,
    pressEnter,
    retrySameMode,
    exitToIntro,
  }
}
