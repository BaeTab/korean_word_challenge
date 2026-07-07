// -----------------------------------------------------------------------------
// useWordleGame — 자모 워들 게임 상태/규칙 훅
//  - 5칸(기본) ↔ 6칸(챌린지) 모드 전환
//  - 입력/삭제/제출, 판정, 키보드 상태 병합
//  - 타이머(최초 시작 시점부터 누적 → 클리어까지 걸린 시간)
//  - bestResult: 등록 가능한 최고 성적 { stage, attempts, timeMs }
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  decomposeWord,
  evaluateGuess,
  mergeKeyStates,
  TILE,
} from '../utils/hangul'
import { obfuscate, deobfuscate } from '../utils/secret'
import { pickRandomWord } from '../constants/words'

export const MAX_ROWS = 6
export const HINT_PENALTY_MS = 30000 // 힌트 1회당 시간 페널티(+30초)

/**
 * 새 게임 상태 생성.
 * 정답은 평문으로 두지 않고 answerEnc(난독화)만 보관한다. (anti-peek)
 */
function freshGame(slots, exclude) {
  const answer = pickRandomWord(slots, exclude)
  return {
    slots,
    stage: slots === 6 ? 2 : 1,
    answerEnc: obfuscate(answer), // 정답은 암호화 상태로만 저장
    guesses: [], // [{ jamo:string[], evaluation:string[] }]
    current: [], // 진행 중인 행의 자모 배열
    keyStates: {}, // jamo -> 'correct'|'present'|'absent'
    status: 'playing', // 'playing' | 'won' | 'lost'
    hintUsed: false, // 스테이지당 힌트 1회
    penaltyMs: 0, // 힌트 사용 누적 페널티
  }
}

export function useWordleGame() {
  const [game, setGame] = useState(() => freshGame(5))
  const [bestResult, setBestResult] = useState(null) // { stage, attempts, timeMs }
  const [started, setStarted] = useState(false) // 인트로(닉네임)에서 시작 버튼을 눌러야 true

  // 타이머: begin() 시점(startRef)부터 누적. 시작 전엔 0.
  const startRef = useRef(Date.now())
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!started || game.status !== 'playing') return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [started, game.status])

  const elapsedMs = started ? Math.max(0, now - startRef.current) : 0

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

  /** 힌트: 다음 빈 칸의 정답 자모 1개를 채워준다. 스테이지당 1회, +30초 페널티. */
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
        penaltyMs: g.penaltyMs + HINT_PENALTY_MS,
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

      // 클리어 시 성적 기록 (더 높은 스테이지면 갱신). 힌트 페널티를 시간에 가산.
      if (won) {
        const result = {
          stage: g.stage,
          attempts: guesses.length,
          timeMs: Math.max(0, Date.now() - startRef.current) + g.penaltyMs,
        }
        setBestResult((prev) =>
          !prev || g.stage > prev.stage ? result : prev,
        )
      }

      return { ...g, guesses, current: [], keyStates, status }
    })
  }, [])

  // 직전 정답(중복 방지용)을 안전하게 얻는다.
  const prevAnswer = (g) => (g.answerEnc ? deobfuscate(g.answerEnc) : undefined)

  // ---- 게임 흐름 ----------------------------------------------------------
  /** 인트로(닉네임)에서 '시작'을 눌러 게임을 개시. 타이머 시작. */
  const begin = useCallback(() => {
    startRef.current = Date.now()
    setNow(Date.now())
    setBestResult(null)
    setStarted(true)
    setGame((g) => freshGame(5, prevAnswer(g)))
  }, [])

  /** 5글자 클리어 후 6글자 챌린지로 진입 (타이머는 누적 유지). */
  const startChallenge = useCallback(() => {
    setGame((g) => freshGame(6, prevAnswer(g)))
  }, [])

  /** 전체 재시작 (기본 5글자, 타이머·성적 초기화). */
  const restart = useCallback(() => {
    startRef.current = Date.now()
    setNow(Date.now())
    setBestResult(null)
    setGame((g) => freshGame(5, prevAnswer(g)))
  }, [])

  /** 같은 모드에서 새 단어로 다시 (지금 스테이지 유지, 타이머 누적). */
  const retrySameMode = useCallback(() => {
    setGame((g) => freshGame(g.slots, prevAnswer(g)))
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
    elapsedMs,
    penaltyMs: game.penaltyMs,
    hintUsed: game.hintUsed,
    bestResult,
    // 액션
    begin,
    pressKey,
    pressDelete,
    clearCurrent,
    useHint,
    pressEnter,
    startChallenge,
    retrySameMode,
    restart,
  }
}
