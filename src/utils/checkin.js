// -----------------------------------------------------------------------------
// 출석 체크 유틸 — KST 날짜 기준 하루 1회 체크인 보너스.
//  주의: 아래 상수는 firestore.rules의 isValidCheckinUpdate와 반드시 동일해야 함.
// -----------------------------------------------------------------------------
import { getDailyKey } from './daily'

/** 체크인 1회당 지급 XP(고정값, 규칙과 동일해야 함). */
export const CHECKIN_XP_BONUS = 5

/** 오늘 이미 체크인했는지 여부. */
export function hasCheckedInToday(lastCheckinDate) {
  return lastCheckinDate === getDailyKey()
}

/** 어제 체크인했다면(연속 출석) true — 스트릭 이어가기 판정(클라이언트 미리보기용, 규칙이 신뢰하는 값은 아님). */
export function isConsecutiveDay(lastCheckinDate) {
  return lastCheckinDate === getDailyKey(-1)
}
