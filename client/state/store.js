/**
 * Dead of Winter — Client State Store
 * Simple observable store — no framework dependency.
 */

const initialState = {
  ws: { connected: false },
  auth: { playerId: null, displayName: null, isAuthenticated: false },
  lobby: { players: [] },
  game: null,
  privateState: { hand: [], secretObjective: null, isBetrayer: false },
  ui: {
    activeModal: null,
    crossroadsCard: null,
    actionMenu: null,
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
        state = { ...state, ws: { connected: true } }
        break
      case 'WS_DISCONNECTED':
        state = { ...state, ws: { connected: false } }
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
        addLog(state, `Phase changed to ${payload.phase} (round ${payload.round}).`)
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
        addLog(state, payload.pass ? 'Crisis passed!' : 'Crisis failed!')
        break
      case 'GAME_OVER':
        state = {
          ...state,
          ui: { ...state.ui, activeModal: 'game_over' }
        }
        addLog(state, `Game over — ${payload.result}!`)
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
