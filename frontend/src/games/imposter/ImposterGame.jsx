import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { getTranslations } from '../../translations'

const POLL_INTERVAL_MS = 1500
const WORD_PHASE_SECONDS = 10
const COUNTDOWN_SECONDS = 5

export default function ImposterGame() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [showJoinDialog, setShowJoinDialog] = useState(true)
  const [joinError, setJoinError] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [voteFor, setVoteFor] = useState(null)
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
    try {
      const res = await fetch('/api/games/imposter/join', {
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
        roundPlayers: data.roundPlayers || data.players || [],
        playersNeeded: data.playersNeeded ?? 0,
        myWord: data.myWord,
        wordPhaseEndTime: data.wordPhaseEndTime,
        isImposter: data.isImposter,
        waitingNextRound: data.waitingNextRound,
        countdownEndTime: data.countdownEndTime,
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
          `/api/games/imposter/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`
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
      const res = await fetch(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}/vote`, {
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
      const res = await fetch(`/api/games/imposter/rooms/${encodeURIComponent(roomId)}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (res.ok) setRoomState((prev) => (prev ? { ...prev, ...data } : prev))
    } catch {}
  }, [playerId, roomId])

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
          <button type="button" className="imposter-btn" onClick={join}>
            {t.imposterJoin}
          </button>
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

  if (roomState.state === 'waiting_next_round') {
    return (
      <div className="imposter-state imposter-waiting-next">
        <h3>{t.roomLabel}: {roomId}</h3>
        <p className="imposter-waiting-next-msg">{t.imposterWaitingNext}</p>
        <p className="imposter-waiting-next-hint">{t.imposterStay}</p>
      </div>
    )
  }

  if (roomState.state === 'waiting') {
    const needed = roomState.playersNeeded ?? Math.max(0, 3 - (roomState.players?.length || 0))
    return (
      <div className="imposter-state imposter-waiting">
        <h3>{t.roomLabel}: {roomId}</h3>
        <p className="imposter-waiting-msg">{t.imposterWaiting.replace('{n}', needed)}</p>
        <p className="imposter-waiting-count">{t.imposterWaitingCount.replace('{n}', roomState.players?.length || 0)}</p>
      </div>
    )
  }

  if (roomState.state === 'countdown') {
    const secs = countdownLeft !== null ? countdownLeft : COUNTDOWN_SECONDS
    return (
      <div className="imposter-state imposter-countdown">
        <h3>{t.imposterNextRoundStarting}</h3>
        <p className="imposter-countdown-num">{secs}</p>
        <p className="imposter-countdown-hint">{t.imposterCountdownHint}</p>
      </div>
    )
  }

  if (roomState.state === 'word') {
    return (
      <div className="imposter-state imposter-word">
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
      <div className="imposter-state imposter-result">
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
      </div>
    )
  }

  return (
    <div className="imposter-state">
      <p>{t.unknownState}</p>
    </div>
  )
}
