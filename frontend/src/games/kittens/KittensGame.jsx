import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { getTranslations } from '../../translations'
import { apiUrl } from '../../api'

const POLL_INTERVAL_MS = 1500
const COUNTDOWN_SECONDS = 5

function isFoodType(type) {
  return type && type.startsWith('food_')
}

const PLAYABLE_ACTION_TYPES = new Set([
  'skip', 'attack', 'nope', 'see_the_future', 'shuffle', 'favor',
  'draw_from_bottom', 'reverse', 'food_taco', 'food_watermelon', 'food_pizza', 'food_sushi',
])

export default function KittensGame() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [showJoinDialog, setShowJoinDialog] = useState(true)
  const [joinError, setJoinError] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [countdownLeft, setCountdownLeft] = useState(null)
  const [hasPressedReady, setHasPressedReady] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [rulesLang, setRulesLang] = useState(lang)
  const [playError, setPlayError] = useState('')
  const [favorTarget, setFavorTarget] = useState(null)
  const [foodPairCard, setFoodPairCard] = useState(null)
  const [showSeeFuture, setShowSeeFuture] = useState(null)
  const [showIExploded, setShowIExploded] = useState(false)
  const [explodingPlayerId, setExplodingPlayerId] = useState(null)

  const join = useCallback(async () => {
    setJoinError('')
    const r = String(roomId || '').trim()
    const n = String(playerName || '').trim()
    if (!r || !n) {
      setJoinError(t.enterRoomAndName)
      return
    }
    try {
      const res = await fetch(apiUrl('/api/games/kittens/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: r, playerName: n }),
      })
      const data = await res.json()
      if (!res.ok) {
        setJoinError(data.error || t.joinFailed)
        return
      }
      setPlayerId(data.playerId)
      setRoomId(r)
      setRoomState({
        state: data.state,
        players: data.players || [],
        playersNeeded: data.playersNeeded ?? 0,
      })
      setShowJoinDialog(false)
    } catch (e) {
      setJoinError(t.networkError)
    }
  }, [roomId, playerName, t.enterRoomAndName, t.joinFailed, t.networkError])

  useEffect(() => {
    if (!playerId || !roomId || showJoinDialog) return
    const tick = async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
        )
        if (!res.ok) return
        const data = await res.json()
        setRoomState(data)
      } catch {}
    }
    tick()
    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playerId, roomId, showJoinDialog])

  useEffect(() => {
    if (roomState?.state !== 'countdown' || !roomState?.countdownEndTime) {
      setCountdownLeft(null)
      return
    }
    const update = () => {
      const left = Math.max(0, Math.ceil((roomState.countdownEndTime - Date.now()) / 1000))
      setCountdownLeft(left)
      if (left <= 0) return
      const tid = setTimeout(update, 200)
      return () => clearTimeout(tid)
    }
    update()
  }, [roomState?.state, roomState?.countdownEndTime])

  useEffect(() => {
    if (roomState?.state === 'countdown' || roomState?.state === 'playing') setHasPressedReady(false)
  }, [roomState?.state])

  const pressReady = useCallback(async () => {
    if (!playerId || !roomId) return
    try {
      const res = await fetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/ready`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (res.ok) setHasPressedReady(true)
    } catch {}
  }, [playerId, roomId])

  const requestRestart = useCallback(async () => {
    if (!playerId || !roomId) return
    try {
      await fetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/restart`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
    } catch {}
  }, [playerId, roomId])

  const drawCard = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    try {
      const res = await fetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/draw`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPlayError(data.error || t.networkError)
        return
      }
      if (data.drewExploding && !data.defused) {
        setShowIExploded(true)
        setTimeout(() => setShowIExploded(false), 2500)
      }
      const next = await fetch(
        apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
      )
      if (next.ok) setRoomState(await next.json())
    } catch (e) {
      setPlayError(t.networkError)
    }
  }, [playerId, roomId, t.networkError])

  const playCard = useCallback(async (cardId, options = {}) => {
    if (!playerId || !roomId) return
    setPlayError('')
    setFavorTarget(null)
    setFoodPairCard(null)
    try {
      const res = await fetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/play`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardId, ...options }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPlayError(data.error || t.networkError)
        return
      }
      if (data.seenCards) setShowSeeFuture(data.seenCards)
      const next = await fetch(
        apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
      )
      if (next.ok) setRoomState(await next.json())
    } catch (e) {
      setPlayError(t.networkError)
    }
  }, [playerId, roomId, t.networkError])

  const giveFavorCard = useCallback(async (cardId) => {
    if (!playerId || !roomId) return
    setPlayError('')
    try {
      const res = await fetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/favor-give`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setPlayError(data.error || t.networkError)
        return
      }
      const next = await fetch(
        apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
      )
      if (next.ok) setRoomState(await next.json())
    } catch (e) {
      setPlayError(t.networkError)
    }
  }, [playerId, roomId, t.networkError])

  const myHand = roomState?.myHand || []
  const roundPlayers = roomState?.roundPlayers || []
  const isMyTurn = roomState?.currentPlayerId === playerId
  const eliminatedSet = new Set(roomState?.eliminated || [])
  const pendingFavor = roomState?.pendingFavor
  const pendingFavorWaiting = roomState?.pendingFavorWaiting
  const canPlayAction = isMyTurn && roomState?.drawsRemaining <= 0 && !pendingFavor
  const canDraw = isMyTurn && roomState?.drawsRemaining > 0 && !pendingFavor
  const playableTypes = PLAYABLE_ACTION_TYPES

  if (showJoinDialog) {
    return (
      <div className="kittens-join">
        <div className="kittens-join-box">
          <h3 className="kittens-join-title">{t.kittensJoinTitle}</h3>
          <p className="kittens-join-desc">{t.kittensJoinDesc}</p>
          <div className="kittens-join-fields">
            <input
              type="text"
              className="kittens-input"
              placeholder={t.kittensRoomNumber}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <input
              type="text"
              className="kittens-input"
              placeholder={t.kittensYourName}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>
          {joinError && <p className="kittens-error">{joinError}</p>}
          <button type="button" className="kittens-btn" onClick={join}>
            {t.kittensJoin}
          </button>
        </div>
      </div>
    )
  }

  if (!roomState) {
    return (
      <div className="kittens-state">
        <p>{t.loading}</p>
      </div>
    )
  }

  if (roomState.state === 'waiting_next_round') {
    return (
      <div className="kittens-state kittens-waiting-next">
        <h3>{t.roomLabel}: {roomId}</h3>
        <p className="kittens-waiting-next-msg">{t.imposterWaitingNext}</p>
        <p className="kittens-waiting-next-hint">{t.imposterStay}</p>
      </div>
    )
  }

  if (roomState.state === 'waiting') {
    const needed = roomState.playersNeeded ?? Math.max(0, 2 - (roomState.players?.length || 0))
    return (
      <div className="kittens-state kittens-waiting">
        <h3>{t.roomLabel}: {roomId}</h3>
        <p className="kittens-waiting-msg">{t.kittensWaiting.replace('{n}', needed)}</p>
        <p className="kittens-waiting-count">{t.kittensWaitingCount.replace('{n}', roomState.players?.length || 0)}</p>
      </div>
    )
  }

  if (roomState.state === 'countdown') {
    const secs = countdownLeft !== null ? countdownLeft : COUNTDOWN_SECONDS
    return (
      <div className="kittens-state kittens-countdown">
        <h3>{t.kittensGameStarting}</h3>
        <p className="kittens-countdown-num">{secs}</p>
      </div>
    )
  }

  if (roomState.state === 'result') {
    const roundPlayersResult = roomState.roundPlayers || []
    const readyPlayers = roomState.readyPlayers || []
    const allReady = roundPlayersResult.length > 0 && readyPlayers.length >= roundPlayersResult.length
    return (
      <div className="kittens-state kittens-result">
        <h3 className={roomState.winner === playerId ? 'kittens-result-title win' : 'kittens-result-title lose'}>
          {roomState.winner === playerId ? t.kittensYouWin : t.kittensGameOver}
        </h3>
        <div className="kittens-result-continue">
          {hasPressedReady || allReady ? (
            <p className="kittens-result-waiting">
              {allReady ? t.kittensRestarting : t.kittensWaitingContinue.replace('{n}', String(roundPlayersResult.length - readyPlayers.length))}
            </p>
          ) : (
            <button type="button" className="kittens-btn" onClick={pressReady}>
              {t.kittensContinue}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (roomState.state === 'playing') {
    const restartRequested = roomState.restartRequested || {}
    const requestedCount = roundPlayers.filter((p) => restartRequested[p.id]).length
    const totalInRound = roundPlayers.length

    return (
      <div className="kittens-play-wrap">
        {showIExploded && (
          <div className="kittens-explosion-screen" aria-hidden="true">
            <div className="kittens-explosion-burst" />
            <div className="kittens-explosion-flash" />
            <span className="kittens-explosion-emoji">💥</span>
          </div>
        )}

        {showSeeFuture && (
          <div className="kittens-see-future-overlay" onClick={() => setShowSeeFuture(null)}>
            <div className="kittens-see-future-modal" onClick={(e) => e.stopPropagation()}>
              <h4 className="kittens-see-future-title">{t.kittensSeeFutureTitle}</h4>
              <div className="kittens-see-future-cards">
                {showSeeFuture.map((c, i) => (
                  <div key={i} className="kittens-see-future-card">
                    <span className="kittens-see-future-emoji">{c.emoji}</span>
                    <span className="kittens-see-future-name">{lang === 'zh' ? c.titleZh : c.titleEn}</span>
                  </div>
                ))}
              </div>
              <button type="button" className="kittens-btn" onClick={() => setShowSeeFuture(null)}>
                {t.kittensSeeFutureOk}
              </button>
            </div>
          </div>
        )}

        <div className="kittens-rules-area">
          <button
            type="button"
            className="kittens-rules-toggle"
            onClick={() => setRulesOpen((o) => !o)}
            aria-expanded={rulesOpen}
          >
            {t.bigtwoRules} {rulesOpen ? '▼' : '▶'}
          </button>
          {rulesOpen && (
            <div className="kittens-rules-panel">
              <p>{lang === 'zh' ? '出牌或抽牌。抽到爆炸貓且無拆彈即出局。' : 'Play or draw. Draw Exploding Kitten without Defuse to lose.'}</p>
            </div>
          )}
        </div>

        <div className="kittens-new-game-btn-wrap">
          <button
            type="button"
            className="kittens-new-game-btn"
            onClick={requestRestart}
            disabled={requestedCount >= totalInRound}
            title={t.kittensNewGame}
          >
            <span className="kittens-new-game-emoji">🔄</span>
            <span className="kittens-new-game-label">{t.kittensNewGame}</span>
            {requestedCount > 0 && (
              <span className="kittens-new-game-requested">{t.kittensNewGameRequested.replace('{n}', requestedCount).replace('{total}', totalInRound)}</span>
            )}
          </button>
        </div>

        <div className="kittens-toss-region">
          <p className="kittens-toss-title">{t.kittensTossTitle}</p>
          <div className="kittens-toss-list">
            {(roomState.playedCardsHistory || []).length === 0 ? (
              <p className="kittens-toss-empty">{t.kittensTossEmpty}</p>
            ) : (
              (roomState.playedCardsHistory || []).map((entry, i) => (
                <div key={i} className="kittens-toss-entry">
                  <span className="kittens-toss-player">{entry.emoji} {entry.playerName}</span>
                  <div className="kittens-toss-card">
                    <span>{entry.cardEmoji || '🂠'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="kittens-opponents">
          {roundPlayers.filter((p) => p.id !== playerId).map((p) => (
            <div
              key={p.id}
              className={`kittens-opponent ${roomState.currentPlayerId === p.id ? 'current' : ''} ${eliminatedSet.has(p.id) ? 'eliminated' : ''}`}
            >
              <div className="kittens-card-back">🂠</div>
              <span className="kittens-opponent-name">{p.emoji} {p.name}</span>
              <span className="kittens-opponent-count">{(roomState.handCounts || {})[p.id] ?? 0}</span>
            </div>
          ))}
        </div>

        {pendingFavorWaiting && (
          <div className="kittens-pending-favor">
            <p className="kittens-pending-favor-title">{t.kittensFavorGiveTo.replace('{name}', roundPlayers.find((x) => x.id === pendingFavorWaiting.fromPlayerId)?.name || '')}</p>
            <div className="kittens-pending-favor-cards">
              {myHand.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="kittens-favor-give-btn"
                  onClick={() => giveFavorCard(c.id)}
                >
                  <span className="kittens-favor-give-emoji">{c.emoji}</span>
                  <span className="kittens-favor-give-label">{lang === 'zh' ? c.titleZh : c.titleEn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="kittens-turn-bar">
          {isMyTurn ? (
            canDraw ? (
              <span className="kittens-drawing-msg">{t.kittensDrawCard}</span>
            ) : (
              <span>{t.kittensYourTurn}</span>
            )
          ) : (
            <span>{roundPlayers.find((p) => p.id === roomState.currentPlayerId)?.emoji} {roundPlayers.find((p) => p.id === roomState.currentPlayerId)?.name}</span>
          )}
        </div>

        {playError && <p className="kittens-error">{playError}</p>}

        <div className="kittens-hand">
          <div className="kittens-hand-cards">
            {myHand.map((card) => {
              const playable = canPlayAction && playableTypes.has(card.type) && card.type !== 'exploding_kitten' && card.type !== 'defuse'
              const isFavor = card.type === 'favor' && favorTarget
              const isFoodPair = isFoodType(card.type) && foodPairCard && (foodPairCard.id === card.id || (roomState.myHand || []).some((c) => c.id === foodPairCard.id && c.type === card.type))
              const canPlayThis = playable && (card.type !== 'favor' || favorTarget) && (!isFoodType(card.type) || (foodPairCard && foodPairCard.type === card.type && foodPairCard.id !== card.id))
              return (
                <div
                  key={card.id}
                  className={`kittens-card ${playable ? 'playable' : ''} ${isFavor ? 'kittens-card-selected-pair' : ''} ${isFoodPair ? 'kittens-card-can-pair' : ''}`}
                >
                  <span className="kittens-card-emoji">{card.emoji}</span>
                  <span className="kittens-card-title">{lang === 'zh' ? card.titleZh : card.titleEn}</span>
                  <span className="kittens-card-desc">{lang === 'zh' ? card.descZh : card.descEn}</span>
                  {card.type === 'favor' && playable && (
                    <div className="kittens-favor-picker">
                      <p className="kittens-favor-picker-title">{t.kittensFavorSelectPlayer}</p>
                      <div className="kittens-favor-picker-players">
                        {roundPlayers.filter((p) => p.id !== playerId && !eliminatedSet.has(p.id)).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={`kittens-favor-picker-btn ${favorTarget === p.id ? 'active' : ''}`}
                            onClick={() => setFavorTarget(favorTarget === p.id ? null : p.id)}
                          >
                            {p.emoji} {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {isFoodType(card.type) && playable && (
                    <p className="kittens-food-hint">{t.kittensFoodSelectPair}</p>
                  )}
                  {canPlayThis && (
                    <button
                      type="button"
                      className="kittens-card-play"
                      onClick={() => {
                        if (card.type === 'favor') playCard(card.id, { targetPlayerId: favorTarget })
                        else if (isFoodType(card.type) && foodPairCard) playCard(card.id, { pairCardId: foodPairCard.id })
                        else if (isFoodType(card.type)) setFoodPairCard(foodPairCard ? null : card)
                        else playCard(card.id)
                      }}
                    >
                      {t.kittensPlay}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="kittens-draw-area">
            {canDraw && (
              <button type="button" className="kittens-draw-btn" onClick={drawCard}>
                {t.kittensDrawBtn}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="kittens-state">
      <p>{t.unknownState}</p>
    </div>
  )
}
