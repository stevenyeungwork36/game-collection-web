/** Imposter game: lobby, ready room, word phase, voting, result. Uses shared game-toolbar and ready-room layout. */
import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { getTranslations } from '../../translations'
import { apiUrl, apiFetch } from '../../api'

const POLL_INTERVAL_MS = 1500
const WORD_PHASE_SECONDS = 10
const COUNTDOWN_SECONDS = 5

export default function ImposterGame() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [roomsList, setRoomsList] = useState([])
  const [joinError, setJoinError] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [voteFor, setVoteFor] = useState(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [wordTimeLeft, setWordTimeLeft] = useState(null)
  const [countdownLeft, setCountdownLeft] = useState(null)
  const [hasPressedReady, setHasPressedReady] = useState(false)

  const join = useCallback(async () => {
    setJoinError('')
    const r = String(roomId || '').trim()
    const n = String(playerName || '').trim()
    if (!r || !n) {
      setJoinError(t.enterRoomAndName)
      return
    }
    const { ok, data, errorMessage } = await apiFetch(apiUrl('/api/games/imposter/join'), {
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
        roundPlayers: data.roundPlayers || data.players || [],
        playersNeeded: data.playersNeeded ?? 0,
        myWord: data.myWord,
        wordPhaseEndTime: data.wordPhaseEndTime,
        isImposter: data.isImposter,
        waitingNextRound: data.waitingNextRound,
        countdownEndTime: data.countdownEndTime,
      })
      setShowJoinDialog(false)
    }
  }, [roomId, playerName, t.enterRoomAndName, t.joinFailed, t.networkError])

  const fetchRooms = useCallback(async () => {
    const { ok, data } = await apiFetch(apiUrl('/api/games/imposter/rooms'))
    if (ok && Array.isArray(data)) setRoomsList(data)
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
    await apiFetch(apiUrl(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}/leave`), {
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
      try {
        const res = await fetch(
          apiUrl(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
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
    if (roomState?.state !== 'word' || !roomState?.wordPhaseEndTime) {
      setWordTimeLeft(null)
      return
    }
    const update = () => {
      const left = Math.max(0, Math.ceil((roomState.wordPhaseEndTime - Date.now()) / 1000))
      setWordTimeLeft(left)
      if (left <= 0) return
      const tid = setTimeout(update, 500)
      return () => clearTimeout(tid)
    }
    update()
  }, [roomState?.state, roomState?.wordPhaseEndTime])

  useEffect(() => {
    if (roomState?.state === 'countdown' || roomState?.state === 'word') {
      setHasPressedReady(false)
    }
  }, [roomState?.state])

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

  const submitVote = useCallback(async () => {
    if (!voteFor || !playerId || !roomId) return
    try {
      const res = await fetch(apiUrl(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}/vote`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, votedForPlayerId: voteFor }),
      })
      const data = await res.json()
      if (res.ok) setRoomState((prev) => (prev ? { ...prev, ...data, hasVoted: true } : prev))
    } catch {}
  }, [voteFor, playerId, roomId])

  const pressReady = useCallback(async () => {
    if (!playerId || !roomId) return
    setHasPressedReady(true)
    try {
      const res = await fetch(apiUrl(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}/ready`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (res.ok) setRoomState((prev) => (prev ? { ...prev, ...data } : prev))
    } catch {}
  }, [playerId, roomId])

  const pressReadyForStart = useCallback(async () => {
    if (!playerId || !roomId) return
    try {
      const res = await fetch(apiUrl(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}/ready`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (res.ok && data?.readyPlayers) setRoomState((prev) => (prev ? { ...prev, readyPlayers: data.readyPlayers } : prev))
    } catch {}
  }, [playerId, roomId])

  const pressCancelReady = useCallback(async () => {
    if (!playerId || !roomId) return
    try {
      const res = await fetch(apiUrl(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}/cancel-ready`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (res.ok && data?.readyPlayers) setRoomState((prev) => (prev ? { ...prev, readyPlayers: data.readyPlayers } : prev))
    } catch {}
  }, [playerId, roomId])

  if (!playerId && !showJoinDialog) {
    return (
      <div className="game-lobby">
        <div className="game-lobby-toolbar">
          <h2 className="game-lobby-title">{t.lobbyTitle}</h2>
          <div className="game-lobby-actions">
            <button type="button" className="imposter-btn" onClick={fetchRooms}>{t.lobbyRefresh}</button>
            <button type="button" className="imposter-btn imposter-btn-primary" onClick={createRoom}>{t.lobbyCreateRoom}</button>
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
                <tr><td colSpan={5} className="game-lobby-empty">{t.lobbyNoRooms}</td></tr>
              ) : (
                roomsList.map((room) => (
                  <tr key={room.roomId}>
                    <td>{room.roomId}</td>
                    <td>{room.playerCount} / {room.minPlayers}</td>
                    <td>{room.state}</td>
                    <td>{room.hasPassword ? '🔒' : '—'}</td>
                    <td>
                      <button type="button" className="imposter-btn imposter-btn-sm" onClick={() => { setRoomId(room.roomId); setShowJoinDialog(true) }}>{t.lobbyJoin}</button>
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
      <div className="imposter-join">
        <div className="imposter-join-box">
          <h3 className="imposter-join-title">{t.imposterJoinTitle}</h3>
          <p className="imposter-join-desc">{t.imposterJoinDesc}</p>
          <div className="imposter-join-fields">
            <input
              type="text"
              placeholder={t.imposterRoomNumber}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="imposter-input"
              autoComplete="off"
            />
            <input
              type="text"
              placeholder={t.imposterYourName}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="imposter-input"
              autoComplete="off"
            />
          </div>
          {joinError && <p className="imposter-error">{joinError}</p>}
          <div className="imposter-join-buttons">
            <button type="button" className="imposter-btn imposter-btn-outline" onClick={() => setShowJoinDialog(false)}>{t.lobbyBackToLobby}</button>
            <button type="button" className="imposter-btn" onClick={join}>{t.imposterJoin}</button>
          </div>
        </div>
      </div>
    )
  }

  if (!roomState) {
    return (
      <div className="imposter-state">
        <p>{t.loading}</p>
      </div>
    )
  }

  const renderToolbar = (playersForLeaderboard = []) => (
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
                  <tr><th>{t.leaderboard}</th><th>{t.leaderboardWins}</th></tr>
                </thead>
                <tbody>
                  {(() => {
                    const counts = roomState.winnerCounts || {}
                    const rows = (playersForLeaderboard.length ? playersForLeaderboard : roomState.players || []).map((p) => ({ ...p, wins: counts[p.id] || 0 })).sort((a, b) => b.wins - a.wins)
                    return rows.map((p) => (
                      <tr key={p.id}><td>{p.emoji} {p.name}</td><td>{p.wins}</td></tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <button type="button" className="game-toolbar-quit game-leaderboard-toggle" onClick={quitGame} title={t.lobbyQuitGame}>{t.lobbyQuitGame}</button>
      </div>
    </div>
  )

  const renderReadyRoomToolbar = () => (
    <div className="game-toolbar ready-room-toolbar">
      <div className="game-toolbar-left">
        <span className="game-room-badge">{t.roomLabel}: <strong>{roomId}</strong></span>
      </div>
      <div className="game-toolbar-right">
        <button type="button" className="game-toolbar-quit game-leaderboard-toggle" onClick={quitGame} title={t.lobbyQuitGame}>{t.lobbyQuitGame}</button>
      </div>
    </div>
  )

  if (roomState.state === 'waiting_next_round') {
    return (
      <div className="imposter-state imposter-waiting-next">
        {renderToolbar(roomState.players || [])}
        <h3>{t.roomLabel}: {roomId}</h3>
        <p className="imposter-waiting-next-msg">{t.imposterWaitingNext}</p>
        <p className="imposter-waiting-next-hint">{t.imposterStay}</p>
      </div>
    )
  }

  if (roomState.state === 'waiting') {
    const players = roomState.players || []
    const readyPlayers = roomState.readyPlayers || []
    const amReady = readyPlayers.includes(playerId)
    const needed = roomState.playersNeeded ?? Math.max(0, 3 - players.length)
    return (
      <div className="imposter-state imposter-waiting ready-room-wrap">
        {renderReadyRoomToolbar()}
        <h3 className="ready-room-heading">{t.roomLabel}: {roomId}</h3>
        <p className="imposter-waiting-msg">{t.imposterWaiting.replace('{n}', needed)}</p>
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
            <button type="button" className="imposter-btn imposter-btn-outline game-leaderboard-toggle" onClick={pressCancelReady}>{t.cancelReadyBtn}</button>
          </>
        ) : (
          <button type="button" className="imposter-btn game-leaderboard-toggle" onClick={pressReadyForStart}>{t.readyBtn}</button>
        )}
      </div>
    )
  }

  if (roomState.state === 'countdown') {
    const secs = countdownLeft !== null ? countdownLeft : COUNTDOWN_SECONDS
    return (
      <div className="imposter-state imposter-countdown">
        {renderToolbar(roomState.players || [])}
        <h3>{t.imposterNextRoundStarting}</h3>
        <p className="imposter-countdown-num">{secs}</p>
        <p className="imposter-countdown-hint">{t.imposterCountdownHint}</p>
      </div>
    )
  }

  if (roomState.state === 'word') {
    return (
      <div className="imposter-state imposter-word">
        {renderToolbar(roomState.roundPlayers || roomState.players || [])}
        <p className="imposter-word-label">
          {wordTimeLeft !== null ? `${wordTimeLeft}s` : '…'}
        </p>
        <p className="imposter-word-text">{roomState.myWord || '—'}</p>
      </div>
    )
  }

  if (roomState.state === 'voting') {
    const roundPlayers = roomState.roundPlayers?.length ? roomState.roundPlayers : roomState.players || []
    const hasVoted = roomState.hasVoted === true

    return (
      <div className="imposter-state imposter-voting">
        {renderToolbar(roundPlayers)}
        <h3>{t.imposterWhoImposter}</h3>
        {hasVoted ? (
          <p className="imposter-voting-wait">{t.imposterVotingWait}</p>
        ) : (
          <div className="imposter-voting-list">
            {roundPlayers.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`imposter-vote-btn ${voteFor === p.id ? 'selected' : ''}`}
                onClick={() => setVoteFor(p.id)}
              >
                <span className="imposter-vote-emoji">{p.emoji}</span>
                <span>{p.name}</span>
              </button>
            ))}
            <button
              type="button"
              className="imposter-btn"
              disabled={!voteFor}
              onClick={submitVote}
            >
              {t.imposterSubmitVote}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (roomState.state === 'result') {
    const won =
      (roomState.result === 'crew_win' && !roomState.isImposter) ||
      (roomState.result === 'imposter_win' && roomState.isImposter)
    const roundPlayers = roomState.roundPlayers || roomState.players || []
    const readyPlayers = roomState.readyPlayers || []
    const totalInRound = roundPlayers.length
    const readyCount = readyPlayers.length
    const allReady = totalInRound > 0 && readyCount >= totalInRound
    const waitingCount = totalInRound - readyCount

    return (
      <div className="imposter-state imposter-result imposter-state-with-leaderboard">
        {renderToolbar(roundPlayers)}
        <h3 className={won ? 'imposter-result-win' : 'imposter-result-lose'}>
          {won ? t.imposterYouWin : t.imposterYouLose}
        </h3>
        <p className="imposter-result-imposter">
          {t.imposterWas} {(() => {
            const p = roundPlayers.find((x) => x.id === roomState.imposterPlayerId)
            return p ? `${p.emoji} ${p.name}` : '…'
          })()}
        </p>
        <div className="imposter-result-continue">
          {hasPressedReady || allReady ? (
            <p className="imposter-result-waiting">
              {allReady ? t.imposterNextRoundIn5 : t.imposterWaitingContinue.replace('{n}', String(waitingCount))}
            </p>
          ) : (
            <button type="button" className="imposter-btn" onClick={pressReady}>
              {t.imposterContinueBtn}
            </button>
          )}
        </div>
        <button type="button" className="imposter-btn imposter-btn-outline imposter-quit-block" onClick={quitGame}>{t.lobbyQuitGame}</button>
      </div>
    )
  }

  return (
    <div className="imposter-state">
      <p>{t.unknownState}</p>
    </div>
  )
}
