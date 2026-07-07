// -----------------------------------------------------------------------------
// Firebase 초기화 (Firestore + Anonymous Auth)
//  - 웹 config 값은 비밀이 아님(보안은 Firestore 규칙 + Auth 로 강제).
//  - Vite 환경변수(VITE_*)가 있으면 우선 사용, 없으면 아래 기본값으로 동작.
// -----------------------------------------------------------------------------
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAwz0UjTQdIHgMDMBDYifryPnX-Ai33FLY',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'word-challengee.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'word-challengee',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? 'word-challengee.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '498907040642',
  appId: env.VITE_FIREBASE_APP_ID ?? '1:498907040642:web:e81737aa2fbef4e4641d9b',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-KQEGWREL23',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const auth = getAuth(app)

/**
 * 익명 로그인을 보장한다. 이미 로그인돼 있으면 그 유저를, 아니면 익명 로그인 후 유저를 반환.
 * @returns {Promise<import('firebase/auth').User>}
 */
export function ensureAnonymousAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub()
          resolve(user)
        } else {
          signInAnonymously(auth).catch((err) => {
            unsub()
            reject(err)
          })
        }
      },
      (err) => {
        unsub()
        reject(err)
      },
    )
  })
}

export default app
