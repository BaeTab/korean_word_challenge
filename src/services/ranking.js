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
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../firebase'

const COL = 'rankings'
const DAILY_COL = 'daily'

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

// ---- 데일리 챌린지 랭킹 -------------------------------------------------------

/** 닉네임을 문서 ID로 안전하게 변환('/' 제거) */
function dailyNick(nickname) {
  return (nickname || '익명').trim().slice(0, 12).replace(/\//g, '／') || '익명'
}

/**
 * 데일리 점수 등록. 문서 ID = `날짜__닉네임` 으로 고정 → 규칙상 재생성(update) 불가.
 * 같은 닉네임+날짜로 이미 참여했으면 permission-denied 로 실패한다.
 * @param {{nickname:string, dateKey:string, attempts:number, timeMs:number}} entry
 * @returns {Promise<string>} 생성된 문서 ID
 */
export async function submitDailyScore(entry) {
  const user = await ensureAnonymousAuth()
  const nickname = dailyNick(entry.nickname)
  const id = `${entry.dateKey}__${nickname}`
  await setDoc(doc(db, DAILY_COL, id), {
    nickname,
    dateKey: entry.dateKey,
    attempts: entry.attempts,
    timeMs: entry.timeMs,
    uid: user.uid,
    createdAt: serverTimestamp(),
  })
  return id
}

/**
 * 특정 날짜의 데일리 랭킹 실시간 구독. (시도 적은 순 → 시간 짧은 순)
 * @param {string} dateKey 'YYYY-MM-DD'
 */
export function subscribeDailyRanking(dateKey, onData, onError, top = 10) {
  const q = query(
    collection(db, DAILY_COL),
    where('dateKey', '==', dateKey),
    orderBy('attempts', 'asc'),
    orderBy('timeMs', 'asc'),
    limit(top),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[daily] 구독 오류:', err)
      onError?.(err)
    },
  )
}
