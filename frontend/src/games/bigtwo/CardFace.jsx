import { useState } from 'react'
import { cardLabel, cardDisplayClass, getCardImageSrc } from './rules'

/**
 * Renders a single card: image if available, otherwise text fallback.
 * Use className "bigtwo-card-btn" for hand (clickable) or "bigtwo-card" for table/display.
 */
export default function CardFace({ card, lang, className = '', asButton = false, selected, onClick, disabled, children }) {
  const [imgError, setImgError] = useState(false)
  const src = getCardImageSrc(card)
  const showImg = src && !imgError
  const label = cardLabel(card, lang)
  const suitClass = cardDisplayClass(card)

  const content = showImg ? (
    <img
      src={src}
      alt={label}
      className="bigtwo-card-img"
      onError={() => setImgError(true)}
    />
  ) : (
    <span className="bigtwo-card-text">{label}</span>
  )

  const classes = `bigtwo-card-face ${suitClass} ${className} ${selected ? 'selected' : ''}`.trim()

  if (asButton) {
    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {content}
        {children}
      </button>
    )
  }

  return (
    <div className={classes}>
      {content}
      {children}
    </div>
  )
}
