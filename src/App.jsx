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
import Profile from './components/Profile'
import SuggestWordModal from './components/SuggestWordModal'
import Shop from './components/Shop'
import CreateRoomModal from './components/CreateRoomModal'
import RoomBoard from './components/RoomBoard'
import XpBar from './components/XpBar'
import { useWordleGame } from './hooks/useWordleGame'
import { submitDailyScore } from './services/ranking'
import { recordParticipation, getPlayerStats, checkIn, purchaseItem } from './services/players'
import { getRoom, submitRoomAttempt } from './services/rooms'
import { isValidGuess, preloadGuessDict } from './constants/words'
import { stageLabel } from './utils/format'
import { buildShareText, shareResult } from './utils/share'
import { getDailyKey } from './utils/daily'
import { loadStats, recordResult } from './utils/stats'
import { checkAndUnlock, checkAndUnlockCheckin } from './utils/achievements'
import { CHECKIN_XP_BONUS } from './utils/checkin'
import { decomposeWord } from './utils/hangul'
import { deobfuscate } from './utils/secret'
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

// 레벨 시스템 개편 공지 — 버전 문자열을 바꾸면 다시 한 번 노출된다.
const NOTICE_KEY = 'notice-level-system-v1'

export default function App() {
  const game = useWordleGame()
  const {
    started, isDaily, dailyKey, isRoom, roomId, slots, stage, status, keyStates, attempts, maxRows, grid, evaluations,
    current, currentLength, answer, hintUsed,
    begin, beginDaily, beginRoom, pressKey, pressDelete, clearCurrent, useHint, pressEnter,
    retrySameMode, exitToIntro,
  } = game

  const [nickname, setNickname] = useState('')
  const [shakeRow, setShakeRow] = useState(-1)
  const [toast, setToast] = useState('')
  const [resultOpen, setResultOpen] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [dailyDone, setDailyDone] = useState(false)
  const [dailyViewOpen, setDailyViewOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [createRoomOpen, setCreateRoomOpen] = useState(false)
  const [pendingRoom, setPendingRoom] = useState(null) // ?room= 링크로 들어왔을 때 { roomId, slots, creatorNickname, word }
  const [roomLoadError, setRoomLoadError] = useState(false)
  const [joinNick, setJoinNick] = useState('')
  const [regState, setRegState] = useState('idle') // idle|submitting|done|already|error
  const [stats, setStats] = useState(loadStats)
  const [playerStats, setPlayerStats] = useState(null) // { totalPlayed, totalWon, accuracyBp, level }
  const prevStatus = useRef('playing')
  const toastTimer = useRef(null)
  const regParams = useRef(null) // 자동 등록에 쓸 이번 판 성적

  // 추측 사전을 백그라운드로 미리 로드(닉네임 입력 동안 준비 완료되게)
  useEffect(() => {
    preloadGuessDict()
  }, [])

  // 레벨 시스템 개편 공지 — 접속 시 한 번만 노출
  useEffect(() => {
    try {
      if (!localStorage.getItem(NOTICE_KEY)) {
        setNoticeOpen(true)
        localStorage.setItem(NOTICE_KEY, '1')
      }
    } catch { /* noop */ }
  }, [])

  // ?room=코드 링크로 들어왔으면 방 정보를 조회해 참가 화면을 준비한다.
  useEffect(() => {
    const roomIdParam = new URLSearchParams(window.location.search).get('room')
    if (!roomIdParam) return
    getRoom(roomIdParam)
      .then((data) => {
        if (!data) { setRoomLoadError(true); return }
        setPendingRoom({
          roomId: roomIdParam,
          slots: data.slots,
          creatorNickname: data.creatorNickname,
          word: deobfuscate(data.answerEnc),
        })
      })
      .catch(() => setRoomLoadError(true))
  }, [])

  // 짧은 안내 토스트
  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 1500)
  }, [])

  // 데일리 랭킹 자동 등록 (regParams.current 기준). 실패 시 재시도 버튼에서도 호출.
  const autoRegister = useCallback(async () => {
    const p = regParams.current
    if (!p) return
    setRegState('submitting')
    try {
      const id = await submitDailyScore({
        nickname: p.nickname, dateKey: p.dailyKey, attempts: p.attempts,
      })
      setSubmittedId(id)
      setDailyDone(true)
      setRegState('done')
      showToast('데일리 랭킹 자동 등록! 🏆')
    } catch (e) {
      if (e?.code === 'permission-denied') {
        setDailyDone(true)
        setRegState('already')
      } else {
        // eslint-disable-next-line no-console
        console.error('[auto-register] 실패:', e)
        setRegState('error')
      }
    }
  }, [showToast])

  // 승패 전환 시: 통계 기록 + (데일리면) 참여 잠금 저장 + 승리 시 데일리 랭킹 자동 등록
  //  + 레벨 프로필 갱신(승패 무관, 모든 모드에서 참여로 집계) + 업적 판정 + 결과 모달 오픈
  useEffect(() => {
    if (prevStatus.current === 'playing' && status !== 'playing') {
      const won = status === 'won'

      // 커스텀 방은 완전히 별도 흐름 — 친구가 고른 단어라 난이도 가정이 깨지므로
      // XP/포인트/업적/로컬 통계 어디에도 반영하지 않고 방 랭킹에만 기록한다.
      if (isRoom && roomId) {
        submitRoomAttempt({ roomId, nickname, attempts, won }).catch((e) => {
          if (e?.code !== 'permission-denied') {
            // eslint-disable-next-line no-console
            console.error('[submitRoomAttempt] 실패:', e)
          }
        })
        const roomDelay = slots * 180 + 600
        const roomTimer = setTimeout(() => setResultOpen(true), roomDelay)
        prevStatus.current = status
        return () => clearTimeout(roomTimer)
      }

      const nextLocalStats = recordResult({ won, attempts, slots })
      setStats(nextLocalStats)
      if (isDaily && dailyKey) {
        try {
          localStorage.setItem(
            `daily-done-${dailyKey}`,
            JSON.stringify({ won, attempts, evaluations, dateKey: dailyKey }),
          )
        } catch { /* noop */ }
        setDailyDone(true)
      }
      if (won && isDaily) {
        regParams.current = { nickname, dailyKey, attempts }
        autoRegister()
      } else {
        setRegState('idle')
      }
      const prevLevel = playerStats?.level ?? 1
      recordParticipation({ nickname, won, slots })
        .then((next) => {
          setPlayerStats(next)
          const newBadges = checkAndUnlock({
            won, slots,
            streak: nextLocalStats.streak,
            totalPlayed: next.totalPlayed,
            level: next.level,
            accuracyBp: next.accuracyBp,
          })
          const messages = []
          if (next.level > prevLevel) messages.push(`🎉 레벨업! Lv.${next.level}`)
          if (newBadges.length > 0) messages.push(`🏅 ${newBadges.map((b) => b.name).join(', ')}`)
          if (messages.length > 0) showToast(messages.join(' · '))
        })
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error('[recordParticipation] 실패:', e)
        })
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

  const handleStart = (nick, mode, pickedSlots = 5) => {
    setNickname(nick)
    setSubmittedId(null)
    getPlayerStats(nick).then(setPlayerStats).catch(() => {})
    if (mode === 'daily') {
      const key = getDailyKey()
      setDailyDone(!!localStorage.getItem(`daily-done-${key}`))
      beginDaily(key)
    } else {
      begin(pickedSlots)
    }
  }
  // 방 링크로 들어온 경우: 닉네임 입력 후 참가.
  const joinRoom = () => {
    const v = joinNick.trim()
    if (!v) {
      showToast('닉네임을 입력해 주세요!')
      return
    }
    const nick = v.slice(0, 12)
    setNickname(nick)
    setSubmittedId(null)
    getPlayerStats(nick).then(setPlayerStats).catch(() => {})
    beginRoom(pendingRoom.roomId, pendingRoom.word, pendingRoom.slots)
  }

  // 인트로에서 "커스텀 방 만들기" 클릭 — 닉네임을 먼저 확정하고 생성 모달을 연다.
  const handleOpenCreateRoom = (nick) => {
    setNickname(nick)
    setCreateRoomOpen(true)
  }
  // 방 생성 직후 "지금 플레이하기" — 생성자도 자기 방에 바로 참가.
  const handlePlayOwnRoom = (newRoomId, word, roomSlots) => {
    setCreateRoomOpen(false)
    setSubmittedId(null)
    getPlayerStats(nickname).then(setPlayerStats).catch(() => {})
    beginRoom(newRoomId, word, roomSlots)
  }

  const handleShare = async () => {
    const text = buildShareText({
      stage, attempts, maxRows, evaluations,
      won: status === 'won', dailyKey: isDaily ? dailyKey : undefined,
    })
    const r = await shareResult(text)
    if (r === 'copied') showToast('결과 복사 완료! 붙여넣기 해보세요 📋')
    else if (r === 'shared') showToast('공유 완료! 🎉')
    else if (r === 'fail') showToast('복사에 실패했어요 😢')
  }
  const shareSaved = async (saved) => {
    const text = buildShareText({
      stage: 1, attempts: saved.attempts, maxRows,
      evaluations: saved.evaluations || [], won: saved.won, dailyKey: saved.dateKey,
    })
    const r = await shareResult(text)
    if (r === 'copied') showToast('결과 복사 완료! 📋')
    else if (r === 'shared') showToast('공유 완료! 🎉')
    else if (r === 'fail') showToast('복사에 실패했어요 😢')
  }
  const goRetry = () => { setResultOpen(false); setSubmittedId(null); retrySameMode() }
  const goIntro = () => { setResultOpen(false); setSubmittedId(null); exitToIntro() }

  // 출석 체크 — 오늘 첫 시도면 서버에 반영하고 XP/스트릭 갱신, 업적 판정.
  const handleCheckIn = useCallback(async () => {
    try {
      const next = await checkIn({ nickname })
      setPlayerStats(next)
      const newBadges = checkAndUnlockCheckin({ checkinStreak: next.checkinStreak })
      const messages = [`📅 출석 체크 완료! +${CHECKIN_XP_BONUS} XP (🔥${next.checkinStreak}일)`]
      if (newBadges.length > 0) messages.push(`🏅 ${newBadges.map((b) => b.name).join(', ')}`)
      showToast(messages.join(' · '))
    } catch (e) {
      if (e?.message === 'ALREADY_CHECKED_IN') {
        showToast('오늘은 이미 체크인했어요 🌙')
      } else if (e?.message === 'NO_PLAYER_YET') {
        showToast('먼저 한 판 플레이해야 체크인할 수 있어요 🎮')
      } else {
        // eslint-disable-next-line no-console
        console.error('[checkIn] 실패:', e)
        showToast('체크인에 실패했어요 😢')
      }
    }
  }, [nickname, showToast])

  // 상점 구매 — 성공 시 playerStats 갱신, 실패 사유는 Shop 컴포넌트가 메시지로 보여줌(그대로 던짐).
  const handlePurchase = useCallback(async (itemId) => {
    const next = await purchaseItem({ nickname, itemId })
    setPlayerStats(next)
    showToast('구매 완료! 🛒')
  }, [nickname, showToast])

  const isWon = status === 'won'
  const isLost = status === 'lost'
  const mascotMood = isWon ? 'happy' : isLost ? 'sad' : 'idle'
  const winRow = isWon ? attempts - 1 : -1
  const mySkin = playerStats?.ownedSkinRobot ? 'robot' : playerStats?.ownedSkinCat ? 'cat' : 'default'

  // 인트로: 닉네임 입력 후 시작. 데일리 이미 참여했으면 랭킹 열람만.
  if (!started) {
    // 방 링크(?room=코드)로 들어온 경우: 일반 인트로 대신 참가 화면을 보여준다.
    if (pendingRoom) {
      return (
        <div className={styles.app}>
          <div className={styles.result} style={{ maxWidth: 420, margin: '60px auto' }}>
            <Mascot mood="idle" size={100} />
            <h2 className={styles.resultTitle}>{pendingRoom.creatorNickname}님의 방에 초대됐어요! 🔗</h2>
            <p className={styles.resultDesc}>{pendingRoom.slots}칸 단어 맞히기 — 참가할 닉네임을 입력해 주세요</p>
            <input
              className={styles.input}
              value={joinNick}
              onChange={(e) => setJoinNick(e.target.value)}
              placeholder="닉네임"
              maxLength={12}
              autoFocus
            />
            <div className={styles.registerBtns} style={{ marginTop: 10 }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={joinRoom}>🎮 참가하기</button>
            </div>
          </div>
          {toast && <div className={styles.globalToast} role="status">{toast}</div>}
        </div>
      )
    }
    const savedDaily = readSavedDaily(getDailyKey())
    return (
      <>
        {roomLoadError && (
          <div className={styles.globalToast} role="status">
            방을 찾을 수 없어요 — 만료됐거나 잘못된 링크예요 😢
          </div>
        )}
        <IntroScreen
          onStart={handleStart}
          onViewDaily={() => setDailyViewOpen(true)}
          onCreateRoom={handleOpenCreateRoom}
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
        <Modal
          open={noticeOpen}
          title="notice"
          onClose={() => setNoticeOpen(false)}
        >
          <div className={styles.result}>
            <Mascot mood="happy" size={72} />
            <h2 className={styles.resultTitle}>랭킹이 레벨 시스템으로 바뀌었어요 🆙</h2>
            <p className={styles.resultDesc}>
              이제 <b className={styles.answerWord}>시간 제한이 없어요</b> — 편하게 풀어보세요.
              <br />
              <b className={styles.answerWord}>참여할수록 레벨업</b>, <b className={styles.answerWord}>정답률</b>로
              등급이 매겨지는 영구 랭킹으로 바뀌었고, 기존 주간 랭킹은 초기화됐어요.
              <br />
              새로운 <b className={styles.answerWord}>7칸 마스터 모드</b>도 추가됐어요!
            </p>
            <button
              className={styles.btn}
              onClick={() => setNoticeOpen(false)}
              style={{ marginTop: 10 }}
            >
              확인했어요
            </button>
          </div>
        </Modal>
        <Modal
          open={createRoomOpen}
          title="create-room"
          onClose={() => setCreateRoomOpen(false)}
        >
          <CreateRoomModal
            nickname={nickname}
            onDone={() => setCreateRoomOpen(false)}
            onPlay={handlePlayOwnRoom}
          />
        </Modal>
      </>
    )
  }

  return (
    <div className={styles.app}>
      {/* ===== 헤더 ===== */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <Mascot mood={mascotMood} size={54} skin={mySkin} />
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
            <span className={`${styles.statValue} ${(stage >= 2 || isDaily || isRoom) ? styles.hot : ''}`}>
              {isDaily ? '📅 데일리' : isRoom ? '🔗 커스텀 방' : stageLabel(stage)}
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>TRY</span>
            <span className={styles.statValue}>{attempts}/{maxRows}</span>
          </div>
          <button
            type="button"
            className={`${styles.statBox} ${styles.statBoxBtn}`}
            onClick={() => setProfileOpen(true)}
            title="내 프로필 보기"
          >
            <span className={styles.statLabel}>LEVEL</span>
            <span className={styles.statValue}>Lv.{playerStats?.level ?? 1}</span>
            <XpBar xp={playerStats?.xp ?? 0} compact />
          </button>
          <button
            type="button"
            className={`${styles.statBox} ${styles.statBoxBtn}`}
            onClick={() => setShopOpen(true)}
            title="상점 열기"
          >
            <span className={styles.statLabel}>SHOP</span>
            <span className={styles.statValue}>🪙 {playerStats?.points ?? 0}</span>
          </button>
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
              title="다음 칸의 정답 자모를 1개 알려줘요 (스테이지당 1회)"
            >
              💡 힌트 {hintUsed ? '사용함' : ''}
            </button>
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
          <Mascot mood={mascotMood} size={110} className={styles.resultMascot} skin={mySkin} />

          {isWon ? (
            <>
              <h2 className={styles.resultTitle}>
                {isDaily ? '오늘의 챌린지 성공! 🎯' : isRoom ? '방 클리어! 🔗' : stage >= 2 ? '챌린지 정복! 🏆' : '정답이에요! 🎉'}
              </h2>
              <p className={styles.resultDesc}>
                정답은 <b className={styles.answerWord}>{answer}</b>
                <span className={styles.answerJamo}>({decomposeWord(answer).join(' ')})</span>
              </p>
              <div className={styles.resultStats}>
                <span>🎯 {attempts}번 시도</span>
                <span>🏅 {isDaily ? `데일리 #${dailyKey}` : isRoom ? `방 #${roomId}` : stageLabel(stage)}</span>
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
            {/* 데일리 승리 시 랭킹 자동 등록 상태 */}
            {isWon && isDaily && (
              <div className={`${styles.regStatus} ${styles['reg_' + regState] || ''}`}>
                {regState === 'submitting' && '랭킹 등록 중… ⏳'}
                {regState === 'done' && '🏆 랭킹에 자동 등록됐어요!'}
                {regState === 'already' && '오늘의 챌린지 참여 완료 ✓'}
                {regState === 'error' && (
                  <>
                    ⚠ 랭킹 등록 실패 — 익명 로그인을 확인해 주세요
                    <button className={styles.regRetry} onClick={autoRegister}>다시 시도</button>
                  </>
                )}
              </div>
            )}

            <button className={`${styles.btn} ${styles.btnShare}`} onClick={handleShare}>
              📋 결과 공유하기
            </button>
            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setProfileOpen(true)}>
              🪪 내 프로필
            </button>

            {isDaily || isRoom ? (
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goIntro}>🏠 홈으로</button>
            ) : (
              <>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goRetry}>🔄 같은 모드 다시</button>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={goIntro}>🏠 홈으로</button>
              </>
            )}
          </div>

          {!isRoom && (
            <div className={styles.resultRanking}>
              <Stats stats={stats} highlight={isWon ? attempts : -1} compact />
            </div>
          )}

          <div className={styles.resultRanking}>
            {isDaily
              ? <DailyBoard dateKey={dailyKey} highlightId={submittedId} compact />
              : isRoom
                ? <RoomBoard roomId={roomId} highlightId={`${roomId}__${nickname}`} compact />
                : <Leaderboard highlightId={nickname} compact />}
          </div>
        </div>
      </Modal>

      {/* ===== 프로필 모달 ===== */}
      <Modal
        open={profileOpen}
        title="profile"
        onClose={() => setProfileOpen(false)}
      >
        <Profile
          nickname={nickname}
          playerStats={playerStats}
          localStats={stats}
          onSuggestWord={() => setSuggestOpen(true)}
          onCheckIn={handleCheckIn}
          onOpenShop={() => setShopOpen(true)}
        />
      </Modal>

      {/* ===== 단어 제안 모달 ===== */}
      <Modal
        open={suggestOpen}
        title="suggest-word"
        onClose={() => setSuggestOpen(false)}
      >
        <SuggestWordModal nickname={nickname} onDone={() => setSuggestOpen(false)} />
      </Modal>

      {/* ===== 상점 모달 ===== */}
      <Modal
        open={shopOpen}
        title="shop"
        onClose={() => setShopOpen(false)}
      >
        <Shop playerStats={playerStats} onPurchase={handlePurchase} />
      </Modal>
    </div>
  )
}
