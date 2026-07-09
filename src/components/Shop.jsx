// -----------------------------------------------------------------------------
// Shop — 포인트로 마스코트 코스메틱 스킨을 구매하는 상점
// -----------------------------------------------------------------------------
import { useState } from 'react'
import Mascot from './Mascot'
import { SHOP_ITEMS } from '../constants/shop'
import styles from '../styles/Shop.module.css'

export default function Shop({ playerStats, onPurchase }) {
  const points = playerStats?.points ?? 0
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const buy = async (item) => {
    setError('')
    setBusyId(item.id)
    try {
      await onPurchase(item.id)
    } catch (e) {
      if (e?.message === 'NOT_ENOUGH_POINTS') setError('포인트가 부족해요!')
      else if (e?.message === 'ALREADY_OWNED') setError('이미 보유한 아이템이에요.')
      else setError('구매에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.balance}>🪙 보유 포인트 <b>{points}</b></p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.grid}>
        {SHOP_ITEMS.map((item) => {
          const owned = !!playerStats?.[item.field]
          const affordable = points >= item.price
          return (
            <div key={item.id} className={styles.item}>
              <Mascot mood="happy" size={64} skin={item.skin} />
              <p className={styles.itemName}>{item.emoji} {item.name}</p>
              <button
                type="button"
                className={styles.buyBtn}
                onClick={() => buy(item)}
                disabled={owned || !affordable || busyId === item.id}
              >
                {owned ? '보유 중 ✓' : busyId === item.id ? '구매 중…' : `${item.price} 포인트`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
