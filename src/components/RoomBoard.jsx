// -----------------------------------------------------------------------------
// RoomBoard — 커스텀 방 결과 보드(시도 적은 순 → 먼저 제출한 순)
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { subscribeRoomAttempts } from '../services/rooms'
import { rankBadge } from '../utils/format'
import styles from '../styles/Leaderboard.module.css'

export default function RoomBoard({ roomId, highlightId, compact = false }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const unsub = subscribeRoomAttempts(
      roomId,
      (data) => { setRows(data); setStatus('ready') },
      () => setStatus('error'),
    )
    return () => unsub()
  }, [roomId])

  return (
    <section className={`${styles.wrap} ${compact ? styles.compact : ''}`} aria-label="방 랭킹">
      <header className={styles.head}>
        <h2 className={styles.title}>
          <span className={styles.prompt}>$</span> room --{roomId}
        </h2>
        <span className={styles.live}><i className={styles.dot} /> LIVE</span>
      </header>

      {status === 'loading' && <p className={styles.hint}>불러오는 중… <span className={styles.blink}>▍</span></p>}
      {status === 'error' && <p className={styles.error}>랭킹을 불러오지 못했어요 (색인 생성 중일 수 있어요)</p>}
      {status === 'ready' && rows.length === 0 && (
        <p className={styles.empty}>이 방의 첫 도전자가 되어보세요! 🎯</p>
      )}
      {status === 'ready' && rows.length > 0 && (
        <ol className={styles.list}>
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`${styles.item} ${row.id === highlightId ? styles.mine : ''} ${i < 3 ? styles.top3 : ''}`}
            >
              <span className={styles.rank}>{rankBadge(i)}</span>
              <span className={styles.nick} title={row.nickname}>{row.nickname}</span>
              <span className={styles.stat}>{row.won ? `${row.attempts}회` : '실패'}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
