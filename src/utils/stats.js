// -----------------------------------------------------------------------------
// 개인 통계 (localStorage) — 플레이/승률/연속(스트릭)/시도 분포 + 오답노트/자모 통계
// -----------------------------------------------------------------------------
import { getDailyKey } from './daily'

const KEY = 'jamo-wordle-stats-v1'

const emptyStats = () => ({
  played: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, // 승리 시 시도 횟수 분포
  byMode: { 5: { played: 0, wins: 0 }, 6: { played: 0, wins: 0 }, 7: { played: 0, wins: 0 } },
})

export function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    const base = emptyStats()
    return {
      ...base,
      ...s,
      dist: { ...base.dist, ...(s.dist || {}) },
      byMode: {
        5: { ...base.byMode[5], ...(s.byMode?.[5] || {}) },
        6: { ...base.byMode[6], ...(s.byMode?.[6] || {}) },
        7: { ...base.byMode[7], ...(s.byMode?.[7] || {}) },
      },
    }
  } catch {
    return emptyStats()
  }
}

/**
 * 게임 종료 결과를 기록하고 갱신된 통계를 반환.
 * @param {{won:boolean, attempts:number, slots:number}} r
 */
export function recordResult({ won, attempts, slots }) {
  const s = loadStats()
  s.played += 1
  const mode = s.byMode[slots] || (s.byMode[slots] = { played: 0, wins: 0 })
  mode.played += 1
  if (won) {
    s.wins += 1
    mode.wins += 1
    s.streak += 1
    s.maxStreak = Math.max(s.maxStreak, s.streak)
    if (attempts >= 1 && attempts <= 6) s.dist[attempts] = (s.dist[attempts] || 0) + 1
  } else {
    s.streak = 0
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 저장 실패해도 게임엔 영향 없음 */
  }
  return s
}

export function resetStats() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
  return emptyStats()
}

export function winRate(s) {
  return s.played ? Math.round((s.wins / s.played) * 100) : 0
}

// ---- 오답노트 (localStorage) -------------------------------------------------
const WRONG_KEY = 'jamo-wordle-wrongnote-v1'
const WRONG_MAX = 20

/** 오답노트 읽기 — 최신순 [{word, slots, dateKey}] (최대 20개). */
export function loadWrongNotes() {
  try {
    const v = JSON.parse(localStorage.getItem(WRONG_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

/**
 * 패배한 단어를 오답노트에 기록(최신순, 최대 20개 유지).
 * @param {{word:string, slots:number}} r
 */
export function recordWrongAnswer({ word, slots }) {
  if (!word) return loadWrongNotes()
  const next = [{ word, slots, dateKey: getDailyKey() }, ...loadWrongNotes()].slice(0, WRONG_MAX)
  try {
    localStorage.setItem(WRONG_KEY, JSON.stringify(next))
  } catch {
    /* 저장 실패해도 게임엔 영향 없음 */
  }
  return next
}

// ---- 자모 통계 (localStorage) ------------------------------------------------
const JAMO_KEY = 'jamo-wordle-jamostat-v1'

/** 자모 통계 읽기 — { [jamo]: {c, p, a} } (correct/present/absent 누적). */
export function loadJamoStats() {
  try {
    const v = JSON.parse(localStorage.getItem(JAMO_KEY) || '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/**
 * 제출된 행들의 셀 판정을 자모별로 누적한다.
 * @param {Array<Array<{jamo:string, state:string}>>|Array<{jamo:string, state:string}>} rows
 *   grid의 제출 행 배열(또는 셀 배열). state가 correct/present/absent인 셀만 집계.
 */
export function recordJamoStats(rows) {
  if (!rows || !rows.length) return loadJamoStats()
  // 행 배열이면 셀로 평탄화(이미 셀 배열이면 그대로 사용).
  const cells = Array.isArray(rows[0]) ? rows.flat() : rows
  const stat = loadJamoStats()
  const field = { correct: 'c', present: 'p', absent: 'a' }
  for (const cell of cells) {
    const key = cell && field[cell.state]
    if (!key || !cell.jamo) continue
    const rec = stat[cell.jamo] || (stat[cell.jamo] = { c: 0, p: 0, a: 0 })
    rec[key] += 1
  }
  try {
    localStorage.setItem(JAMO_KEY, JSON.stringify(stat))
  } catch {
    /* noop */
  }
  return stat
}
