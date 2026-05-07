/**
 * Dead of Winter — Client State Store
 * Simple observable store — no framework dependency.
 */

const initialState = {
  ws: { connected: false },
  wsState: 'disconnected',
  auth: { playerId: null, displayName: null, isAuthenticated: false },
  lobby: { players: [] },
  game: null,
  privateState: { hand: [], secretObjective: null, isBetrayer: false },
  ui: {
    activeModal: null,
    crossroadsCard: null,
    actionMenu: null,
    actionPicker: null,
    log: []
  }
}

export function initStore () {
  let state = JSON.parse(JSON.stringify(initialState))
  const subscribers = new Set()

  function getState () {
    return state
  }

  function dispatch (action) {
    const { type, payload } = action
    const prev = state

    switch (type) {
      // ─── WebSocket ──────────────────────────────────────────────────────────
      case 'WS_CONNECTED':
        state = { ...state, ws: { connected: true }, wsState: 'connected' }
        break
      case 'WS_DISCONNECTED':
        state = { ...state, ws: { connected: false }, wsState: 'disconnected' }
        break
      case 'WS_RECONNECTING':
        state = { ...state, ws: { connected: false }, wsState: 'reconnecting' }
        break
      case 'HELLO_ACK':
        // Protocol handshake confirmed — nothing extra needed in state
        break
      case 'VERSION_MISMATCH':
        state = {
          ...state,
          ws: { connected: false },
          wsState: 'version_mismatch',
          ui: {
            ...state.ui,
            activeModal: 'version_mismatch',
            log: [...state.ui.log, {
              ts: Date.now(),
              text: `⚠️ Client is out of date (server v${(payload && payload.serverVersion) || '?'}). Please reload the page.`
            }]
          }
        }
        break

      // ─── Auth ───────────────────────────────────────────────────────────────
      case 'AUTH_SUCCESS':
        state = { ...state, auth: { ...payload, isAuthenticated: true } }
        break
      case 'AUTH_LOGOUT':
        state = JSON.parse(JSON.stringify(initialState))
        break

      // ─── Lobby ──────────────────────────────────────────────────────────────
      case 'PLAYER_JOINED':
        state = {
          ...state,
          lobby: {
            ...state.lobby,
            players: [
              ...state.lobby.players.filter(p => p.playerId !== payload.playerId),
              payload
            ]
          }
        }
        addLog(state, `${payload.displayName} joined the lobby.`)
        break
      case 'PLAYER_LEFT':
        state = {
          ...state,
          lobby: {
            ...state.lobby,
            players: state.lobby.players.filter(p => p.playerId !== payload.playerId)
          }
        }
        addLog(state, `A player left.`)
        break

      // ─── Game ───────────────────────────────────────────────────────────────
      case 'GAME_STATE':
        state = { ...state, game: payload }
        break
      case 'PHASE_CHANGE':
        if (state.game) {
          state = { ...state, game: { ...state.game, phase: payload.phase, round: payload.round } }
        }
        addLog(state, `Phase: ${payload.phase} (round ${payload.round}).`)
        break
      case 'ACTION_RESULT':
        if (payload.narration) addLog(state, payload.narration)
        break
      case 'PRIVATE_STATE':
        state = { ...state, privateState: payload }
        break
      case 'CROSSROADS_TRIGGER':
        state = {
          ...state,
          ui: { ...state.ui, crossroadsCard: payload.card, activeModal: 'crossroads' }
        }
        addLog(state, `Crossroads: ${payload.card.title}`)
        break
      case 'CROSSROADS_CARD':
        state = { ...state, ui: { ...state.ui, crossroadsCard: payload.card } }
        break
      case 'ZOMBIE_SURGE':
        addLog(state, 'Zombie surge! Locations overrun.')
        break
      case 'CRISIS_REVEAL':
        state = {
          ...state,
          ui: { ...state.ui, activeModal: 'crisis_reveal' }
        }
        if (payload.pass) {
          addLog(state, `Crisis passed! "${payload.crisisName || ''}" — ${payload.qualifyingCount || 0}/${payload.threshold || 0} cards contributed.`)
        } else {
          addLog(state, `Crisis failed! "${payload.crisisName || ''}" — morale -${payload.moralePenalty || 1}.`)
        }
        break
      case 'EXILE_VOTE':
        addLog(state, `Exile vote: survivor ${payload.targetSurvivorId || '—'} was voted out.`)
        break
      case 'GAME_OVER':
        state = {
          ...state,
          game: state.game ? { ...state.game, result: payload.result } : state.game,
          ui: { ...state.ui, activeModal: 'game_over' }
        }
        addLog(state, `Game over — ${payload.result}! Reason: ${payload.reason || ''}.`)
        break

      // ─── UI ─────────────────────────────────────────────────────────────────
      case 'UI_OPEN_MODAL':
        state = { ...state, ui: { ...state.ui, activeModal: payload.modal } }
        break
      case 'UI_CLOSE_MODAL':
        state = { ...state, ui: { ...state.ui, activeModal: null } }
        break
      case 'UI_ACTION_MENU':
        state = { ...state, ui: { ...state.ui, actionMenu: payload } }
        break
      case 'UI_OPEN_ACTION_PICKER':
        state = { ...state, ui: { ...state.ui, actionPicker: payload, activeModal: 'action_picker' } }
        break
      case 'UI_CLOSE_ACTION_PICKER':
        state = { ...state, ui: { ...state.ui, actionPicker: null, activeModal: null } }
        break

      default:
        break
    }

    if (state !== prev) notify()
  }

  function subscribe (fn) {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
  }

  function notify () {
    for (const fn of subscribers) {
      try { fn(state) } catch (err) { console.error('[Store] Subscriber error:', err) }
    }
  }

  function addLog (s, text) {
    s.ui = {
      ...s.ui,
      log: [...(s.ui.log || []).slice(-99), { text, time: Date.now() }]
    }
  }

  return { getState, dispatch, subscribe }
}
