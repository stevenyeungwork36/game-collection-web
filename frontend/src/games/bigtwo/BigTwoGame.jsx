import { useState, useEffect, useCallback, useRef } from 'react'
import { RULES_EN, RULES_ZH, RULES_SUIT_ORDER_CARDS, RULES_RANK_ORDER_CARDS, RULES_COMBO_EXAMPLES } from './rules'
import CardFace from './CardFace'
import { useLanguage } from '../../context/LanguageContext'
import { getTranslations } from '../../translations'
import { apiUrl } from '../../api'

const FLY_ANIMATION_MS = 500

const POLL_INTERVAL_MS = 1500
const COUNTDOWN_SECONDS = 5

export default function BigTwoGame() {
  const { lang } = useLanguage()
  const t = getTranslations(lang)
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState(null)
  const [showJoinDialog, setShowJoinDialog] = useState(true)
  const [joinError, setJoinError] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [countdownLeft, setCountdownLeft] = useState(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [playError, setPlayError] = useState('')
  const [hasPressedReady, setHasPressedReady] = useState(false)
  const [flyState, setFlyState] = useState({ cards: [], from: null, to: null })
  const [flyPhase, setFlyPhase] = useState('start')
  const tableRef = useRef(null)
  const handRef = useRef(null)

  const join = useCallback(async () => {
    setJoinError('')
    const r = String(roomId || '').trim()
    const n = String(playerName || '').trim()
    if (!r || !n) {
      setJoinError(t.enterRoomAndName)
      return
    }
    try {
      const res = await fetch(apiUrl('/api/games/bigtwo/join'), {
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
          apiUrl(`/api/games/bigtwo/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`)
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

  // Clear selection when it's not our turn; keep only ids that still exist in hand (fixes stale/unselect bugs)
  useEffect(() => {
    if (roomState?.state !== 'playing') return
    const myHand = roomState.myHand || []
    const handIds = new Set(myHand.map((c) => c.id))
    const isMyTurn = roomState.currentPlayerId === playerId
    setSelectedIds((prev) => {
      if (!isMyTurn) return new Set()
      return new Set([...prev].filter((id) => handIds.has(id)))
    })
  }, [roomState?.state, roomState?.currentPlayerId, roomState?.myHand, playerId])

  useEffect(() => {
    if (flyState.cards.length > 0 && flyState.from && flyState.to) {
      const id = requestAnimationFrame(() => setFlyPhase('end'))
      return () => cancelAnimationFrame(id)
    }
  }, [flyState.cards.length, flyState.from, flyState.to])

  const submitPlay = useCallback(async () => {
    if (!playerId || !roomId || selectedIds.size === 0) return
    setPlayError('')
    const myHand = roomState?.myHand || []
    const cardsToFly = myHand.filter((c) => selectedIds.has(c.id))
    try {
      const res = await fetch(apiUrl(`/api/games/bigtwo/rooms/${encodeURIComponent(roomId)}/play`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardIds: [...selectedIds] }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPlayError(data.error || t.bigtwoPlayError)
        return
      }
      setSelectedIds(new Set())
      if (cardsToFly.length > 0 && handRef.current && tableRef.current) {
        const handRect = handRef.current.getBoundingClientRect()
        const tableRect = tableRef.current.getBoundingClientRect()
        const from = { x: handRect.left + handRect.width / 2, y: handRect.top + handRect.height / 2 }
        const to = { x: tableRect.left + tableRect.width / 2, y: tableRect.top + tableRect.height / 2 }
        setFlyPhase('start')
        setFlyState({ cards: cardsToFly, from, to })
        setTimeout(() => {
          setFlyState((prev) => ({ ...prev, cards: [] }))
          setFlyPhase('start')
          fetch(apiUrl(`/api/games/bigtwo/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`))
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data) setRoomState(data) })
        }, FLY_ANIMATION_MS)
      } else if (cardsToFly.length > 0) {
        setFlyState({ cards: cardsToFly, from: null, to: null })
        setTimeout(() => {
          setFlyState((prev) => ({ ...prev, cards: [] }))
          fetch(apiUrl(`/api/games/bigtwo/rooms/${encodeURIComponent(roomId)}?playerId=${encodeURIComponent(playerId)}`))
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data) setRoomState(data) })
        }, FLY_ANIMATION_MS)
      } else {
        setRoomState((prev) => (prev ? { ...prev } : prev))
      }
    } catch {
      setPlayError(t.networkError)
    }
  }, [playerId, roomId, selectedIds, roomState?.myHand, t.bigtwoPlayError, t.networkError])

  const submitPass = useCallback(async () => {
    if (!playerId || !roomId) return
    setPlayError('')
    try {
      const res = await fetch(apiUrl(`/api/games/bigtwo/rooms/${encodeURIComponent(roomId)}/pass`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPlayError(data.error || t.failed)
        return
      }
      setRoomState((prev) => (prev ? { ...prev } : prev))
    } catch {
      setPlayError(t.networkError)
    }
  }, [playerId, roomId, t.failed, t.networkError])

  const pressReady = useCallback(async () => {
    if (!playerId || !roomId) return
    setHasPressedReady(true)
    try {
      await fetch(apiUrl(`/api/games/bigtwo/rooms/${encodeURIComponent(roomId)}/ready`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
    } catch {}
  }, [playerId, roomId])

  const toggleCard = (id) => {
    if (id == null) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const rules = lang === 'zh' ? RULES_ZH : RULES_EN

  if (showJoinDialog) {
    return (
      <div className="bigtwo-join">
        <div className="bigtwo-join-box">
          <h3 className="bigtwo-join-title">{t.bigtwoJoinTitle}</h3>
          <p className="bigtwo-join-desc">{t.bigtwoJoinDesc}</p>
          <div className="bigtwo-join-fields">
            <input
              type="text"
              placeholder={t.bigtwoRoomNumber}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bigtwo-input"
              autoComplete="off"
            />
            <input
              type="text"
              placeholder={t.bigtwoYourName}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="bigtwo-input"
              autoComplete="off"
            />
          </div>
          {joinError && <p className="bigtwo-error">{joinError}</p>}
          <button type="button" className="bigtwo-btn" onClick={join}>
            {t.bigtwoJoin}
          </button>
        </div>
      </div>
    )
  }

  if (!roomState) {
    return (
      <div className="bigtwo-state">
        <p>{t.loading}</p>
      </div>
    )
  }

  if (roomState.state === 'waiting') {
    const needed = roomState.playersNeeded ?? Math.max(0, 3 - (roomState.players?.length || 0))
    return (
      <div className="bigtwo-state bigtwo-waiting">
        <h3>{t.roomLabel}: {roomId}</h3>
        <p className="bigtwo-waiting-msg">{t.bigtwoWaiting.replace('{n}', needed)}</p>
        <p className="bigtwo-waiting-count">{roomState.players?.length || 0} / 3</p>
      </div>
    )
  }

  if (roomState.state === 'countdown') {
    const secs = countdownLeft !== null ? countdownLeft : COUNTDOWN_SECONDS
    return (
      <div className="bigtwo-state bigtwo-countdown">
        <h3>{t.bigtwoGameStarting}</h3>
        <p className="bigtwo-countdown-num">{secs}</p>
      </div>
    )
  }

  if (roomState.state === 'result') {
    const roundPlayers = roomState.players || []
    const winner = roundPlayers.find((p) => p.id === roomState.winner)
    const readyPlayers = roomState.readyPlayers || []
    const totalInRound = roundPlayers.length
    const readyCount = readyPlayers.length
    const allReady = totalInRound > 0 && readyCount >= totalInRound

    return (
      <div className="bigtwo-state bigtwo-result">
        <h3 className="bigtwo-result-title">
          {roomState.winner === playerId ? t.bigtwoYouWin : winner ? t.bigtwoWins.replace('{name}', `${winner.emoji} ${winner.name}`) : t.gameOver}
        </h3>
        <div className="bigtwo-result-continue">
          {hasPressedReady || allReady ? (
            <p className="bigtwo-result-waiting">
              {allReady ? t.bigtwoNextRoundIn5 : t.bigtwoWaitingContinueCount.replace('{n}', String(totalInRound - readyCount))}
            </p>
          ) : (
            <button type="button" className="bigtwo-btn" onClick={pressReady}>
              {t.bigtwoContinue}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (roomState.state === 'playing') {
    const roundPlayers = roomState.players || []
    const myHand = roomState.myHand || []
    const isMyTurn = roomState.currentPlayerId === playerId
    const table = roomState.table || []
    const tablePlayerId = roomState.tablePlayerId
    const currentPlayer = roundPlayers.find((p) => p.id === roomState.currentPlayerId)

    return (
      <div className="bigtwo-play-wrap">
        <div className="bigtwo-rules-area">
          <button
            type="button"
            className="bigtwo-rules-toggle"
            onClick={() => setRulesOpen((o) => !o)}
            aria-expanded={rulesOpen}
          >
            {t.bigtwoRules} {rulesOpen ? '▼' : '▶'}
          </button>
          {rulesOpen && (
            <div className="bigtwo-rules-panel">
              <p><strong>{rules.goal}</strong></p>
              <p><strong>{rules.suitOrder}</strong></p>
              <div className="bigtwo-rules-cards" aria-hidden="true">
                {RULES_SUIT_ORDER_CARDS.map((card) => (
                  <CardFace key={card.id} card={card} lang={lang} className="bigtwo-rules-card" />
                ))}
              </div>
              <p><strong>{rules.rankOrder}</strong></p>
              <div className="bigtwo-rules-cards" aria-hidden="true">
                {RULES_RANK_ORDER_CARDS.map((card) => (
                  <CardFace key={card.id} card={card} lang={lang} className="bigtwo-rules-card" />
                ))}
              </div>
              <p><strong>{rules.combosTitle}</strong></p>
              <ul className="bigtwo-rules-combos">
                {rules.combos.map((c) => (
                  <li key={c.type}>
                    <span className="bigtwo-rules-combo-name">{lang === 'zh' ? c.nameZh : c.name}:</span>
                    <span className="bigtwo-rules-combo-desc"> {lang === 'zh' ? c.descZh : c.desc}</span>
                    <div className="bigtwo-rules-cards">
                      {(RULES_COMBO_EXAMPLES[c.type] || []).map((card) => (
                        <CardFace key={card.id} card={card} lang={lang} className="bigtwo-rules-card" />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <p>{rules.firstPlay}</p>
            </div>
          )}
        </div>

        <div className="bigtwo-opponents">
          {roundPlayers.filter((p) => p.id !== playerId).map((p) => (
            <div key={p.id} className={`bigtwo-opponent ${roomState.currentPlayerId === p.id ? 'current bigtwo-opponent-active' : ''}`}>
              <span className="bigtwo-opponent-name">{p.emoji} {p.name}</span>
              <span className="bigtwo-opponent-count">{(roomState.handCounts || {})[p.id] ?? 0}</span>
            </div>
          ))}
        </div>

        <div className="bigtwo-table" ref={tableRef}>
          {table.length > 0 ? (
            <>
              <span className="bigtwo-table-label">
                {tablePlayerId && roundPlayers.find((p) => p.id === tablePlayerId)?.name}:
              </span>
              <div className="bigtwo-table-cards">
                {table.map((c) => (
                  <CardFace key={c.id} card={c} lang={lang} />
                ))}
              </div>
            </>
          ) : (
            <span className="bigtwo-table-empty">{t.bigtwoTableEmpty}</span>
          )}
        </div>

        {flyState.cards.length > 0 && flyState.from && flyState.to && (
          <div className="bigtwo-fly-overlay" aria-hidden="true">
            <div
              className="bigtwo-fly-cards"
              style={{
                left: flyPhase === 'end' ? flyState.to.x : flyState.from.x,
                top: flyPhase === 'end' ? flyState.to.y : flyState.from.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {flyState.cards.map((c) => (
                <CardFace key={c.id} card={c} lang={lang} className="bigtwo-fly-one" />
              ))}
            </div>
          </div>
        )}

        <div className={`bigtwo-turn-bar ${isMyTurn ? 'bigtwo-turn-bar-you' : ''}`}>
          <span className="bigtwo-turn-label">{t.bigtwoCurrentPlayer}:</span>
          {isMyTurn ? (
            <span className="bigtwo-turn-msg">{t.bigtwoYourTurn}</span>
          ) : (
            <span className="bigtwo-turn-msg">{currentPlayer?.emoji} {currentPlayer?.name}</span>
          )}
        </div>

        {playError && <p className="bigtwo-error">{playError}</p>}

        <div className="bigtwo-history-area">
          <button
            type="button"
            className="bigtwo-history-toggle"
            onClick={() => setHistoryOpen((o) => !o)}
            aria-expanded={historyOpen}
          >
            {t.bigtwoCardHistory} {historyOpen ? '▼' : '▶'}
          </button>
          {historyOpen && (
            <div className="bigtwo-history-panel">
              {((roomState.playedCardsHistory) || []).length === 0 ? (
                <p className="bigtwo-history-empty">{t.bigtwoNoPlaysYet}</p>
              ) : (
                <ul className="bigtwo-history-list">
                  {[...(roomState.playedCardsHistory || [])].reverse().map((entry, i) => (
                    <li key={i} className="bigtwo-history-entry">
                      <span className="bigtwo-history-player">{entry.emoji} {entry.playerName}</span>
                      <div className="bigtwo-history-cards">
                        {(entry.cards || []).map((c) => (
                          <CardFace key={c.id} card={c} lang={lang} className="bigtwo-history-card" />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className={`bigtwo-hand ${isMyTurn ? 'bigtwo-hand-active' : ''}`}>
          <div className="bigtwo-hand-cards" ref={handRef}>
            {myHand.map((card) => (
              <CardFace
                key={card.id}
                card={card}
                lang={lang}
                asButton
                selected={selectedIds.has(card.id)}
                onClick={() => isMyTurn && toggleCard(card.id)}
                disabled={!isMyTurn}
                className="bigtwo-card-btn"
              />
            ))}
          </div>
          <div className="bigtwo-actions">
            {isMyTurn && (
              <>
                <button
                  type="button"
                  className="bigtwo-btn"
                  onClick={submitPlay}
                  disabled={selectedIds.size === 0}
                >
                  {t.bigtwoPlay}
                </button>
                <button type="button" className="bigtwo-btn bigtwo-btn-outline" onClick={submitPass}>
                  {t.bigtwoPass}
                </button>
                <button
                  type="button"
                  className="bigtwo-btn bigtwo-btn-outline"
                  onClick={deselectAll}
                  disabled={selectedIds.size === 0}
                >
                  {t.bigtwoDeselectAll}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bigtwo-state">
      <p>{t.unknownState}</p>
    </div>
  )
}
