// -----------------------------------------------------------------------------
// 플레이어 레벨 프로필 서비스 (Firestore)
//  컬렉션: players
//  문서 스키마: { nickname, uid, totalPlayed, totalWon, accuracyBp, level, createdAt, updatedAt }
//  문서 ID: 닉네임(안전화) → 같은 닉네임을 쓰는 다른 사람과 기록을 공유(rankings와 동일한 기존 관례)
//
//  참여(승패 무관) 1판마다 totalPlayed+1, 승리 시 totalWon도 +1.
//  accuracyBp(만분율 정수)/level은 매 갱신마다 재계산해 함께 저장 —
//  Firestore가 group-by를 지원하지 않아 "레벨→정답률→참여횟수" 정렬을 위해
//  level도 실제 정렬 가능한 필드로 저장해야 한다.
//
//  랭킹 정렬 기준: level desc → accuracyBp desc → totalPlayed desc
// -----------------------------------------------------------------------------
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../firebase'
import { accuracyBpFrom, levelFromPlayed } from '../utils/level'

const COL = 'players'

/** 닉네임을 문서 ID 조각으로 안전하게 변환('/' 제거, 12자 제한). ranking.js와 동일 규칙. */
function safeNickname(nickname) {
  return (nickname || '익명').trim().slice(0, 12).replace(/\//g, '／') || '익명'
}

/**
 * 닉네임의 현재 레벨 프로필을 1회 조회. 없으면 null.
 * @param {string} nickname
 */
export async function getPlayerStats(nickname) {
  const snap = await getDoc(doc(db, COL, safeNickname(nickname)))
  return snap.exists() ? snap.data() : null
}

/**
 * 게임 종료(승패 무관) 시 참여 기록. 익명 로그인 보장 후 트랜잭션으로 누적치를 갱신한다.
 * @param {{ nickname:string, won:boolean }} p
 * @returns {Promise<object>} 갱신된 플레이어 문서
 */
export async function recordParticipation({ nickname, won }) {
  const user = await ensureAnonymousAuth()
  const nick = safeNickname(nickname)
  const ref = doc(db, COL, nick)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const old = snap.exists() ? snap.data() : { totalPlayed: 0, totalWon: 0, createdAt: null }
    const totalPlayed = old.totalPlayed + 1
    const totalWon = old.totalWon + (won ? 1 : 0)
    const next = {
      nickname: nick,
      uid: user.uid,
      totalPlayed,
      totalWon,
      accuracyBp: accuracyBpFrom(totalWon, totalPlayed),
      level: levelFromPlayed(totalPlayed),
      createdAt: snap.exists() ? old.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    tx.set(ref, next)
    return next
  })
}

/**
 * 실시간 Top N 플레이어 구독(레벨→정답률→참여횟수 순).
 * @param {(rows:Array<object>)=>void} onData
 * @param {(err:Error)=>void} [onError]
 * @param {number} [top=50]
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeTopPlayers(onData, onError, top = 50) {
  const q = query(
    collection(db, COL),
    orderBy('level', 'desc'),
    orderBy('accuracyBp', 'desc'),
    orderBy('totalPlayed', 'desc'),
    limit(top),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[players] 구독 오류:', err)
      onError?.(err)
    },
  )
}
