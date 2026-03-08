/**
 * Texas Hold'em: lobby, join, waiting (add/remove bots, start), playing (table, seats, actions), between rounds.
 * Min 1 human, max table size; bots fill seats. Chips & leaderboard by score (chips - rebuys penalty).
 */
import { useState, useEffect, useCallback } from 'react'
import TexasCard from './TexasCard'
import { useLanguage } from '../../context/LanguageContext'
import { getTranslations } from '../../translations'
import { apiUrl, apiFetch } from '../../api'

const POLL_INTERVAL_MS = 1500
const BIG_BLIND = 20

export default function TexasGame() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [roomsList, setRoomsList] = useState([])
  const [joinError, setJoinError] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [playError, setPlayError] = useState('')
  const [showRaiseModal, setShowRaiseModal] = useState(false)
  const [raiseInput, setRaiseInput] = useState('')
  const [expandedCards, setExpandedCards] = useState(null)

  const join = useCallback(async () => {
    setJoinError('')
    const r = String(roomId || '').trim()
    const n = String(playerName || '').trim()
    if (!r || !n) {
      setJoinError(t.enterRoomAndName)
      return
    }
    const { ok, data, errorMessage } = await apiFetch(apiUrl('/api/games/texas/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: r, playerName: n }),
    })
    if (!ok) {
      setJoinError(data?.error || errorMessage || t.joinFailed)
      return
    }
    setPlayerId(data.playerId)
    setRoomId(r)
    setRoomState({
      state: data.state,
      players: data.players || [],
      seatOrder: data.seatOrder || [],
      chips: data.chips || {},
      bustCount: data.bustCount || {},
    })
    setShowJoinDialog(false)
  }, [roomId, playerName, t.enterRoomAndName, t.joinFailed])

  const fetchRooms = useCallback(async () => {
    const res = await fetch(apiUrl('/api/games/texas/rooms'))
    if (!res.ok) return
    const data = await res.json()
    if (Array.isArray(data)) setRoomsList(data)
  }, [])

  useEffect(() => {
    if (!playerId && !showJoinDialog) fetchRooms()
  }, [playerId, showJoinDialog, fetchRooms])

  const createRoom = useCallback(() => {
    setRoomId(Math.random().toString(36).slice(2, 8).toUpperCase())
    setShowJoinDialog(true)
  }, [])

  const quitGame = useCallback(async () => {
    if (!playerId || !roomId) return
    try {
      await fetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/leave`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
    } catch {}
    setPlayerId(null)
    setRoomId('')
    setRoomState(null)
    setShowJoinDialog(false)
  }, [playerId, roomId])

  useEffect(() => {
    if (!playerId || !roomId || showJoinDialog) return
    const tick = async () => {
      const { ok, data } = await apiFetch(
        apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
      )
      if (ok && data) setRoomState(data)
    }
    tick()
    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playerId, roomId, showJoinDialog])

  const addBot = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/add-bot`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (!ok) {
      setPlayError(data?.error || errorMessage || t.failed)
      return
    }
    setRoomState((prev) => (prev ? { ...prev, players: data.players, seatOrder: data.seatOrder, chips: data.chips } : prev))
  }, [playerId, roomId, t.failed])

  const removeBot = useCallback(async (botId) => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/remove-bot`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, botId }),
    })
    if (!ok) {
      setPlayError(data?.error || errorMessage || t.failed)
      return
    }
    setRoomState((prev) => (prev ? { ...prev, players: data.players, seatOrder: data.seatOrder, chips: data.chips } : prev))
  }, [playerId, roomId, t.failed])

  const startGame = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/start`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (!ok) {
      setPlayError(data?.error || errorMessage || t.failed)
      return
    }
  }, [playerId, roomId, t.failed])

  const actionFold = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/fold`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (!ok) setPlayError(data?.error || errorMessage || t.failed)
  }, [playerId, roomId, t.failed])

  const actionCheck = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/check`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (!ok) setPlayError(data?.error || errorMessage || t.failed)
  }, [playerId, roomId, t.failed])

  const actionCall = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/call`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (!ok) setPlayError(data?.error || errorMessage || t.failed)
  }, [playerId, roomId, t.failed])

  const actionRaise = useCallback(async (amountValue) => {
    if (!playerId || !roomId) return
    setPlayError('')
    const amount = typeof amountValue === 'string' ? parseInt(amountValue, 10) : amountValue
    const minRaise = (roomState?.roundBet || 0) + BIG_BLIND
    if (isNaN(amount) || amount < minRaise) {
      setPlayError(`${t.texasMinRaise}: ${minRaise}`)
      return false
    }
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/raise`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, amount }),
    })
    if (!ok) {
      setPlayError(data?.error || errorMessage || t.failed)
      return false
    }
    setShowRaiseModal(false)
    setRaiseInput('')
    return true
  }, [playerId, roomId, roomState?.roundBet, t.failed, t.texasMinRaise])

  const readyNextRound = useCallback(async () => {
    if (!playerId || !roomId) return
    await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/ready-next`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
  }, [playerId, roomId])

  const renderToolbar = (showLeaderboard = true) => (
    <div className="game-toolbar">
      <div className="game-toolbar-left">
        <span className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></span>
      </div>
      <div className="game-toolbar-right">
        {showLeaderboard && roomState?.leaderboard && (
          <div className="game-leaderboard-wrap">
            <button type="button" className="game-leaderboard-toggle" onClick={() => setLeaderboardOpen((o) => !o)} aria-expanded={leaderboardOpen}>
              🏆 {t.leaderboard} {leaderboardOpen ? '▼' : '▶'}
            </button>
            {leaderboardOpen && (
              <div className="game-leaderboard-panel">
                <table className="game-leaderboard-table">
                  <thead>
                    <tr><th>{t.leaderboard}</th><th>{t.texasScore}</th><th>{t.texasYourChips}</th><th>{t.texasBustCount}</th></tr>
                  </thead>
                  <tbody>
                    {roomState.leaderboard.map((row) => (
                      <tr key={row.id}><td>{row.emoji} {row.name}</td><td>{row.score}</td><td>{row.chips}</td><td>{row.bustCount}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <button type="button" className="game-toolbar-quit game-leaderboard-toggle" onClick={quitGame} title={t.lobbyQuitGame}>{t.lobbyQuitGame}</button>
      </div>
    </div>
  )

  if (!playerId && !showJoinDialog) {
    return (
      <div className="game-lobby">
        <div className="game-lobby-toolbar">
          <h2 className="game-lobby-title">{t.lobbyTitle}</h2>
          <div className="game-lobby-actions">
            <button type="button" className="btn btn-outline-primary" onClick={fetchRooms}>{t.lobbyRefresh}</button>
            <button type="button" className="btn btn-primary" onClick={createRoom}>{t.lobbyCreateRoom}</button>
          </div>
        </div>
        <div className="game-lobby-table-wrap">
          <table className="game-lobby-table">
            <thead>
              <tr>
                <th>{t.lobbyRoomNumber}</th>
                <th>{t.lobbyPlayers}</th>
                <th>{t.lobbyState}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roomsList.length === 0 ? (
                <tr><td colSpan={4} className="game-lobby-empty">{t.lobbyNoRooms}</td></tr>
              ) : (
                roomsList.map((room) => (
                  <tr key={room.roomId}>
                    <td>{room.roomId}</td>
                    <td>{room.playerCount} / {room.tableSize}</td>
                    <td>{room.state}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => { setRoomId(room.roomId); setShowJoinDialog(true) }}>{t.lobbyJoin}</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (showJoinDialog) {
    return (
      <div className="texas-join ready-room-wrap">
        <div className="texas-join-box">
          <h3 className="ready-room-heading">{t.texasJoinTitle}</h3>
          <p className="texas-join-desc">{t.texasJoinDesc}</p>
          <div className="texas-join-fields">
            <input type="text" placeholder={t.texasRoomNumber} value={roomId} onChange={(e) => setRoomId(e.target.value)} className="form-control" autoComplete="off" />
            <input type="text" placeholder={t.texasYourName} value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="form-control" autoComplete="off" />
          </div>
          {joinError && <p className="text-danger small">{joinError}</p>}
          <div className="texas-join-buttons">
            <button type="button" className="kittens-btn kittens-btn-outline" onClick={() => setShowJoinDialog(false)}>{t.lobbyBackToLobby}</button>
            <button type="button" className="kittens-btn kittens-btn-primary" onClick={join}>{t.lobbyJoin}</button>
          </div>
        </div>
      </div>
    )
  }

  if (!roomState) {
    return (
      <div className="texas-loading">
        <p>{t.loading}</p>
      </div>
    )
  }

  if (roomState.state === 'waiting') {
    const players = roomState.players || []
    const seatOrder = roomState.seatOrder || []
    const canAddBot = seatOrder.length < (roomState.tableSize ?? 9)
    const canStart = seatOrder.length >= 2

    return (
      <div className="texas-waiting ready-room-wrap">
        <div className="game-toolbar ready-room-toolbar">
          <div className="game-toolbar-left">
            <span className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></span>
          </div>
          <div className="game-toolbar-right">
            <button type="button" className="game-toolbar-quit game-leaderboard-toggle" onClick={quitGame} title={t.lobbyQuitGame}>{t.lobbyQuitGame}</button>
          </div>
        </div>
        <h3 className="ready-room-heading">{t.roomLabel}: {roomId}</h3>
        <p className="texas-waiting-msg">{t.texasWaitingStart}</p>
        <p className="ready-room-title">{t.readyRoomTitle}</p>
        <ul className="ready-room-list ready-room-grid">
          {players.map((p) => (
            <li key={p.id} className="ready-room-player-li">
              <span className="ready-room-player">{p.emoji} {p.name}</span>
              {p.isBot && (
                <button type="button" className="kittens-btn kittens-btn-outline kittens-btn-sm texas-remove-bot" onClick={() => removeBot(p.id)} title={t.texasRemoveBot}>
                  {t.texasRemoveBot}
                </button>
              )}
            </li>
          ))}
        </ul>
        {playError && <p className="text-danger small">{playError}</p>}
        <div className="texas-waiting-actions">
          {canAddBot && (
            <button type="button" className="kittens-btn kittens-btn-outline" onClick={addBot} disabled={!canAddBot}>{t.texasAddBot}</button>
          )}
          <button type="button" className="kittens-btn kittens-btn-primary" onClick={startGame} disabled={!canStart}>{t.texasStartGame}</button>
        </div>
      </div>
    )
  }

  if (roomState.state === 'between_rounds') {
    const winners = roomState.winnerThisRound || []
    const players = roomState.players || []
    const winnerNames = winners.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean)

    return (
      <div className="texas-between">
        {renderToolbar(true)}
        <h3 className="texas-between-title">{t.texasBetweenRounds}</h3>
        {winnerNames.length > 0 && (
          <p className="texas-winners">{t.texasWinsRound.replace('{name}', winnerNames.join(', '))}</p>
        )}
        <button type="button" className="kittens-btn kittens-btn-primary" onClick={readyNextRound}>{t.texasReadyNext}</button>
      </div>
    )
  }

  if (roomState.state === 'playing') {
    const seatOrder = roomState.seatOrder || []
    const players = roomState.players || []
    const myIndex = seatOrder.indexOf(playerId)
    const communityCards = roomState.communityCards || []
    const pot = roomState.pot ?? 0
    const myChips = roomState.chips?.[playerId] ?? 0
    const isMyTurn = roomState.currentPlayerId === playerId
    const currentPlayer = players.find((p) => p.id === roomState.currentPlayerId)
    const folded = new Set(roomState.folded || [])
    const roundBet = roomState.roundBet ?? 0
    const myBet = roomState.currentBet?.[playerId] ?? 0
    const toCall = Math.max(0, roundBet - myBet)
    const minRaise = roundBet + BIG_BLIND
    const myHoleCards = roomState.myHoleCards || []
    const holeCardsRevealed = roomState.holeCardsRevealed || {}
    const dealerIndex = roomState.dealerIndex ?? 0

    const phaseLabel = {
      preflop: t.texasPhasePreflop,
      flop: t.texasPhaseFlop,
      turn: t.texasPhaseTurn,
      river: t.texasPhaseRiver,
      showdown: t.texasPhaseShowdown,
    }[roomState.phase] || roomState.phase

    const displayOrder = seatOrder.map((_, i) => seatOrder[(myIndex + i) % seatOrder.length])

    return (
      <div className="texas-play-wrap">
        {renderToolbar(true)}
        <div className="texas-table-container">
          <div className="texas-table-surface">
            <div className="texas-pot">
              <span className="texas-pot-label">{t.texasPot}</span>
              <span className="texas-pot-amount">{pot}</span>
            </div>
            <div className="texas-community" role="button" tabIndex={0} onClick={() => communityCards.length > 0 && setExpandedCards({ type: 'community', cards: communityCards })} onKeyDown={(e) => e.key === 'Enter' && communityCards.length > 0 && setExpandedCards({ type: 'community', cards: communityCards })} aria-label={t.texasPot}>
              {communityCards.map((c) => (
                <TexasCard key={c.id} card={c} lang={lang} />
              ))}
            </div>
            <div className="texas-phase-badge">{phaseLabel}</div>
          </div>

          {displayOrder.map((seatId, displayIndex) => {
            const isMe = seatId === playerId
            const player = players.find((p) => p.id === seatId)
            const chips = roomState.chips?.[seatId] ?? 0
            const isFolded = folded.has(seatId)
            const isDealer = roomState.seatOrder?.indexOf(seatId) === dealerIndex
            const showCards = isMe ? myHoleCards : (roomState.phase === 'showdown' ? (holeCardsRevealed[seatId] || []) : [])

            return (
              <div
                key={seatId}
                className={`texas-seat texas-seat-${displayIndex} ${roomState.currentPlayerId === seatId ? 'texas-seat-current' : ''} ${isFolded ? 'texas-seat-folded' : ''}`}
                style={getSeatStyle(displayIndex, displayOrder.length)}
              >
                <div className="texas-seat-inner">
                  {isDealer && <span className="texas-dealer-btn" title="Dealer">D</span>}
                  <span className="texas-seat-name">{player?.emoji} {player?.name}</span>
                  <span className="texas-seat-chips">{chips}</span>
                  <div
                    className="texas-seat-cards"
                    role={isMe && myHoleCards.length > 0 ? 'button' : undefined}
                    tabIndex={isMe && myHoleCards.length > 0 ? 0 : undefined}
                    onClick={isMe && myHoleCards.length > 0 ? () => setExpandedCards({ type: 'hand', cards: myHoleCards }) : undefined}
                    onKeyDown={isMe && myHoleCards.length > 0 ? (e) => e.key === 'Enter' && setExpandedCards({ type: 'hand', cards: myHoleCards }) : undefined}
                    aria-label={isMe ? t.texasYourChips : undefined}
                  >
                    {showCards.length > 0
                      ? showCards.map((c) => <TexasCard key={c.id} card={c} lang={lang} />)
                      : !isMe && roomState.phase !== 'showdown' && (
                          <>
                            <TexasCard faceDown />
                            <TexasCard faceDown />
                          </>
                        )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="texas-turn-bar">
          <span className="texas-turn-label">{roomState.currentPlayerId === playerId ? t.texasYourChips : ''} {currentPlayer && `${currentPlayer.emoji} ${currentPlayer.name}`}</span>
          {roomState.currentPlayerId === playerId && <span className="texas-my-chips">{myChips}</span>}
        </div>

        {playError && <p className="text-danger small texas-play-err">{playError}</p>}

        {isMyTurn && roomState.phase !== 'showdown' && (
          <div className="texas-actions">
            <button type="button" className="kittens-btn kittens-btn-outline" onClick={actionFold}>{t.texasFold}</button>
            {toCall === 0 ? (
              <button type="button" className="kittens-btn kittens-btn-primary" onClick={actionCheck}>{t.texasCheck}</button>
            ) : (
              <button type="button" className="kittens-btn kittens-btn-primary" onClick={actionCall}>{t.texasCall} {toCall}</button>
            )}
            <button type="button" className="kittens-btn kittens-btn-primary" onClick={() => { setRaiseInput(String(minRaise)); setShowRaiseModal(true); setPlayError(''); }}>{t.texasRaise}</button>
          </div>
        )}

        {showRaiseModal && (
          <div className="texas-modal-overlay" onClick={() => setShowRaiseModal(false)} role="dialog" aria-modal="true" aria-labelledby="texas-raise-title">
            <div className="texas-modal-box" onClick={(e) => e.stopPropagation()}>
              <h4 id="texas-raise-title" className="texas-modal-title">{t.texasRaise}</h4>
              <p className="texas-modal-hint">{t.texasMinRaise}: {minRaise}</p>
              <input
                type="number"
                min={minRaise}
                value={raiseInput}
                onChange={(e) => setRaiseInput(e.target.value)}
                className="form-control texas-raise-input"
                autoFocus
              />
              <div className="texas-modal-actions">
                <button type="button" className="kittens-btn kittens-btn-outline" onClick={() => { setShowRaiseModal(false); setRaiseInput(''); }}>{t.cancelBtn}</button>
                <button type="button" className="kittens-btn kittens-btn-primary" onClick={() => actionRaise(raiseInput)}>{t.texasRaise}</button>
              </div>
            </div>
          </div>
        )}

        {expandedCards && (
          <div className="texas-card-expand-overlay" onClick={() => setExpandedCards(null)} role="dialog" aria-modal="true" aria-label={expandedCards.type === 'hand' ? t.texasYourChips : t.texasPot}>
            <div className="texas-card-expand-box" onClick={(e) => e.stopPropagation()}>
              <div className="texas-card-expand-cards">
                {expandedCards.cards.map((c) => (
                  <TexasCard key={c.id} card={c} lang={lang} className="texas-card-expand-one" />
                ))}
              </div>
              <button type="button" className="kittens-btn kittens-btn-outline texas-card-expand-close" onClick={() => setExpandedCards(null)} aria-label={t.closeMenu}>{t.cancelBtn}</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="texas-unknown">
      <p>{t.unknownState}</p>
    </div>
  )
}

function getSeatStyle(displayIndex, total) {
  const angleStep = 360 / Math.max(1, total)
  const angle = 90 + displayIndex * angleStep
  const radius = 38
  const rad = (angle * Math.PI) / 180
  const x = 50 + radius * Math.cos(rad)
  const y = 50 + radius * Math.sin(rad)
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  }
}
