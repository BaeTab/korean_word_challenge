// -----------------------------------------------------------------------------
// Board — 자모 게임판 (MAX_ROWS × slots)
//  - grid: hook 이 만들어 준 [행][칸] 배열
//  - 제출된 칸은 뒤집기(flip) 애니메이션으로 판정색 노출
//  - winRow: 정답 행 → 타일 통통 튀는 승리 댄스
//  - lost: 실패 시 보드 전체 흔들림
// -----------------------------------------------------------------------------
import styles from '../styles/Board.module.css'

const STATE_CLASS = {
  correct: styles.correct,
  present: styles.present,
  absent: styles.absent,
  filled: styles.filled,
  empty: styles.empty,
}

export default function Board({ grid, slots, shakeRow = -1, winRow = -1, lost = false }) {
  return (
    <div
      className={`${styles.board} ${lost ? styles.lost : ''}`}
      style={{ '--slots': slots }}
      role="grid"
      aria-label="자모 게임판"
    >
      {grid.map((row, r) => (
        <div
          key={r}
          className={[
            styles.row,
            r === shakeRow ? styles.shake : '',
            r === winRow ? styles.win : '',
          ].join(' ')}
          role="row"
        >
          {row.map((cell, c) => {
            const revealed =
              cell.state === 'correct' || cell.state === 'present' || cell.state === 'absent'
            return (
              <div
                key={c}
                role="gridcell"
                className={[
                  styles.tile,
                  STATE_CLASS[cell.state] || '',
                  revealed ? styles.revealed : '',
                  cell.jamo ? styles.pop : '',
                ].join(' ')}
                style={{ '--i': c }}
                aria-label={cell.jamo || '빈칸'}
              >
                <span className={styles.glyph}>{cell.jamo}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
