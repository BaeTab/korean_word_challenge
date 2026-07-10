// -----------------------------------------------------------------------------
// 상점 카탈로그 — 코스메틱 마스코트 스킨.
//  소유 여부는 players 문서의 owned 맵(`{ [item.id]: true }`)에 저장된다.
//  가격은 firestore.rules의 isValidShopPurchase와 반드시 동일해야 함.
// -----------------------------------------------------------------------------

export const SHOP_ITEMS = [
  { id: 'skin-cat', skin: 'cat', name: '고양이 스킨', emoji: '🐱', price: 15 },
  { id: 'skin-ghost', skin: 'ghost', name: '유령 스킨', emoji: '👻', price: 20 },
  { id: 'skin-robot', skin: 'robot', name: '로봇 스킨', emoji: '🤖', price: 25 },
  { id: 'skin-alien', skin: 'alien', name: '외계인 스킨', emoji: '👽', price: 30 },
  { id: 'skin-panda', skin: 'panda', name: '판다 스킨', emoji: '🐼', price: 35 },
  { id: 'skin-ninja', skin: 'ninja', name: '닌자 스킨', emoji: '🥷', price: 40 },
]

/**
 * 장착된 아이템 ID(`'skin-cat'`) → Mascot skin 키(`'cat'`).
 * players 문서의 equippedSkin에는 아이템 ID가 저장되지만 Mascot의 SKINS 키는 skin 값이라
 * 이 매핑 없이 그대로 넘기면 장착이 화면에 반영되지 않는다.
 * 'default'·미보유·알 수 없는 ID면 'default'.
 */
export function skinKeyOf(itemId) {
  if (!itemId || itemId === 'default') return 'default'
  return SHOP_ITEMS.find((it) => it.id === itemId)?.skin ?? 'default'
}
