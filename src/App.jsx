// -----------------------------------------------------------------------------
// App — 자모 워들 메인
//  인트로(닉네임 입력) → 게임판 + 가상 키보드 + 실시간 랭킹 + 결과/등록 모달.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react'
import Board from './components/Board'
import Keyboard from './components/Keyboard'
import Leaderboard from './components/Leaderboard'
import DailyBoard from './components/DailyBoard'
import Modal from './components/Modal'
import Mascot from './components/Mascot'
import ConfettiBurst from './components/ConfettiBurst'
import IntroScreen from './components/IntroScreen'
import Stats from './components/Stats'
import { useWordleGame } from './hooks/useWordleGame'
import { submitScore, submitDailyScore } from './services/ranking'
import { isValidGuess, preloadGuessDict } from './constants/words'
import { formatTime, stageLabel } from './utils/format'
import { buildShareText, shareResult } from './utils/share'
import { getDailyKey } from './utils/daily'
import { loadStats, recordResult } from './utils/stats'
import { decomposeWord } from './utils/hangul'
import styles from './styles/App.module.css'

/** 오늘 저장된 데일리 결과 읽기 (없으면 null) */
function readSavedDaily(key) {
  try {
    const v = localStorage.getItem(`daily-done-${key}`)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

export default function App() {
  const game = useWordleGame()
  const {
    started, isDaily, dailyKey, slots, stage, status, keyStates, attempts, maxRows, grid, evaluations,
    elapsedMs, current, currentLength, answer, bestResult, hintUsed, penaltyMs,
    begin, beginDaily, pressKey, pressDelete, clearCurrent, useHint, pressEnter,
    startChallenge, retrySameMode, restart, exitToIntro,
  } = game

  const [nickname, setNickname] = useState('')
  const [shakeRow, setShakeRow] = useState(-1)
  const [toast, setToast] = useState('')
  const [resultOpen, setResultOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [dailyBusy, setDailyBusy] = useState(false)
  const [dailyDone, setDailyDone] = useState(false)
  const [dailyViewOpen, setDailyViewOpen] = useState(false)
  const [stats, setStats] = useState(loadStats)
  const prevStatus = useRef('playing')
  const toastTimer = useRef(null)

  // 추측 사전을 백그라운드로 미리 로드(닉네임 입력 동안 준비 완료되게)
  useEffect(() => {
    preloadGuessDict()
  }, [])

  // 짧은 안내 토스트
  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1500)
  }, [])

  // 승패 전환 시: 통계 기록 + (데일리면) 참여 잠금 저장 + 결과 모달 오픈
  useEffect(() => {
    if (prevStatus.current === 'playing' && status !== 'playing') {
      const won = status === 'won'
      setStats(recordResult({ won, attempts }))
      if (isDaily && dailyKey) {
        try {
          localStorage.setItem(
            `daily-done-${dailyKey}`,
            JSON.stringify({ won, attempts, timeMs: elapsedMs, evaluations, dateKey: dailyKey }),
          )
        } catch { /* noop */ }
        setDailyDone(true)
      }
      const delay = slots * 180 + 600
      const t = setTimeout(() => setResultOpen(true), delay)
      prevStatus.current = status
      return () => clearTimeout(t)
    }
    prevStatus.current = status
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, slots])

  // Enter: 미완성 / 사전에 없는 단어면 흔들기 + 토스트
  const handleEnter = useCallback(() => {
    if (status !== 'playing') return
    const shake = () => {
      setShakeRow(attempts)
      setTimeout(() => setShakeRow(-1), 450)
    }
    if (currentLength !== slots) {
      shake()
      showToast('낱자를 모두 채워주세요!')
      return
    }
    if (!isValidGuess(current, slots)) {
      shake()
      showToast('사전에 없는 단어예요 🤔 (행 초기화)')
      setTimeout(() => clearCurrent(), 320) // 흔들림 후 해당 행 비우기
      return
    }
    pressEnter()
  }, [status, currentLength, slots, attempts, current, pressEnter, clearCurrent, showToast])

  const handleStart = (nick, mode) => {
    setNickname(nick)
    setSubmittedId(null)
    if (mode === 'daily') {
      const key = getDailyKey()
      setDailyDone(!!localStorage.getItem(`daily-done-${key}`))
      beginDaily(key)
    } else {
      begin()
    }
  }
  const handleShare = async () => {
    const text = buildShareText({
      stage, attempts, maxRows, timeMs: elapsedMs, evaluations,
      won: status === 'won', dailyKey: isDaily ? dailyKey : undefined,
    })
    const r = await shareResult(text)
    if (r === 'copied') showToast('결과 복사 완료! 붙여넣기 해보세요 📋')
    else if (r === 'shared') showToast('공유 완료! 🎉')
    else if (r === 'fail') showToast('복사에 실패했어요 😢')
  }
  const shareSaved = async (saved) => {
    const text = buildShareText({
      stage: 1, attempts: saved.attempts, maxRows, timeMs: saved.timeMs,
      evaluations: saved.evaluations || [], won: saved.won, dailyKey: saved.dateKey,
    })
    const r = await shareResult(text)
    if (r === 'copied') showToast('결과 복사 완료! 📋')
    else if (r === 'shared') showToast('공유 완료! 🎉')
    else if (r === 'fail') showToast('복사에 실패했어요 😢')
  }
  const submitDaily = async () => {
    if (status !== 'won' || dailyBusy) return
    setDailyBusy(true)
    try {
      const id = await submitDailyScore({ nickname, dateKey: dailyKey, attempts, timeMs: elapsedMs })
      setSubmittedId(id)
      setDailyDone(true)
      showToast('데일리 랭킹 등록 완료! 🏆')
    } catch (e) {
      if (e?.code === 'permission-denied') {
        setDailyDone(true)
        showToast('이 닉네임은 오늘 이미 참여했어요 🙅')
      } else {
        showToast('등록 실패 😢 잠시 후 다시 시도해주세요')
      }
    } finally {
      setDailyBusy(false)
    }
  }
  const goChallenge = () => { setResultOpen(false); setSubmittedId(null); startChallenge() }
  const goRetry = () => { setResultOpen(false); setSubmittedId(null); retrySameMode() }
  const goRestart = () => { setResultOpen(false); setSubmittedId(null); restart() }
  const goIntro = () => { setResultOpen(false); setSubmittedId(null); exitToIntro() }

  const isWon = status === 'won'
  const isLost = status === 'lost'
  const canChallenge = isWon && stage === 1 && !isDaily
  const mascotMood = isWon ? 'happy' : isLost ? 'sad' : 'idle'
  const winRow = isWon ? attempts - 1 : -1

  // 인트로: 닉네임 입력 후 시작. 데일리 이미 참여했으면 랭킹 열람만.
  if (!started) {
    const savedDaily = readSavedDaily(getDailyKey())
    return (
      <>
        <IntroScreen
          onStart={handleStart}
          onViewDaily={() => setDailyViewOpen(true)}
          stats={stats}
          defaultNick={nickname}
        />
        {toast && <div className={styles.globalToast} role="status">{toast}</div>}
        <Modal
          open={dailyViewOpen}
          title={`daily-${getDailyKey()}`}
          onClose={() => setDailyViewOpen(false)}
        >
          <div className={styles.result}>
            <Mascot mood="idle" size={84} />
            <h2 className={styles.resultTitle}>오늘의 챌린지 랭킹 📅</h2>
            <p className={styles.resultDesc}>
              오늘은 이미 참여했어요 — <b className={styles.answerWord}>랭킹만 확인</b>할 수 있어요.
            </p>
            {savedDaily && (
              <div className={styles.resultStats}>
                <span>{savedDaily.won ? '✅ 성공' : '❌ 실패'}</span>
                {savedDaily.won && <span>🎯 {savedDaily.attempts}번</span>}
                {savedDaily.won && <span>⏱ {formatTime(savedDaily.timeMs)}</span>}
              </div>
            )}
            {savedDaily?.evaluations?.length > 0 && (
              <button
                className={`${styles.btn} ${styles.btnShare}`}
                onClick={() => shareSaved(savedDaily)}
                style={{ marginTop: 10 }}
              >
                📋 결과 공유하기
              </button>
            )}
            <div className={styles.resultRanking}>
              <DailyBoard dateKey={getDailyKey()} compact />
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <div className={styles.app}>
      {/* ===== 헤더 ===== */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <Mascot mood={mascotMood} size={54} />
          <div className={styles.brandText}>
            <h1 className={styles.logo}>
              <span className={styles.prompt}>{'>'}</span> 자모 워들
              <span className={styles.cursor}>_</span>
            </h1>
            <p className={styles.tagline}>
              <b className={styles.nickTag}>{nickname}</b>님, 낱자를 맞춰라! ᕕ( ᐛ )ᕗ
            </p>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>MODE</span>
            <span className={`${styles.statValue} ${(stage >= 2 || isDaily) ? styles.hot : ''}`}>
              {isDaily ? '📅 데일리' : stageLabel(stage)}
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>TRY</span>
            <span className={styles.statValue}>{attempts}/{maxRows}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>TIME</span>
            <span className={styles.statValue}>{formatTime(elapsedMs)}</span>
          </div>
        </div>
      </header>

      {/* ===== 본문: 게임 (랭킹은 인트로/결과 화면에서만 노출) ===== */}
      <main className={styles.main}>
        <div className={styles.gameCol}>
          <div className={styles.toastSlot}>
            {toast && <div className={styles.toast} role="status">{toast}</div>}
          </div>
          <Board grid={grid} slots={slots} shakeRow={shakeRow} winRow={winRow} lost={isLost} />

          <div className={styles.tools}>
            <button
              className={styles.hintBtn}
              onClick={useHint}
              disabled={status !== 'playing' || hintUsed || currentLength >= slots}
              title="다음 칸의 정답 자모를 1개 알려줘요 (스테이지당 1회 · +30초)"
            >
              💡 힌트 {hintUsed ? '사용함' : '(−30초)'}
            </button>
            {penaltyMs > 0 && (
              <span className={styles.penalty}>페널티 +{Math.round(penaltyMs / 1000)}초</span>
            )}
          </div>

          <Keyboard
            keyStates={keyStates}
            onKey={pressKey}
            onDelete={pressDelete}
            onEnter={handleEnter}
            disabled={status !== 'playing'}
          />
          {status !== 'playing' && (
            <button className={styles.reopenBtn} onClick={() => setResultOpen(true)}>
              🏆 결과 · 랭킹 다시 보기
            </button>
          )}
          <p className={styles.credit}>made with 💚 by <b>Hyunwoo</b></p>
        </div>
      </main>

      {/* ===== 결과 모달 ===== */}
      <Modal
        open={resultOpen}
        title={isWon ? 'success.sh' : 'gameover.log'}
        onClose={() => setResultOpen(false)}
      >
        {isWon && <ConfettiBurst />}
        <div className={styles.result}>
          <Mascot mood={mascotMood} size={110} className={styles.resultMascot} />

          {isWon ? (
            <>
              <h2 className={styles.resultTitle}>
                {isDaily ? '오늘의 챌린지 성공! 🎯' : stage >= 2 ? '챌린지 정복! 🏆' : '정답이에요! 🎉'}
              </h2>
              <p className={styles.resultDesc}>
                정답은 <b className={styles.answerWord}>{answer}</b>
                <span className={styles.answerJamo}>({decomposeWord(answer).join(' ')})</span>
              </p>
              <div className={styles.resultStats}>
                <span>🎯 {attempts}번 시도</span>
                <span>⏱ {formatTime(elapsedMs)}</span>
                <span>🏅 {isDaily ? `데일리 #${dailyKey}` : stageLabel(stage)}</span>
              </div>
            </>
          ) : (
            <>
              <h2 className={styles.resultTitle}>아쉬워요… 다음엔 꼭! 🥲</h2>
              <p className={styles.resultDesc}>
                정답은 <b className={styles.answerWord}>{answer}</b>
                <span className={styles.answerJamo}>({decomposeWord(answer).join(' ')})</span>
                {' '}이었어요.
              </p>
            </>
          )}

          <div className={styles.resultBtns}>
            {canChallenge && (
              <button className={`${styles.btn} ${styles.btnHot}`} onClick={goChallenge}>
                🔥 6칸 챌린지 도전!
              </button>
            )}

            {/* 데일리 모드: 하루 1회 등록 / 일반 모드: 랭킹 등록 모달 */}
            {isDaily ? (
              isWon && (
                dailyDone ? (
                  <div className={styles.dailyDoneNote}>오늘의 챌린지 참여 완료 ✓</div>
                ) : (
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={submitDaily}
                    disabled={dailyBusy}
                  >
                    {dailyBusy ? '등록 중…' : '🏆 데일리 랭킹 등록 (하루 1회)'}
                  </button>
                )
              )
            ) : (
              bestResult && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setRegisterOpen(true)}>
                  🏆 랭킹 등록하기
                </button>
              )
            )}

            <button className={`${styles.btn} ${styles.btnShare}`} onClick={handleShare}>
              📋 결과 공유하기
            </button>

            {isDaily ? (
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goIntro}>↩ 메인으로</button>
            ) : (
              <>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goRetry}>🔄 같은 모드 다시</button>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goRestart}>↩ 처음부터</button>
              </>
            )}
          </div>

          <div className={styles.resultRanking}>
            <Stats stats={stats} highlight={isWon ? attempts : -1} compact />
          </div>

          <div className={styles.resultRanking}>
            {isDaily
              ? <DailyBoard dateKey={dailyKey} highlightId={submittedId} compact />
              : <Leaderboard highlightId={submittedId} compact />}
          </div>
        </div>
      </Modal>

      {/* ===== 랭킹 등록 모달 ===== */}
      <RegisterModal
        open={registerOpen}
        best={bestResult}
        defaultNick={nickname}
        onClose={() => setRegisterOpen(false)}
        onDone={(id) => { setSubmittedId(id); setRegisterOpen(false) }}
      />
    </div>
  )
}

// ---- 랭킹 등록 폼 모달 --------------------------------------------------------
function RegisterModal({ open, best, defaultNick, onClose, onDone }) {
  const [nickname, setNickname] = useState(defaultNick || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setNickname(defaultNick || '')
      setError('')
      setBusy(false)
    }
  }, [open, defaultNick])

  const submit = async (e) => {
    e.preventDefault()
    if (!best || busy) return
    const nick = nickname.trim()
    if (nick.length === 0) {
      setError('닉네임을 입력해 주세요!')
      return
    }
    setBusy(true)
    setError('')
    try {
      const ref = await submitScore({
        nickname: nick,
        stage: best.stage,
        attempts: best.attempts,
        timeMs: best.timeMs,
      })
      onDone(ref.id)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[submit] 실패:', err)
      setError('등록에 실패했어요. 잠시 후 다시 시도해 주세요.')
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="submit-score" onClose={onClose} closable={!busy}>
      <form className={styles.register} onSubmit={submit}>
        <Mascot mood="idle" size={72} />
        <h2 className={styles.registerTitle}>랭킹에 이름을 남겨요 ✍️</h2>
        {best && (
          <p className={styles.registerInfo}>
            {stageLabel(best.stage)} · {best.attempts}회 · {formatTime(best.timeMs)}
          </p>
        )}
        <input
          className={styles.input}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="익명 닉네임 (최대 12자)"
          maxLength={12}
          autoFocus
          disabled={busy}
        />
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.registerBtns}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>
            {busy ? '등록 중…' : '등록!'}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose} disabled={busy}>
            닫기
          </button>
        </div>
      </form>
    </Modal>
  )
}
