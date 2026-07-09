// -----------------------------------------------------------------------------
// 상점 카탈로그 — 코스메틱 스킨(마스코트 팔레트)만 판매하는 MVP.
//  가격/필드는 firestore.rules의 isValidShopPurchase와 반드시 동일해야 함.
// -----------------------------------------------------------------------------

export const SHOP_ITEMS = [
  { id: 'skin-cat', field: 'ownedSkinCat', skin: 'cat', name: '고양이 스킨', emoji: '🐱', price: 15 },
  { id: 'skin-robot', field: 'ownedSkinRobot', skin: 'robot', name: '로봇 스킨', emoji: '🤖', price: 25 },
]
