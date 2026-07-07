// -----------------------------------------------------------------------------
// 랭킹 서비스 (Firestore)
//  컬렉션: rankings
//  문서 스키마: { nickname, stage, attempts, timeMs, uid, createdAt }
//
//  랭킹 정렬 기준(요구사항):
//   1순위: stage 내림차순   (6칸 챌린지 클리어 > 5칸 기본 클리어)
//   2순위: attempts 오름차순 (시도 횟수 적을수록 상위)
//   3순위: timeMs 오름차순   (걸린 시간 짧을수록 상위)
// -----------------------------------------------------------------------------
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../firebase'

const COL = 'rankings'

/**
 * 점수 등록. 익명 로그인 보장 후 문서를 추가한다.
 * @param {{ nickname:string, stage:number, attempts:number, timeMs:number }} entry
 */
export async function submitScore(entry) {
  const user = await ensureAnonymousAuth()
  const nickname = (entry.nickname || '익명').trim().slice(0, 12) || '익명'
  return addDoc(collection(db, COL), {
    nickname,
    stage: entry.stage,
    attempts: entry.attempts,
    timeMs: entry.timeMs,
    uid: user.uid,
    createdAt: serverTimestamp(),
  })
}

/**
 * 실시간 Top N 랭킹 구독.
 * @param {(rows:Array<object>)=>void} onData 정렬된 랭킹 배열 콜백
 * @param {(err:Error)=>void} [onError]
 * @param {number} [top=10]
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeTopRanking(onData, onError, top = 10) {
  const q = query(
    collection(db, COL),
    orderBy('stage', 'desc'),
    orderBy('attempts', 'asc'),
    orderBy('timeMs', 'asc'),
    limit(top),
  )
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      onData(rows)
    },
    (err) => {
      // 복합 인덱스가 아직 없으면 콘솔에 인덱스 생성 링크가 찍힌다.
      // eslint-disable-next-line no-console
      console.error('[ranking] 구독 오류:', err)
      onError?.(err)
    },
  )
}
