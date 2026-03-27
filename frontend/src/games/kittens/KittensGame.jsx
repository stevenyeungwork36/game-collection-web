/**
 * Exploding Kittens game: lobby, ready room, play (hand, toss area, draw pile), modals (favor, see future).
 * Uses shared game-toolbar, ready-room layout, and card toss animation on play.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { getTranslations } from '../../translations'
import { apiUrl, apiFetch } from '../../api'
import { getCardInfo, CARD_LIST_FOR_RULES } from './cardInfo'

const POLL_INTERVAL_MS = 1500
const COUNTDOWN_SECONDS = 5
const TOSS_ANIMATION_MS = 650

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
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [roomsList, setRoomsList] = useState([])
  const [joinError, setJoinError] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [countdownLeft, setCountdownLeft] = useState(null)
  const [hasPressedReady, setHasPressedReady] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [rulesLang, setRulesLang] = useState(lang)
  const [playError, setPlayError] = useState('')
  const [showFavorPlayerModal, setShowFavorPlayerModal] = useState(null)
  const [foodPairCard, setFoodPairCard] = useState(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [showSeeFuture, setShowSeeFuture] = useState(null)
  const [showIExploded, setShowIExploded] = useState(false)
  const [explodingPlayerId, setExplodingPlayerId] = useState(null)
  const [expandedPlayedIndex, setExpandedPlayedIndex] = useState(null)
  const [flyingCard, setFlyingCard] = useState(null)
  const [tossShowAll, setTossShowAll] = useState(false)
  const [explosionFlash, setExplosionFlash] = useState(null)
  const lastExplosionKeyRef = useRef(null)

  const join = useCallback(async () => {
    setJoinError('')
    const r = String(roomId || '').trim()
    const n = String(playerName || '').trim()
    if (!r || !n) {
      setJoinError(t.enterRoomAndName)
      return
    }
    const { ok, data, errorMessage } = await apiFetch(apiUrl('/api/games/kittens/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: r, playerName: n }),
    })
    if (!ok) {
      setJoinError(errorMessage || data?.error || t.joinFailed)
      return
    }
    if (data) {
      setPlayerId(data.playerId)
      setRoomId(r)
      setRoomState({
        state: data.state,
        players: data.players || [],
        playersNeeded: data.playersNeeded ?? 0,
      })
      setShowJoinDialog(false)
    }
  }, [roomId, playerName, t.enterRoomAndName, t.joinFailed, t.networkError])

  const fetchRooms = useCallback(async () => {
    const { ok, data } = await apiFetch(apiUrl('/api/games/kittens/rooms'))
    if (ok && Array.isArray(data)) setRoomsList(data)
  }, [])

  useEffect(() => {
    if (!playerId && !showJoinDialog) fetchRooms()
  }, [playerId, showJoinDialog, fetchRooms])

  const createRoom = useCallback(() => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    setRoomId(code)
    setShowJoinDialog(true)
  }, [])

  const quitGame = useCallback(async () => {
    if (!playerId || !roomId) return
    await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/leave`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    setPlayerId(null)
    setRoomId('')
    setRoomState(null)
    setShowJoinDialog(false)
  }, [playerId, roomId])

  useEffect(() => {
    if (!playerId || !roomId || showJoinDialog) return
    const tick = async () => {
      const { ok, data } = await apiFetch(
        apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
      )
      if (ok && data && typeof data.state === 'string') setRoomState(data)
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

  useEffect(() => {
    const exp = roomState?.lastExplosion
    if (!exp) return
    const key = `${exp.playerId}-${exp.at}`
    if (lastExplosionKeyRef.current === key) return
    lastExplosionKeyRef.current = key
    setExplosionFlash(exp)
    const tid = setTimeout(() => setExplosionFlash(null), 3000)
    return () => clearTimeout(tid)
  }, [roomState?.lastExplosion])

  const pressReady = useCallback(async () => {
    if (!playerId || !roomId) return
    const { ok } = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/ready`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (ok) setHasPressedReady(true)
  }, [playerId, roomId])

  const pressReadyForStart = useCallback(async () => {
    if (!playerId || !roomId) return
    const { ok, data } = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/ready`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (ok && data?.readyPlayers) setRoomState((s) => (s ? { ...s, readyPlayers: data.readyPlayers } : s))
  }, [playerId, roomId])

  const pressCancelReady = useCallback(async () => {
    if (!playerId || !roomId) return
    const { ok, data } = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/cancel-ready`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (ok && data?.readyPlayers) setRoomState((s) => (s ? { ...s, readyPlayers: data.readyPlayers } : s))
  }, [playerId, roomId])

  const requestRestart = useCallback(async () => {
    if (!playerId || !roomId) return
    await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/restart`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
  }, [playerId, roomId])

  const drawCard = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/draw`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (!ok) {
      setPlayError(errorMessage || data?.error || t.networkError)
      return
    }
    if (data?.drewExploding && !data?.defused) {
      setShowIExploded(true)
      setTimeout(() => setShowIExploded(false), 2500)
    }
    const next = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`))
    if (next.ok && next.data) setRoomState(next.data)
  }, [playerId, roomId, t.networkError])

  const playCard = useCallback(async (cardId, options = {}, onSuccess) => {
    if (!playerId || !roomId) return
    setPlayError('')
    setFoodPairCard(null)
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/play`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, cardId, ...options }),
    })
    if (!ok) {
      setPlayError(errorMessage || data?.error || t.networkError)
      setFlyingCard(null)
      return
    }
    if (data?.seenCards) setShowSeeFuture(data.seenCards)
    const next = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`))
    if (next.ok && next.data) setRoomState(next.data)
    if (onSuccess) onSuccess()
  }, [playerId, roomId, t.networkError])

  const giveFavorCard = useCallback(async (cardId) => {
    if (!playerId || !roomId) return
    setPlayError('')
    const { ok, data, errorMessage } = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}/favor-give`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, cardId }),
    })
    if (!ok) {
      setPlayError(errorMessage || data?.error || t.networkError)
      return
    }
    const next = await apiFetch(apiUrl(`/api/games/kittens/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`))
    if (next.ok && next.data) setRoomState(next.data)
  }, [playerId, roomId, t.networkError])

  const myHand = roomState?.myHand || []
  const roundPlayers = roomState?.roundPlayers || []
  const isMyTurn = roomState?.currentPlayerId === playerId
  const eliminatedSet = new Set(roomState?.eliminated || [])
  const pendingFavor = roomState?.pendingFavor
  const pendingFavorWaiting = roomState?.pendingFavorWaiting
  const canPlayAction = isMyTurn && (roomState?.drawsRemaining ?? 1) > 0 && !pendingFavor
  const canDraw = isMyTurn && (roomState?.drawsRemaining ?? 1) > 0 && !pendingFavor
  const playableTypes = PLAYABLE_ACTION_TYPES

  if (!playerId && !showJoinDialog) {
    return (
      <div className="game-lobby">
        <div className="game-lobby-toolbar">
          <h2 className="game-lobby-title">{t.lobbyTitle}</h2>
          <div className="game-lobby-actions">
            <button type="button" className="kittens-btn" onClick={fetchRooms}>
              {t.lobbyRefresh}
            </button>
            <button type="button" className="kittens-btn kittens-btn-primary" onClick={createRoom}>
              {t.lobbyCreateRoom}
            </button>
          </div>
        </div>
        <div className="game-lobby-table-wrap">
          <table className="game-lobby-table">
            <thead>
              <tr>
                <th>{t.lobbyRoomNumber}</th>
                <th>{t.lobbyPlayers}</th>
                <th>{t.lobbyState}</th>
                <th>{t.lobbyPassword}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roomsList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="game-lobby-empty">{t.lobbyNoRooms}</td>
                </tr>
              ) : (
                roomsList.map((room) => (
                  <tr key={room.roomId}>
                    <td>{room.roomId}</td>
                    <td>{room.playerCount} / {room.minPlayers}</td>
                    <td>{room.state}</td>
                    <td>{room.hasPassword ? '🔒' : '—'}</td>
                    <td>
                      <button type="button" className="kittens-btn kittens-btn-sm" onClick={() => { setRoomId(room.roomId); setShowJoinDialog(true) }}>
                        {t.lobbyJoin}
                      </button>
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
          <div className="kittens-join-buttons">
            <button type="button" className="kittens-btn kittens-btn-outline" onClick={() => setShowJoinDialog(false)}>
              {t.lobbyBackToLobby}
            </button>
            <button type="button" className="kittens-btn" onClick={join}>
              {t.kittensJoin}
            </button>
          </div>
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
        <div className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></div>
        <p className="game-room-badge-hint">{t.roomCodeHint}</p>
        <h3>{t.roomLabel}: {roomId}</h3>
        <p className="kittens-waiting-next-msg">{t.imposterWaitingNext}</p>
        <p className="kittens-waiting-next-hint">{t.imposterStay}</p>
        <button type="button" className="kittens-btn kittens-btn-outline kittens-quit-btn-block" onClick={quitGame}>{t.lobbyQuitGame}</button>
      </div>
    )
  }

  if (roomState.state === 'waiting') {
    const players = roomState.players || []
    const readyPlayers = roomState.readyPlayers || []
    const amReady = readyPlayers.includes(playerId)
    const needed = roomState.playersNeeded ?? Math.max(0, 2 - players.length)
    return (
      <div className="kittens-state kittens-waiting ready-room-wrap">
        <div className="game-toolbar ready-room-toolbar">
          <div className="game-toolbar-left">
            <span className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></span>
          </div>
          <div className="game-toolbar-right">
            <button type="button" className="game-toolbar-quit game-leaderboard-toggle" onClick={quitGame} title={t.lobbyQuitGame}>{t.lobbyQuitGame}</button>
          </div>
        </div>
        <h3 className="ready-room-heading">{t.roomLabel}: {roomId}</h3>
        <p className="kittens-waiting-msg">{t.kittensWaiting.replace('{n}', needed)}</p>
        <p className="ready-room-title">{t.readyRoomTitle}</p>
        <ul className="ready-room-list ready-room-grid">
          {players.map((p) => (
            <li key={p.id} className={readyPlayers.includes(p.id) ? 'ready' : ''}>
              <span className="ready-room-player">{p.emoji} {p.name}</span>
              {readyPlayers.includes(p.id) ? <span className="ready-room-check" aria-hidden="true"> ✓</span> : null}
            </li>
          ))}
        </ul>
        {amReady ? (
          <>
            <p className="ready-waiting-msg">{t.readyWaitingOthers}</p>
            <button type="button" className="kittens-btn kittens-btn-outline game-leaderboard-toggle" onClick={pressCancelReady}>{t.cancelReadyBtn}</button>
          </>
        ) : (
          <button type="button" className="kittens-btn game-leaderboard-toggle" onClick={pressReadyForStart}>{t.readyBtn}</button>
        )}
      </div>
    )
  }

  if (roomState.state === 'countdown') {
    const secs = countdownLeft !== null ? countdownLeft : COUNTDOWN_SECONDS
    return (
      <div className="kittens-state kittens-countdown">
        <div className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></div>
        <p className="game-room-badge-hint">{t.roomCodeHint}</p>
        <h3>{t.kittensGameStarting}</h3>
        <p className="kittens-countdown-num">{secs}</p>
        <button type="button" className="kittens-btn kittens-btn-outline kittens-quit-btn-block" onClick={quitGame}>{t.lobbyQuitGame}</button>
      </div>
    )
  }

  if (roomState.state === 'result') {
    const roundPlayersResult = roomState.roundPlayers || []
    const readyPlayers = roomState.readyPlayers || []
    const allReady = roundPlayersResult.length > 0 && readyPlayers.length >= roundPlayersResult.length
    return (
      <div className="kittens-state kittens-result">
        <div className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></div>
        <p className="game-room-badge-hint">{t.roomCodeHint}</p>
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
        <button type="button" className="kittens-btn kittens-btn-outline kittens-quit-btn-block" onClick={quitGame}>{t.lobbyQuitGame}</button>
      </div>
    )
  }

  if (roomState.state === 'playing') {
    const restartRequested = roomState.restartRequested || {}
    const requestedCount = roundPlayers.filter((p) => restartRequested[p.id]).length
    const totalInRound = roundPlayers.length

    return (
      <div className={`kittens-play-wrap${explosionFlash ? ' kittens-explosion-bg' : ''}`}>
        <div className="game-toolbar">
          <div className="game-toolbar-left">
            <span className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></span>
            <span className="game-room-badge-hint-inline">{t.roomCodeHint}</span>
          </div>
          <div className="game-toolbar-right">
            <div className="game-leaderboard-wrap">
              <button type="button" className="game-leaderboard-toggle" onClick={() => setLeaderboardOpen((o) => !o)} aria-expanded={leaderboardOpen}>
                🏆 {t.leaderboard} {leaderboardOpen ? '▼' : '▶'}
              </button>
              {leaderboardOpen && (
                <div className="game-leaderboard-panel">
                  <table className="game-leaderboard-table">
                    <thead>
                      <tr>
                        <th>{t.leaderboard}</th>
                        <th>{t.leaderboardWins}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const counts = roomState.winnerCounts || {}
                        const rows = roundPlayers.map((p) => ({ ...p, wins: counts[p.id] || 0 })).sort((a, b) => b.wins - a.wins)
                        return rows.map((p) => (
                          <tr key={p.id}>
                            <td>{p.emoji} {p.name}</td>
                            <td>{p.wins}</td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <button type="button" className="game-toolbar-quit game-leaderboard-toggle" onClick={quitGame} title={t.lobbyQuitGame}>
              {t.lobbyQuitGame}
            </button>
          </div>
        </div>
        {showIExploded && (
          <div className="kittens-explosion-screen" aria-hidden="true">
            <div className="kittens-explosion-burst" />
            <div className="kittens-explosion-flash" />
            <span className="kittens-explosion-emoji">💥</span>
          </div>
        )}

        {explosionFlash && explosionFlash.playerId !== playerId && (
          <div className="kittens-explosion-notify" aria-live="polite">
            <span className="kittens-explosion-notify-emoji">💥</span>
            <span className="kittens-explosion-notify-msg">
              {explosionFlash.emoji} <strong>{explosionFlash.playerName}</strong>{' '}
              {lang === 'zh' ? '被爆炸貓炸飛了！' : 'drew an Exploding Kitten!'}
            </span>
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

        <div className="kittens-top-bar">
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
                <h4 className="kittens-rules-cards-title">{lang === 'zh' ? '牌面說明' : 'All cards'}</h4>
                <ul className="kittens-rules-cards-list">
                  {CARD_LIST_FOR_RULES.map((type) => {
                    const info = getCardInfo(type)
                    if (!info) return null
                    return (
                      <li key={type} className="kittens-rules-card-item">
                        <span className="kittens-rules-card-emoji" aria-hidden="true">{info.emoji}</span>
                        <span className="kittens-rules-card-name">{lang === 'zh' ? info.titleZh : info.titleEn}</span>
                        <span className="kittens-rules-card-desc">{lang === 'zh' ? info.descZh : info.descEn}</span>
                      </li>
                    )
                  })}
                </ul>
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

        <div className="kittens-play-area">
          <div className="kittens-draw-pile">
            <div className="kittens-draw-pile-card">🂠</div>
            {canDraw && (
              <button type="button" className="kittens-draw-btn kittens-draw-btn-center" onClick={drawCard}>
                {t.kittensDrawBtn}
              </button>
            )}
            {!canDraw && (
              <span className="kittens-draw-pile-label">{t.kittensDrawBtn}</span>
            )}
          </div>
          <div className="kittens-toss-region">
            <p className="kittens-toss-title">{t.kittensTossTitle}</p>
            {(() => {
              const history = roomState.playedCardsHistory || []
              const TOSS_VISIBLE = 5
              const hasMore = history.length > TOSS_VISIBLE
              const visible = tossShowAll ? history : history.slice(-TOSS_VISIBLE)
              return (
                <>
                  {hasMore && (
                    <button
                      type="button"
                      className="kittens-toss-collapse-btn"
                      onClick={() => setTossShowAll((v) => !v)}
                    >
                      {tossShowAll
                        ? (lang === 'zh' ? '收起舊記錄 ▲' : 'Collapse ▲')
                        : (lang === 'zh' ? `顯示全部 ${history.length} 筆 ▼` : `Show all ${history.length} ▼`)}
                    </button>
                  )}
                  <div className="kittens-toss-list">
                    {visible.length === 0 ? (
                      <p className="kittens-toss-empty">{t.kittensTossEmpty}</p>
                    ) : (
                      visible.map((entry, _vi) => {
                        const i = tossShowAll ? _vi : history.length - TOSS_VISIBLE + _vi + Math.max(0, TOSS_VISIBLE - history.length)
                        const realIdx = tossShowAll ? _vi : history.length - visible.length + _vi
                        const isExpanded = expandedPlayedIndex === realIdx
                        const cardInfo = getCardInfo(entry.type) || {}
                        const title = lang === 'zh' ? cardInfo.titleZh : cardInfo.titleEn
                        const desc = lang === 'zh' ? cardInfo.descZh : cardInfo.descEn
                        return (
                          <div
                            key={realIdx}
                            className={`kittens-toss-entry ${isExpanded ? 'kittens-toss-entry-expanded' : ''}`}
                          >
                            <button
                              type="button"
                              className="kittens-toss-entry-btn"
                              onClick={() => setExpandedPlayedIndex(isExpanded ? null : realIdx)}
                              aria-expanded={isExpanded}
                              title={lang === 'zh' ? '點擊展開牌面' : 'Click to expand card'}
                            >
                              <span className="kittens-toss-player">{entry.emoji} {entry.playerName}</span>
                              <span className="kittens-toss-card-emoji">{entry.cardEmoji || '🂠'}</span>
                            </button>
                            {isExpanded && (
                              <div className="kittens-toss-expanded-card">
                                <span className="kittens-toss-expanded-emoji">{cardInfo.emoji || entry.cardEmoji || '🂠'}</span>
                                <span className="kittens-toss-expanded-title">{title || entry.type}</span>
                                <span className="kittens-toss-expanded-desc">{desc || ''}</span>
                                <button type="button" className="kittens-toss-expanded-close" onClick={(e) => { e.stopPropagation(); setExpandedPlayedIndex(null) }}>
                                  {lang === 'zh' ? '關閉' : 'Close'}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {pendingFavor && (
          <div className="kittens-favor-overlay" role="dialog" aria-modal="true" aria-labelledby="kittens-favor-overlay-title">
            <div className="kittens-favor-overlay-box">
              <h4 id="kittens-favor-overlay-title">{t.kittensFavorGiveTo.replace('{name}', roundPlayers.find((x) => x.id === pendingFavor.fromPlayerId)?.name || '')}</h4>
              <p className="kittens-favor-overlay-hint">{lang === 'zh' ? '選一張牌給對方' : 'Choose a card to give'}</p>
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
          </div>
        )}

        {showFavorPlayerModal && (
          <div className="kittens-favor-overlay" role="dialog" aria-modal="true" aria-labelledby="kittens-favor-select-title" onClick={() => setShowFavorPlayerModal(null)}>
            <div className="kittens-favor-overlay-box" onClick={(e) => e.stopPropagation()}>
              <h4 id="kittens-favor-select-title">{t.kittensFavorSelectPlayer}</h4>
              <div className="kittens-favor-picker-players">
                {roundPlayers.filter((p) => p.id !== playerId && !eliminatedSet.has(p.id)).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="kittens-favor-picker-btn"
                    onClick={() => {
                      playCard(showFavorPlayerModal, { targetPlayerId: p.id })
                      setShowFavorPlayerModal(null)
                    }}
                  >
                    {p.emoji} {p.name}
                  </button>
                ))}
              </div>
              <button type="button" className="kittens-btn kittens-btn-outline" onClick={() => setShowFavorPlayerModal(null)}>
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
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

        {flyingCard && (
          <div className="kittens-card-fly kittens-card-fly-to-toss" aria-hidden="true">
            <span>{flyingCard.emoji}</span>
          </div>
        )}

        <div className="kittens-hand">
          <div className="kittens-hand-cards">
            {myHand.map((card) => {
              const isFood = isFoodType(card.type)
              const playable = canPlayAction && playableTypes.has(card.type) && card.type !== 'exploding_kitten' && card.type !== 'defuse'

              // Food card states
              const isSelectedFirst = isFood && foodPairCard?.id === card.id
              const hasPairForThis = isFood && foodPairCard && foodPairCard.type === card.type && foodPairCard.id !== card.id

              const cardClasses = [
                'kittens-card',
                playable ? 'playable' : '',
                isSelectedFirst ? 'kittens-card-food-selected' : '',
                hasPairForThis ? 'kittens-card-can-pair' : '',
              ].filter(Boolean).join(' ')

              return (
                <div key={card.id} className={cardClasses}>
                  <span className="kittens-card-emoji">{card.emoji}</span>
                  <span className="kittens-card-title">{lang === 'zh' ? card.titleZh : card.titleEn}</span>
                  <span className="kittens-card-desc">{lang === 'zh' ? card.descZh : card.descEn}</span>

                  {/* Non-food playable cards */}
                  {playable && !isFood && card.type !== 'favor' && (
                    <button
                      type="button"
                      className="kittens-card-play"
                      onClick={() => {
                        setFlyingCard({ emoji: card.emoji })
                        playCard(card.id, {}, () => setTimeout(() => setFlyingCard(null), TOSS_ANIMATION_MS))
                      }}
                    >
                      {t.kittensPlay}
                    </button>
                  )}

                  {/* Favor card */}
                  {playable && card.type === 'favor' && (
                    <button
                      type="button"
                      className="kittens-card-play"
                      onClick={() => setShowFavorPlayerModal(card.id)}
                    >
                      {t.kittensPlay}
                    </button>
                  )}

                  {/* Food card: no pair selected yet → "Select" */}
                  {playable && isFood && !isSelectedFirst && !hasPairForThis && (
                    <button
                      type="button"
                      className="kittens-card-play kittens-card-play-select"
                      onClick={() => setFoodPairCard(card)}
                    >
                      {lang === 'zh' ? '選牌' : 'Select'}
                    </button>
                  )}

                  {/* Food card: this IS the selected first card → "Deselect" */}
                  {playable && isSelectedFirst && (
                    <button
                      type="button"
                      className="kittens-card-play kittens-card-play-deselect"
                      onClick={() => setFoodPairCard(null)}
                    >
                      {lang === 'zh' ? '取消' : 'Cancel'}
                    </button>
                  )}

                  {/* Food card: pair card available → "Play pair" */}
                  {playable && hasPairForThis && (
                    <button
                      type="button"
                      className="kittens-card-play kittens-card-play-pair"
                      onClick={() => {
                        setFlyingCard({ emoji: card.emoji })
                        playCard(card.id, { pairCardId: foodPairCard.id }, () => setTimeout(() => setFlyingCard(null), TOSS_ANIMATION_MS))
                      }}
                    >
                      {lang === 'zh' ? '出牌組' : 'Play pair'}
                    </button>
                  )}
                </div>
              )
            })}
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
