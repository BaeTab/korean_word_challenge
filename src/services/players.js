// -----------------------------------------------------------------------------
// 플레이어 레벨 프로필 서비스 (Firestore)
//  컬렉션: players
//  문서 스키마: { nickname, uid, totalPlayed, totalWon, accuracyBp, xp, level, createdAt, updatedAt }
//  문서 ID: 닉네임(안전화) → 같은 닉네임을 쓰는 다른 사람과 기록을 공유(rankings와 동일한 기존 관례)
//
//  참여(승패 무관) 1판마다 totalPlayed+1, 승리 시 totalWon도 +1, xp는 칸수·승패에 따라 증가.
//  accuracyBp(만분율 정수)/level은 매 갱신마다 재계산해 함께 저장 —
//  xp가 실질적인 성장 척도이며 level은 xp의 임계값 함수(src/utils/level.js) 그대로 저장.
//
//  랭킹 정렬 기준: xp desc → totalPlayed desc
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
import { accuracyBpFrom, levelFromXp, pointsForGame, xpForGame } from '../utils/level'
import { CHECKIN_XP_BONUS, isConsecutiveDay } from '../utils/checkin'
import { getDailyKey } from '../utils/daily'
import { SHOP_ITEMS } from '../constants/shop'

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
 * 승리 시 상점 포인트도 함께 적립(pointsForGame). 기존 문서 갱신은 tx.update()로
 * 변경 필드만 건드려 출석 체크/상점 필드(lastCheckinDate·checkinStreak·owned·equippedSkin)를
 * 실수로 지우지 않는다(§0 필드 고정 원칙 — 신규 필드가 계속 생겨도 안전).
 * @param {{ nickname:string, won:boolean, slots:number }} p
 * @returns {Promise<object>} 갱신된 플레이어 문서
 */
export async function recordParticipation({ nickname, won, slots }) {
  const user = await ensureAnonymousAuth()
  const nick = safeNickname(nickname)
  const ref = doc(db, COL, nick)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const old = snap.exists() ? snap.data() : { totalPlayed: 0, totalWon: 0, xp: 0, points: 0 }
    const totalPlayed = old.totalPlayed + 1
    const totalWon = old.totalWon + (won ? 1 : 0)
    const xp = (old.xp || 0) + xpForGame({ slots, won })
    const points = (old.points || 0) + pointsForGame({ slots, won })
    const level = levelFromXp(xp)
    const accuracyBp = accuracyBpFrom(totalWon, totalPlayed)

    if (snap.exists()) {
      const patch = { uid: user.uid, totalPlayed, totalWon, accuracyBp, xp, level, points, updatedAt: serverTimestamp() }
      tx.update(ref, patch)
      return { ...old, ...patch }
    }
    const next = {
      nickname: nick,
      uid: user.uid,
      totalPlayed,
      totalWon,
      accuracyBp,
      xp,
      level,
      points,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    tx.set(ref, next)
    return next
  })
}

/**
 * 상점 아이템 구매. 소유 아이템은 owned 맵(`{ [itemId]: true }`)에 누적 저장된다.
 * 잔여 포인트/미보유 여부는 클라이언트에서 먼저 확인하지만
 * 실질적 검증은 firestore.rules의 isValidShopPurchase가 담당한다.
 * @param {{ nickname:string, itemId:string }} p
 * @returns {Promise<object>} 갱신된 플레이어 문서
 */
export async function purchaseItem({ nickname, itemId }) {
  const item = SHOP_ITEMS.find((it) => it.id === itemId)
  if (!item) throw new Error('UNKNOWN_ITEM')
  const user = await ensureAnonymousAuth()
  const nick = safeNickname(nickname)
  const ref = doc(db, COL, nick)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('NO_PLAYER_YET')
    const old = snap.data()
    if (old.owned?.[itemId]) throw new Error('ALREADY_OWNED')
    if ((old.points || 0) < item.price) throw new Error('NOT_ENOUGH_POINTS')
    const patch = {
      uid: user.uid,
      points: (old.points || 0) - item.price,
      owned: { ...(old.owned || {}), [itemId]: true },
      updatedAt: serverTimestamp(),
    }
    tx.update(ref, patch)
    return { ...old, ...patch }
  })
}

/**
 * 보유한 스킨(또는 'default')을 장착. 무료. 미보유 스킨 장착은 클라이언트에서 막지만
 * 실질적 검증은 firestore.rules의 isValidEquipUpdate가 담당한다.
 * @param {{ nickname:string, skinId:string }} p
 * @returns {Promise<object>} 갱신된 플레이어 문서
 */
export async function equipSkin({ nickname, skinId }) {
  const user = await ensureAnonymousAuth()
  const nick = safeNickname(nickname)
  const ref = doc(db, COL, nick)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('NO_PLAYER_YET')
    const old = snap.data()
    if (skinId !== 'default' && !old.owned?.[skinId]) throw new Error('NOT_OWNED')
    const patch = { uid: user.uid, equippedSkin: skinId, updatedAt: serverTimestamp() }
    tx.update(ref, patch)
    return { ...old, ...patch }
  })
}

/**
 * 출석 체크. KST 기준 하루 1회, 고정 XP 보너스 지급. 최소 1판 플레이(문서 존재) 후에만 가능.
 * 이미 오늘 체크인했으면 에러를 던진다.
 * @param {{ nickname:string }} p
 * @returns {Promise<object>} 갱신된 플레이어 문서
 */
export async function checkIn({ nickname }) {
  const user = await ensureAnonymousAuth()
  const nick = safeNickname(nickname)
  const ref = doc(db, COL, nick)
  const todayKey = getDailyKey()
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('NO_PLAYER_YET')
    const old = snap.data()
    if (old.lastCheckinDate === todayKey) throw new Error('ALREADY_CHECKED_IN')
    const streak = isConsecutiveDay(old.lastCheckinDate) ? (old.checkinStreak || 0) + 1 : 1
    const xp = (old.xp || 0) + CHECKIN_XP_BONUS
    const patch = {
      uid: user.uid,
      xp,
      level: levelFromXp(xp),
      lastCheckinDate: todayKey,
      checkinStreak: streak,
      updatedAt: serverTimestamp(),
    }
    tx.update(ref, patch)
    return { ...old, ...patch }
  })
}

/**
 * 실시간 Top N 플레이어 구독(XP→참여횟수 순 — XP가 레벨을 결정하므로 사실상 레벨순).
 * @param {(rows:Array<object>)=>void} onData
 * @param {(err:Error)=>void} [onError]
 * @param {number} [top=50]
 * @returns {import('firebase/firestore').Unsubscribe}
 */
export function subscribeTopPlayers(onData, onError, top = 50) {
  const q = query(
    collection(db, COL),
    orderBy('xp', 'desc'),
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
