// -----------------------------------------------------------------------------
// 정답 난독화 (anti-peek)
//
//  순수 클라이언트 게임은 판정을 위해 정답을 브라우저가 알아야 하므로, 결심한
//  공격자를 100% 막을 순 없다(그건 서버 판정이 필요 — README '보안' 참고).
//  다만 아래 처리로 "개발자 도구/React DevTools에서 정답을 평문으로 훔쳐보는"
//  캐주얼 치팅은 효과적으로 차단한다:
//   - 게임 상태(state)에는 암호화된 문자열(answerEnc)만 보관.
//   - 판정 순간에만 지역 변수로 잠깐 복호화하고 즉시 버린다.
//   - 정답 평문은 게임이 끝난 뒤에만 노출한다.
//
//  방식: UTF-8 바이트 XOR(가변 키) + Base64. (경량·대칭)
// -----------------------------------------------------------------------------

const KEY = 0x5a
const PERIOD = 13

function xorBytes(bytes) {
  const out = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ (KEY + (i % PERIOD))
  }
  return out
}

function bytesToBinary(bytes) {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return s
}

/** 평문 → 난독화 문자열 */
export function obfuscate(text) {
  const bytes = new TextEncoder().encode(text)
  return btoa(bytesToBinary(xorBytes(bytes)))
}

/** 난독화 문자열 → 평문 */
export function deobfuscate(enc) {
  const bin = atob(enc)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(xorBytes(bytes))
}
