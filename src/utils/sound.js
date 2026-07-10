// -----------------------------------------------------------------------------
// 사운드 & 햅틱 — 오디오 파일 없이 WebAudio 신시사이저로 효과음을 생성한다.
//  · 오디오 에셋 0바이트(PWA 캐시 부담 없음): 필요한 순간에 오실레이터로 톤을 만든다.
//  · 단일 AudioContext를 첫 사용자 제스처에 lazy 생성(iOS는 suspended 대비 resume).
//  · 사운드 토글(localStorage 'jamo-sound', 기본 ON)이 OFF면 모든 재생/진동이 즉시 리턴.
//  · gain 0.1 내외 + 짧은 어택/릴리즈 엔벨로프로 딱딱한 클릭 노이즈를 방지한다.
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'jamo-sound'

let ctx = null // 단일 AudioContext(lazy)
let soundOn = readPref() // 현재 사운드 on/off (localStorage 미러)

/** 저장된 선호값 읽기 — 'off'만 명시적으로 끔, 그 외(미설정 포함)는 기본 ON. */
function readPref() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

/** 현재 사운드가 켜져 있는지. */
export function isSoundOn() {
  return soundOn
}

/** 사운드 on/off 저장(진동도 같은 토글로 제어). */
export function setSoundOn(on) {
  soundOn = !!on
  try {
    localStorage.setItem(STORAGE_KEY, soundOn ? 'on' : 'off')
  } catch {
    /* noop */
  }
}

/** AudioContext를 lazy 생성하고 suspended면 resume한다(iOS 대비). 실패/미지원 시 null. */
function getCtx() {
  if (!soundOn) return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/**
 * 톤 1개 재생. 짧은 어택/릴리즈 엔벨로프로 클릭 노이즈를 없앤다.
 * @param {number} freq 주파수(Hz)
 * @param {number} dur  길이(초)
 * @param {object} [opts] { type, gain, delay }
 */
function tone(freq, dur, { type = 'sine', gain = 0.1, delay = 0 } = {}) {
  const ac = getCtx()
  if (!ac) return
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  // 0으로는 exponential ramp가 불가능하므로 아주 작은 값으로 감싼다.
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006) // 어택
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) // 릴리즈
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

/** 여러 톤을 순차 아르페지오로 재생. */
function arpeggio(notes, step, dur, opts = {}) {
  notes.forEach((f, i) => tone(f, dur, { ...opts, delay: i * step }))
}

/** 키 입력 틱(짧고 은은하게). */
export function playKey() {
  tone(600, 0.03, { type: 'triangle', gain: 0.05 })
}

/** 행 제출(가벼운 상승 2톤). */
export function playSubmit() {
  tone(440, 0.08, { type: 'sine', gain: 0.07 })
  tone(660, 0.08, { type: 'sine', gain: 0.05, delay: 0.04 })
}

/** 타일 리빌 — 판정 상태별 대표 톤 1회. */
export function playReveal(state) {
  const freq = state === 'correct' ? 880 : state === 'present' ? 660 : 330
  tone(freq, 0.08, { type: 'sine', gain: 0.08 })
}

/** 승리 팡파레(상승 아르페지오). */
export function playWin() {
  arpeggio([523, 659, 784, 1047], 0.09, 0.18, { type: 'triangle', gain: 0.1 })
}

/** 패배(저음 하강 글라이드). */
export function playLose() {
  const ac = getCtx()
  if (!ac) return
  const t0 = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(220, t0)
  osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.3)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32)
  osc.connect(g).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + 0.35)
}

/** 레벨업 팡파레(밝은 상승 아르페지오). */
export function playLevelUp() {
  arpeggio([523, 698, 880, 1047], 0.1, 0.2, { type: 'triangle', gain: 0.1 })
}

/** 코인(구매/출석) — 경쾌한 더블톤. */
export function playCoin() {
  tone(988, 0.07, { type: 'square', gain: 0.06 })
  tone(1319, 0.1, { type: 'square', gain: 0.06, delay: 0.06 })
}

/**
 * 진동. 사운드 토글이 OFF이거나 navigator.vibrate 미지원이면 no-op.
 * @param {number|number[]} pattern
 */
export function vibrate(pattern) {
  if (!soundOn) return
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* noop */
  }
}
