// -----------------------------------------------------------------------------
// 데일리 챌린지 랭킹 서비스 (Firestore)
//  컬렉션: daily
//  문서 스키마: { nickname, dateKey, attempts, uid, createdAt, schemaVersion }
//  문서 ID: `dateKey__닉네임` → update 금지라 하루 1회 강제
//
//  정렬 기준: attempts 오름차순 → createdAt 오름차순(동점이면 먼저 제출한 사람 우선)
//
//  schemaVersion:2 — 구버전(시간요소 포함) 문서를 화면에서 배제하기 위한 태그.
//  기존 문서는 삭제하지 않고 그대로 두되, 조회 쿼리가 schemaVersion===2만 필터링한다.
//
//  (자유모드 랭킹은 레벨 시스템(src/services/players.js)으로 대체되어
//   기존 rankings 컬렉션은 더 이상 사용하지 않는다.)
// -----------------------------------------------------------------------------
import {
  doc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../firebase'

const DAILY_COL = 'daily'
const SCHEMA_VERSION = 2

/** 닉네임을 문서 ID 조각으로 안전하게 변환('/' 제거, 12자 제한). */
function safeNickname(nickname) {
  return (nickname || '익명').trim().slice(0, 12).replace(/\//g, '／') || '익명'
}

/**
 * 데일리 점수 등록. 문서 ID = `날짜__닉네임` 으로 고정 → 규칙상 재생성(update) 불가.
 * 같은 닉네임+날짜로 이미 참여했으면 permission-denied 로 실패한다.
 * @param {{nickname:string, dateKey:string, attempts:number}} entry
 * @returns {Promise<string>} 생성된 문서 ID
 */
export async function submitDailyScore(entry) {
  const user = await ensureAnonymousAuth()
  const nickname = safeNickname(entry.nickname)
  const id = `${entry.dateKey}__${nickname}`
  await setDoc(doc(db, DAILY_COL, id), {
    nickname,
    dateKey: entry.dateKey,
    attempts: entry.attempts,
    uid: user.uid,
    createdAt: serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  })
  return id
}

/**
 * 특정 날짜의 데일리 랭킹 실시간 구독. (시도 적은 순 → 먼저 제출한 순)
 * @param {string} dateKey 'YYYY-MM-DD'
 */
export function subscribeDailyRanking(dateKey, onData, onError, top = 10) {
  const q = query(
    collection(db, DAILY_COL),
    where('dateKey', '==', dateKey),
    where('schemaVersion', '==', SCHEMA_VERSION),
    orderBy('attempts', 'asc'),
    orderBy('createdAt', 'asc'),
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
