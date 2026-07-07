// -----------------------------------------------------------------------------
// App — 자모 워들 메인
//  인트로(닉네임 입력) → 게임판 + 가상 키보드 + 실시간 랭킹 + 결과/등록 모달.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useRef, useState } from 'react'
import Board from './components/Board'
import Keyboard from './components/Keyboard'
import Leaderboard from './components/Leaderboard'
import Modal from './components/Modal'
import Mascot from './components/Mascot'
import ConfettiBurst from './components/ConfettiBurst'
import IntroScreen from './components/IntroScreen'
import { useWordleGame } from './hooks/useWordleGame'
import { submitScore } from './services/ranking'
import { isValidGuess, preloadGuessDict } from './constants/words'
import { formatTime, stageLabel } from './utils/format'
import { buildShareText, shareResult } from './utils/share'
import { decomposeWord } from './utils/hangul'
import styles from './styles/App.module.css'

export default function App() {
  const game = useWordleGame()
  const {
    started, slots, stage, status, keyStates, attempts, maxRows, grid, evaluations,
    elapsedMs, current, currentLength, answer, bestResult, hintUsed, penaltyMs,
    begin, pressKey, pressDelete, clearCurrent, useHint, pressEnter, startChallenge, retrySameMode, restart,
  } = game

  const [nickname, setNickname] = useState('')
  const [shakeRow, setShakeRow] = useState(-1)
  const [toast, setToast] = useState('')
  const [resultOpen, setResultOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
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

  // 승패 전환 시 결과 모달 자동 오픈 (타일 뒤집기 애니메이션 후)
  useEffect(() => {
    if (prevStatus.current === 'playing' && status !== 'playing') {
      const delay = slots * 180 + 600
      const t = setTimeout(() => setResultOpen(true), delay)
      prevStatus.current = status
      return () => clearTimeout(t)
    }
    prevStatus.current = status
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

  const handleStart = (nick) => {
    setNickname(nick)
    begin()
  }
  const handleShare = async () => {
    const text = buildShareText({
      stage, attempts, maxRows, timeMs: elapsedMs, evaluations, won: status === 'won',
    })
    const r = await shareResult(text)
    if (r === 'copied') showToast('결과 복사 완료! 붙여넣기 해보세요 📋')
    else if (r === 'shared') showToast('공유 완료! 🎉')
    else if (r === 'fail') showToast('복사에 실패했어요 😢')
  }
  const goChallenge = () => { setResultOpen(false); setSubmittedId(null); startChallenge() }
  const goRetry = () => { setResultOpen(false); setSubmittedId(null); retrySameMode() }
  const goRestart = () => { setResultOpen(false); setSubmittedId(null); restart() }

  const isWon = status === 'won'
  const isLost = status === 'lost'
  const canChallenge = isWon && stage === 1
  const mascotMood = isWon ? 'happy' : isLost ? 'sad' : 'idle'
  const winRow = isWon ? attempts - 1 : -1

  // 인트로: 닉네임 입력 후 시작
  if (!started) {
    return <IntroScreen onStart={handleStart} defaultNick={nickname} />
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
            <span className={`${styles.statValue} ${stage >= 2 ? styles.hot : ''}`}>
              {stageLabel(stage)}
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
                {stage >= 2 ? '챌린지 정복! 🏆' : '정답이에요! 🎉'}
              </h2>
              <p className={styles.resultDesc}>
                정답은 <b className={styles.answerWord}>{answer}</b>
                <span className={styles.answerJamo}>({decomposeWord(answer).join(' ')})</span>
              </p>
              <div className={styles.resultStats}>
                <span>🎯 {attempts}번 시도</span>
                <span>⏱ {formatTime(elapsedMs)}</span>
                <span>🏅 {stageLabel(stage)}</span>
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
            {bestResult && (
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setRegisterOpen(true)}>
                🏆 랭킹 등록하기
              </button>
            )}
            <button className={`${styles.btn} ${styles.btnShare}`} onClick={handleShare}>
              📋 결과 공유하기
            </button>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goRetry}>🔄 같은 모드 다시</button>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goRestart}>↩ 처음부터</button>
          </div>

          <div className={styles.resultRanking}>
            <Leaderboard highlightId={submittedId} compact />
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
