// -----------------------------------------------------------------------------
// 커스텀 방 서비스 (Firestore)
//  컬렉션: rooms/{roomId} — 방장이 고른 단어(난독화 저장), 칸수, 만료 시각.
//  컬렉션: roomAttempts/{roomId}__{nickname} — daily와 동일한 create-only 패턴으로
//    "방당·닉네임당 1회 제출"을 강제한다(재제출은 doc-ID 충돌로 permission-denied).
//
//  주의: answerEnc는 obfuscate()(고정 XOR)로 감싸지만, rooms 문서는 누구나 읽을 수
//  있어 브라우저 번들의 deobfuscate()를 그대로 돌리면 복구 가능하다 — "내 브라우저
//  안에서 훔쳐보기 방지" 용도지 서버 판정 수준의 비밀 유지는 아니다(README 참고).
//  Cloud Functions 없이는 원천 차단이 불가능해 이 수준으로 명시적으로 수용한다.
// -----------------------------------------------------------------------------
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../firebase'
import { obfuscate } from '../utils/secret'

const ROOMS_COL = 'rooms'
const ATTEMPTS_COL = 'roomAttempts'
const ROOM_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 혼동 문자(0/O/1/I/L) 제외
const ROOM_TTL_DAYS = 14

function safeNickname(nickname) {
  return (nickname || '익명').trim().slice(0, 12).replace(/\//g, '／') || '익명'
}

function randomRoomId() {
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += ROOM_ID_ALPHABET[Math.floor(Math.random() * ROOM_ID_ALPHABET.length)]
  }
  return id
}

/**
 * 커스텀 방 생성. 코드 충돌 시(극히 드묾) 최대 3회 재시도.
 * @param {{word:string, slots:number, creatorNickname:string}} p
 * @returns {Promise<string>} 생성된 roomId
 */
export async function createRoom({ word, slots, creatorNickname }) {
  const user = await ensureAnonymousAuth()
  const nick = safeNickname(creatorNickname)
  for (let attempt = 0; attempt < 3; attempt++) {
    const roomId = randomRoomId()
    try {
      await setDoc(doc(db, ROOMS_COL, roomId), {
        roomId,
        slots,
        answerEnc: obfuscate(word),
        creatorNickname: nick,
        creatorUid: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + ROOM_TTL_DAYS * 86400000),
      })
      return roomId
    } catch (e) {
      if (e?.code !== 'permission-denied' || attempt === 2) throw e
      // 코드 충돌(문서 이미 존재) — 새 코드로 재시도
    }
  }
  throw new Error('ROOM_CREATE_FAILED')
}

/**
 * 방 정보 1회 조회. 없거나 만료됐으면 null.
 * @param {string} roomId
 */
export async function getRoom(roomId) {
  const snap = await getDoc(doc(db, ROOMS_COL, roomId))
  if (!snap.exists()) return null
  const data = snap.data()
  if (data.expiresAt?.toMillis && data.expiresAt.toMillis() < Date.now()) return null
  return data
}

/**
 * 방 결과 제출. 이미 제출했으면(문서 충돌) permission-denied로 실패.
 * @param {{roomId:string, nickname:string, attempts:number, won:boolean}} p
 */
export async function submitRoomAttempt({ roomId, nickname, attempts, won }) {
  const user = await ensureAnonymousAuth()
  const nick = safeNickname(nickname)
  const id = `${roomId}__${nick}`
  await setDoc(doc(db, ATTEMPTS_COL, id), {
    roomId,
    nickname: nick,
    attempts,
    won,
    uid: user.uid,
    createdAt: serverTimestamp(),
  })
  return id
}

/**
 * 방 랭킹(시도 적은 순 → 먼저 제출한 순) 실시간 구독.
 * @param {string} roomId
 */
export function subscribeRoomAttempts(roomId, onData, onError, top = 20) {
  const q = query(
    collection(db, ATTEMPTS_COL),
    where('roomId', '==', roomId),
    orderBy('attempts', 'asc'),
    orderBy('createdAt', 'asc'),
    limit(top),
  )
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => {
      // eslint-disable-next-line no-console
      console.error('[rooms] 구독 오류:', err)
      onError?.(err)
    },
  )
}
