// -----------------------------------------------------------------------------
// Shop — 포인트로 마스코트 코스메틱 스킨을 구매·장착하는 상점 + 인벤토리
// -----------------------------------------------------------------------------
import { useState } from 'react'
import Mascot from './Mascot'
import { SHOP_ITEMS } from '../constants/shop'
import styles from '../styles/Shop.module.css'

const DEFAULT_ENTRY = { id: 'default', skin: 'default', name: '기본', emoji: '🙂' }

export default function Shop({ playerStats, onPurchase, onEquip }) {
  const points = playerStats?.points ?? 0
  const owned = playerStats?.owned || {}
  const equipped = playerStats?.equippedSkin || 'default'
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const ownedItems = [DEFAULT_ENTRY, ...SHOP_ITEMS.filter((it) => owned[it.id])]

  const buy = async (item) => {
    setError('')
    setBusyId(item.id)
    try {
      await onPurchase(item.id)
    } catch (e) {
      if (e?.message === 'NOT_ENOUGH_POINTS') setError('포인트가 부족해요!')
      else if (e?.message === 'ALREADY_OWNED') setError('이미 보유한 아이템이에요.')
      else if (e?.code === 'permission-denied') setError('동기화 문제가 있어요 — 새로고침 후 다시 시도해 주세요')
      else setError('구매에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusyId(null)
    }
  }

  const equip = async (skinId) => {
    setError('')
    setBusyId(`equip-${skinId}`)
    try {
      await onEquip(skinId)
    } catch (e) {
      if (e?.code === 'permission-denied') setError('동기화 문제가 있어요 — 새로고침 후 다시 시도해 주세요')
      else setError('장착에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.balance}>🪙 보유 포인트 <b>{points}</b></p>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.section}>
        <p className={styles.sectionTitle}>내 인벤토리 · {ownedItems.length}개 보유</p>
        <div className={styles.grid}>
          {ownedItems.map((item) => {
            const isEquipped = equipped === item.id
            return (
              <div key={item.id} className={styles.item}>
                <Mascot mood="happy" size={64} skin={item.skin} />
                <p className={styles.itemName}>{item.emoji} {item.name}</p>
                <button
                  type="button"
                  className={styles.buyBtn}
                  onClick={() => equip(item.id)}
                  disabled={isEquipped || busyId === `equip-${item.id}`}
                >
                  {isEquipped ? '장착 중 ✓' : busyId === `equip-${item.id}` ? '장착 중…' : '장착하기'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>상점</p>
        <div className={styles.grid}>
          {SHOP_ITEMS.filter((item) => !owned[item.id]).map((item) => {
            const affordable = points >= item.price
            return (
              <div key={item.id} className={styles.item}>
                <Mascot mood="happy" size={64} skin={item.skin} />
                <p className={styles.itemName}>{item.emoji} {item.name}</p>
                <button
                  type="button"
                  className={styles.buyBtn}
                  onClick={() => buy(item)}
                  disabled={!affordable || busyId === item.id}
                >
                  {busyId === item.id ? '구매 중…' : `${item.price} 포인트`}
                </button>
              </div>
            )
          })}
          {SHOP_ITEMS.every((item) => owned[item.id]) && (
            <p className={styles.empty}>모든 아이템을 보유하고 있어요! 🎉</p>
          )}
        </div>
      </div>
    </div>
  )
}
