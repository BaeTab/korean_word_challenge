// -----------------------------------------------------------------------------
// 유저 단어 제안 서비스 (Firestore)
//  컬렉션: wordSuggestions
//  문서 스키마: { word, slots, nickname, uid, status:'pending', createdAt }
//  문서 ID: 자동 생성. 정답 풀은 빌드타임 정적 파일(constants/answers*.js)이라
//  여기 쌓인 제안은 자동으로 게임에 반영되지 않고, 개발자가 Firebase 콘솔에서
//  수동 검토 후 코드에 반영하는 큐 역할만 한다.
// -----------------------------------------------------------------------------
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../firebase'

const COL = 'wordSuggestions'

/** 닉네임을 안전하게 변환(12자 제한). players.js/ranking.js와 동일 규칙. */
function safeNickname(nickname) {
  return (nickname || '익명').trim().slice(0, 12).replace(/\//g, '／') || '익명'
}

/**
 * 단어 제안 제출.
 * @param {{word:string, slots:number, nickname:string}} p
 * @returns {Promise<string>} 생성된 문서 ID
 */
export async function submitSuggestion({ word, slots, nickname }) {
  const user = await ensureAnonymousAuth()
  const ref = await addDoc(collection(db, COL), {
    word,
    slots,
    nickname: safeNickname(nickname),
    uid: user.uid,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}
