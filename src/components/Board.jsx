// -----------------------------------------------------------------------------
// Board — 자모 게임판 (MAX_ROWS × slots)
//  - grid: hook 이 만들어 준 [행][칸] 배열
//  - 판정된 칸은 판정색을 정적으로 유지하고, "방금 제출된 행"만 순차 플립으로 공개한다.
//  - attempts: 제출된 행 수 → 마지막 제출 행(attempts-1)에만 flip 클래스를 부여해
//    이전 행이 다시 뒤집히지 않게 한다(재렌더에도 애니메이션이 끊기지 않음).
//  - winRow: 정답 행 → 플립이 끝난 뒤 타일 통통 튀는 승리 댄스
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

export default function Board({ grid, slots, attempts = 0, shakeRow = -1, winRow = -1, lost = false }) {
  // 방금 제출된 마지막 행만 플립 애니메이션을 재생한다(이전 행은 정적 판정색으로 유지).
  const flipRow = attempts > 0 ? attempts - 1 : -1
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
            r === flipRow ? styles.flipRow : '',
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
                  cell.state === 'filled' ? styles.pop : '',
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
