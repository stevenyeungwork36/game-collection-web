/**
 * Texas Hold'em: lobby, join, waiting (add/remove bots, start), playing (opponents row, felt, my hand), between rounds.
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
    if (!r || !n) { setJoinError(t.enterRoomAndName); return }
    const { ok, data, errorMessage } = await apiFetch(apiUrl('/api/games/texas/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: r, playerName: n }),
    })
    if (!ok) { setJoinError(data?.error || errorMessage || t.joinFailed); return }
    setPlayerId(data.playerId)
    setRoomId(r)
    setRoomState({ state: data.state, players: data.players || [], seatOrder: data.seatOrder || [], chips: data.chips || {}, bustCount: data.bustCount || {} })
    setShowJoinDialog(false)
  }, [roomId, playerName, t.enterRoomAndName, t.joinFailed])

  const fetchRooms = useCallback(async () => {
    const { ok, data } = await apiFetch(apiUrl('/api/games/texas/rooms'))
    if (ok && Array.isArray(data)) setRoomsList(data)
  }, [])

  useEffect(() => { if (!playerId && !showJoinDialog) fetchRooms() }, [playerId, showJoinDialog, fetchRooms])

  const createRoom = useCallback(() => {
    setRoomId(Math.random().toString(36).slice(2, 8).toUpperCase())
    setShowJoinDialog(true)
  }, [])

  const quitGame = useCallback(async () => {
    if (!playerId || !roomId) return
    try {
      await fetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/leave`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
      })
    } catch {}
    setPlayerId(null); setRoomId(''); setRoomState(null); setShowJoinDialog(false)
  }, [playerId, roomId])

  useEffect(() => {
    if (!playerId || !roomId || showJoinDialog) return
    const tick = async () => {
      const { ok, data } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`))
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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
    })
    if (!ok) { setPlayError(data?.error || errorMessage || t.failed); return }
    setRoomState((prev) => (prev ? { ...prev, players: data.players, seatOrder: data.seatOrder, chips: data.chips } : prev))
  }, [playerId, roomId, t.failed])

  const removeBot = useCallback(async (botId) => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/remove-bot`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, botId }),
    })
    if (!ok) { setPlayError(data?.error || errorMessage || t.failed); return }
    setRoomState((prev) => (prev ? { ...prev, players: data.players, seatOrder: data.seatOrder, chips: data.chips } : prev))
  }, [playerId, roomId, t.failed])

  const startGame = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/start`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
    })
    if (!ok) setPlayError(data?.error || errorMessage || t.failed)
  }, [playerId, roomId, t.failed])

  const actionFold = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/fold`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
    })
    if (!ok) setPlayError(data?.error || errorMessage || t.failed)
  }, [playerId, roomId, t.failed])

  const actionCheck = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/check`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
    })
    if (!ok) setPlayError(data?.error || errorMessage || t.failed)
  }, [playerId, roomId, t.failed])

  const actionCall = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/call`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
    })
    if (!ok) setPlayError(data?.error || errorMessage || t.failed)
  }, [playerId, roomId, t.failed])

  const actionRaise = useCallback(async (amountValue) => {
    if (!playerId || !roomId) return
    setPlayError('')
    const amount = typeof amountValue === 'string' ? parseInt(amountValue, 10) : amountValue
    const minRaise = (roomState?.roundBet || 0) + BIG_BLIND
    if (isNaN(amount) || amount < minRaise) { setPlayError(`${t.texasMinRaise}: ${minRaise}`); return false }
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/raise`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, amount }),
    })
    if (!ok) { setPlayError(data?.error || errorMessage || t.failed); return false }
    setShowRaiseModal(false); setRaiseInput(''); return true
  }, [playerId, roomId, roomState?.roundBet, t.failed, t.texasMinRaise])

  const readyNextRound = useCallback(async () => {
    if (!playerId || !roomId) return
    await apiFetch(apiUrl(`/api/games/texas/rooms/${encodeURIComponent(roomId)}/ready-next`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId }),
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
                    <tr><th>{t.leaderboard}</th><th>{t.texasScore}</th><th>💰</th><th>↩</th></tr>
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

  // ----- Lobby -----
  if (!playerId && !showJoinDialog) {
    return (
      <div className="game-lobby">
        <div className="game-lobby-toolbar">
          <h2 className="game-lobby-title">{t.lobbyTitle}</h2>
          <div className="game-lobby-actions">
            <button type="button" className="kittens-btn kittens-btn-outline" onClick={fetchRooms}>{t.lobbyRefresh}</button>
            <button type="button" className="kittens-btn kittens-btn-primary" onClick={createRoom}>{t.lobbyCreateRoom}</button>
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
                      <button type="button" className="kittens-btn kittens-btn-sm" onClick={() => { setRoomId(room.roomId); setShowJoinDialog(true) }}>{t.lobbyJoin}</button>
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

  // ----- Join dialog -----
  if (showJoinDialog) {
    return (
      <div className="texas-join ready-room-wrap">
        <div className="texas-join-box">
          <h3 className="ready-room-heading">{t.texasJoinTitle}</h3>
          <p className="texas-join-desc">{t.texasJoinDesc}</p>
          <div className="texas-join-fields">
            <input type="text" className="kittens-input" placeholder={t.texasRoomNumber} value={roomId} onChange={(e) => setRoomId(e.target.value)} autoComplete="off" />
            <input type="text" className="kittens-input" placeholder={t.texasYourName} value={playerName} onChange={(e) => setPlayerName(e.target.value)} autoComplete="off" />
          </div>
          {joinError && <p className="kittens-error">{joinError}</p>}
          <div className="texas-join-buttons">
            <button type="button" className="kittens-btn kittens-btn-outline" onClick={() => setShowJoinDialog(false)}>{t.lobbyBackToLobby}</button>
            <button type="button" className="kittens-btn kittens-btn-primary" onClick={join}>{t.lobbyJoin}</button>
          </div>
        </div>
      </div>
    )
  }

  if (!roomState) {
    return <div className="texas-loading"><p>{t.loading}</p></div>
  }

  // ----- Waiting / lobby room -----
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
                <button type="button" className="kittens-btn kittens-btn-outline kittens-btn-sm texas-remove-bot" onClick={() => removeBot(p.id)}>
                  {t.texasRemoveBot}
                </button>
              )}
            </li>
          ))}
        </ul>
        {playError && <p className="kittens-error">{playError}</p>}
        <div className="texas-waiting-actions">
          {canAddBot && (
            <button type="button" className="kittens-btn kittens-btn-outline" onClick={addBot}>{t.texasAddBot}</button>
          )}
          <button type="button" className="kittens-btn kittens-btn-primary" onClick={startGame} disabled={!canStart}>{t.texasStartGame}</button>
        </div>
      </div>
    )
  }

  // ----- Between rounds -----
  if (roomState.state === 'between_rounds') {
    const winners = roomState.winnerThisRound || []
    const players = roomState.players || []
    const winnerNames = winners.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean)
    return (
      <div className="texas-between">
        {renderToolbar(true)}
        <h3 className="texas-between-title">{t.texasBetweenRounds}</h3>
        {winnerNames.length > 0 && (
          <p className="texas-winners">🏆 {t.texasWinsRound.replace('{name}', winnerNames.join(', '))}</p>
        )}
        <button type="button" className="kittens-btn kittens-btn-primary" onClick={readyNextRound}>{t.texasReadyNext}</button>
      </div>
    )
  }

  // ----- Playing -----
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
    const myPlayer = players.find((p) => p.id === playerId)
    const isDealer = seatOrder.indexOf(playerId) === dealerIndex
    const isMeFolded = folded.has(playerId)

    const phaseLabel = {
      preflop: t.texasPhasePreflop,
      flop: t.texasPhaseFlop,
      turn: t.texasPhaseTurn,
      river: t.texasPhaseRiver,
      showdown: t.texasPhaseShowdown,
    }[roomState.phase] || roomState.phase

    // Opponents ordered starting from the seat after me
    const opponents = seatOrder
      .map((_, i) => seatOrder[(myIndex + 1 + i) % seatOrder.length])
      .filter((id) => id !== playerId)

    return (
      <div className="texas-play-wrap">
        {renderToolbar(true)}

        {/* Opponent seats */}
        <div className="texas-opponents-row">
          {opponents.map((seatId) => {
            const player = players.find((p) => p.id === seatId)
            const chips = roomState.chips?.[seatId] ?? 0
            const isFolded = folded.has(seatId)
            const isCurrent = roomState.currentPlayerId === seatId
            const isOppDealer = seatOrder.indexOf(seatId) === dealerIndex
            const oppBet = roomState.currentBet?.[seatId] ?? 0
            const revealedCards = roomState.phase === 'showdown' ? (holeCardsRevealed[seatId] || []) : []
            return (
              <div
                key={seatId}
                className={`texas-opp-seat${isCurrent ? ' texas-seat-current' : ''}${isFolded ? ' texas-seat-folded' : ''}`}
              >
                <div className="texas-opp-cards">
                  {revealedCards.length > 0
                    ? revealedCards.map((c) => <TexasCard key={c.id} card={c} lang={lang} />)
                    : (<><TexasCard faceDown /><TexasCard faceDown /></>)
                  }
                </div>
                <div className="texas-opp-info">
                  {isOppDealer && <span className="texas-dealer-btn">D</span>}
                  <span className="texas-opp-name">{player?.emoji} {player?.name}</span>
                  <span className="texas-opp-chips">💰 {chips}</span>
                  {oppBet > 0 && <span className="texas-opp-bet">↑ {oppBet}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Felt: pot + community cards */}
        <div className="texas-felt">
          <div className="texas-pot">
            <span className="texas-pot-label">{t.texasPot}</span>
            <span className="texas-pot-amount">{pot}</span>
          </div>
          {communityCards.length > 0 && (
            <div
              className="texas-community-row"
              role="button"
              tabIndex={0}
              onClick={() => setExpandedCards({ type: 'community', cards: communityCards })}
              onKeyDown={(e) => e.key === 'Enter' && setExpandedCards({ type: 'community', cards: communityCards })}
              aria-label={lang === 'zh' ? '點擊放大公共牌' : 'Tap to zoom community cards'}
            >
              {communityCards.map((c) => (
                <TexasCard key={c.id} card={c} lang={lang} />
              ))}
            </div>
          )}
          <div className="texas-phase-badge">{phaseLabel}</div>
        </div>

        {/* My seat */}
        <div className={`texas-my-seat${isMyTurn ? ' texas-seat-current' : ''}${isMeFolded ? ' texas-seat-folded' : ''}`}>
          <div className="texas-my-info">
            {isDealer && <span className="texas-dealer-btn">D</span>}
            <span className="texas-my-name">{myPlayer?.emoji} {myPlayer?.name}</span>
            <span className="texas-my-chips-display">💰 {myChips}</span>
            {myBet > 0 && <span className="texas-my-bet-display">↑ {myBet}</span>}
          </div>
          {myHoleCards.length > 0 && (
            <div
              className="texas-my-cards"
              role="button"
              tabIndex={0}
              onClick={() => setExpandedCards({ type: 'hand', cards: myHoleCards })}
              onKeyDown={(e) => e.key === 'Enter' && setExpandedCards({ type: 'hand', cards: myHoleCards })}
              aria-label={lang === 'zh' ? '點擊放大手牌' : 'Tap to zoom your cards'}
            >
              {myHoleCards.map((c) => (
                <TexasCard key={c.id} card={c} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* Turn bar */}
        <div className={`texas-turn-bar${isMyTurn ? ' texas-turn-bar-you' : ''}`}>
          {isMyTurn
            ? <span className="texas-turn-msg">✨ {lang === 'zh' ? '你的回合' : 'Your turn'}</span>
            : <span className="texas-turn-msg">{currentPlayer?.emoji} {currentPlayer?.name}</span>
          }
        </div>

        {playError && <p className="kittens-error texas-play-err">{playError}</p>}

        {/* Action buttons */}
        {isMyTurn && roomState.phase !== 'showdown' && !isMeFolded && (
          <div className="texas-actions">
            <button type="button" className="kittens-btn kittens-btn-outline texas-action-fold" onClick={actionFold}>{t.texasFold}</button>
            {toCall === 0 ? (
              <button type="button" className="kittens-btn kittens-btn-primary" onClick={actionCheck}>{t.texasCheck}</button>
            ) : (
              <button type="button" className="kittens-btn kittens-btn-primary" onClick={actionCall}>{t.texasCall} {toCall}</button>
            )}
            <button type="button" className="kittens-btn kittens-btn-primary" onClick={() => { setRaiseInput(String(minRaise)); setShowRaiseModal(true); setPlayError('') }}>{t.texasRaise}</button>
          </div>
        )}

        {/* Raise modal */}
        {showRaiseModal && (
          <div className="texas-modal-overlay" onClick={() => setShowRaiseModal(false)} role="dialog" aria-modal="true" aria-labelledby="texas-raise-title">
            <div className="texas-modal-box" onClick={(e) => e.stopPropagation()}>
              <h4 id="texas-raise-title" className="texas-modal-title">{t.texasRaise}</h4>
              <p className="texas-modal-hint">{t.texasMinRaise}: {minRaise}</p>
              <input
                type="number" min={minRaise} value={raiseInput}
                onChange={(e) => setRaiseInput(e.target.value)}
                className="kittens-input texas-raise-input" autoFocus
              />
              <div className="texas-modal-actions">
                <button type="button" className="kittens-btn kittens-btn-outline" onClick={() => { setShowRaiseModal(false); setRaiseInput('') }}>{t.cancelBtn}</button>
                <button type="button" className="kittens-btn kittens-btn-primary" onClick={() => actionRaise(raiseInput)}>{t.texasRaise}</button>
              </div>
            </div>
          </div>
        )}

        {/* Card zoom overlay */}
        {expandedCards && (
          <div className="texas-card-expand-overlay" onClick={() => setExpandedCards(null)} role="dialog" aria-modal="true">
            <div className="texas-card-expand-box" onClick={(e) => e.stopPropagation()}>
              <div className="texas-card-expand-cards">
                {expandedCards.cards.map((c) => (
                  <TexasCard key={c.id} card={c} lang={lang} className="texas-card-expand-one" />
                ))}
              </div>
              <button type="button" className="kittens-btn kittens-btn-outline texas-card-expand-close" onClick={() => setExpandedCards(null)}>{t.cancelBtn}</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return <div className="texas-loading"><p>{t.unknownState}</p></div>
}
