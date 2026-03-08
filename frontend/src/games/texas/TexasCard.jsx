import { useState } from 'react'
import { getCardImageSrc, cardLabel } from './cardUtils'

/** Single card display for Texas Hold'em. Reuses same image naming as Big Two. */
export default function TexasCard({ card, lang, className = '', faceDown = false }) {
  const [imgError, setImgError] = useState(false)
  if (faceDown) {
    return (
      <div className={`texas-card texas-card-back ${className}`.trim()} aria-hidden="true">
        <span className="texas-card-back-inner">🂠</span>
      </div>
    )
  }
  if (!card) return null
  const src = getCardImageSrc(card)
  const showImg = src && !imgError
  const label = cardLabel(card, lang)

  return (
    <div className={`texas-card texas-card-face ${className}`.trim()}>
      {showImg ? (
        <img src={src} alt={label} className="texas-card-img" onError={() => setImgError(true)} />
      ) : (
        <span className="texas-card-text">{label}</span>
      )}
    </div>
  )
}
