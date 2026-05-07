/**
 * Dead of Winter — Lobby UI
 * Password entry, display name, create/join game, presence list.
 */
import { escHtml } from '../utils/escape-html.js'

export function initLobby (store, ws) {
  const el = document.getElementById('lobby-overlay')

  const styles = `
    #lobby {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(13, 17, 23, 0.92);
      z-index: 50;
    }
    #lobby.hidden { display: none; }
    .lobby-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 40px 48px;
      min-width: 440px;
      max-width: 520px;
    }
    .lobby-card h2 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #c9d1d9;
      margin-bottom: 28px;
    }
    .lobby-field { margin-bottom: 16px; }
    .lobby-field label {
      display: block;
      font-size: 0.78rem;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .lobby-field input {
      width: 100%;
      padding: 10px 14px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .lobby-field input:focus { border-color: #58a6ff; }
    .lobby-actions { display: flex; gap: 12px; margin-top: 24px; }
    .btn {
      flex: 1;
      padding: 11px 0;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: #238636; color: #ffffff; }
    .btn-secondary { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; }
    .lobby-error {
      color: #f85149;
      font-size: 0.82rem;
      margin-top: 10px;
      min-height: 20px;
    }
    .lobby-divider {
      border: none;
      border-top: 1px solid #21262d;
      margin: 24px 0;
    }
    .lobby-game-id {
      display: flex;
      gap: 8px;
    }
    .lobby-game-id input { flex: 1; }
    .presence-list {
      margin-top: 8px;
      max-height: 120px;
      overflow-y: auto;
    }
    .presence-item {
      font-size: 0.85rem;
      color: #8b949e;
      padding: 3px 0;
    }
    .presence-item::before { content: '● '; color: #3fb950; }
  `

  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  el.innerHTML = `
    <div id="lobby">
      <div class="lobby-card">
        <h2>Dead of Winter</h2>
        <div class="lobby-field">
          <label>Display Name</label>
          <input id="lobby-name" type="text" placeholder="Your name" maxlength="32" autocomplete="off" />
        </div>
        <div class="lobby-field">
          <label>Lobby Password</label>
          <input id="lobby-password" type="password" placeholder="Password" />
        </div>
        <div class="lobby-actions">
          <button class="btn btn-primary" id="lobby-join-btn">Enter Lobby</button>
        </div>
        <div class="lobby-error" id="lobby-error"></div>

        <hr class="lobby-divider" />

        <div id="lobby-game-section" style="display:none">
          <div class="lobby-field">
            <label>Create New Game</label>
            <select id="lobby-scenario" style="width:100%;padding:10px 14px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#e6edf3;font-size:1rem;">
              <option value="scenario_1">Raxxon</option>
              <option value="scenario_2">Kodiak Jack</option>
              <option value="scenario_3">The Griswolds</option>
              <option value="scenario_4">Don't Open the Door</option>
              <option value="scenario_5">Fuel for a Fire</option>
              <option value="scenario_6">A Nightmare to Remember</option>
              <option value="scenario_7">Bandits</option>
              <option value="scenario_8">The Long Road Ahead</option>
            </select>
          </div>
          <button class="btn btn-primary" id="lobby-create-btn">Create Game</button>

          <hr class="lobby-divider" />

          <div class="lobby-field">
            <label>Join Existing Game</label>
            <div class="lobby-game-id">
              <input id="lobby-gameid" type="text" placeholder="Game ID" autocomplete="off" />
              <button class="btn btn-secondary" id="lobby-joingame-btn" style="flex:0;padding:11px 18px">Join</button>
            </div>
          </div>

          <hr class="lobby-divider" />

          <div>
            <div style="font-size:0.78rem;color:#8b949e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">In Lobby</div>
            <div class="presence-list" id="presence-list"></div>
          </div>

          <hr class="lobby-divider" />

          <button class="btn btn-primary" id="lobby-start-btn" style="width:100%;margin-top:4px;" disabled>Start Game</button>
        </div>
      </div>
    </div>
  `

  const nameInput = el.querySelector('#lobby-name')
  const passwordInput = el.querySelector('#lobby-password')
  const joinBtn = el.querySelector('#lobby-join-btn')
  const errorEl = el.querySelector('#lobby-error')
  const gameSection = el.querySelector('#lobby-game-section')
  const createBtn = el.querySelector('#lobby-create-btn')
  const scenarioSelect = el.querySelector('#lobby-scenario')
  const gameIdInput = el.querySelector('#lobby-gameid')
  const joinGameBtn = el.querySelector('#lobby-joingame-btn')
  const presenceList = el.querySelector('#presence-list')
  const startGameBtn = el.querySelector('#lobby-start-btn')

  function requireConnection () {
    const state = store.getState()
    if (state.ws && state.ws.connected) return true
    errorEl.textContent = 'Connecting to game server…'
    return false
  }

  function syncLobbyControls (state) {
    const connected = state.ws && state.ws.connected
    const inSetupGame = state.game && state.game.phase === 'setup'

    createBtn.disabled = !connected
    joinGameBtn.disabled = !connected
    startGameBtn.disabled = !(connected && inSetupGame)

    if (state.auth && state.auth.isAuthenticated && !connected) {
      errorEl.textContent = 'Connecting to game server…'
    } else if (connected && errorEl.textContent === 'Connecting to game server…') {
      errorEl.textContent = ''
    }

    if (state.game && state.game.id) {
      gameIdInput.value = state.game.id
    }

    const setupPlayers = inSetupGame
      ? (state.game.players || []).map(player => ({
          id: player.id,
          displayName: player.displayName
        }))
      : []

    const visiblePlayers = setupPlayers.length > 0
      ? setupPlayers
      : (state.lobby.players || []).map(player => ({
          id: player.playerId,
          displayName: player.displayName
        }))

    if (state.auth && state.auth.isAuthenticated) {
      const selfId = state.auth.playerId
      const alreadyListed = visiblePlayers.some(player => player.id === selfId)
      if (!alreadyListed) {
        visiblePlayers.unshift({
          id: selfId,
          displayName: state.auth.displayName
        })
      }
    }

    presenceList.innerHTML = visiblePlayers
      .map(player => `<div class="presence-item">${escHtml(player.displayName)}</div>`)
      .join('')
  }

  joinBtn.addEventListener('click', async () => {
    errorEl.textContent = ''
    const displayName = nameInput.value.trim()
    const password = passwordInput.value

    if (!displayName) { errorEl.textContent = 'Name is required.'; return }
    if (!password) { errorEl.textContent = 'Password is required.'; return }

    try {
      const res = await fetch('/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, password })
      })
      const data = await res.json()
      if (!res.ok) { errorEl.textContent = data.error || 'Login failed.'; return }

      store.dispatch({ type: 'AUTH_SUCCESS', payload: { playerId: data.playerId, displayName: data.displayName } })
      gameSection.style.display = 'block'
      joinBtn.textContent = 'Joined!'
      joinBtn.disabled = true
      nameInput.disabled = true
      passwordInput.disabled = true
      ws.connect()
    } catch (err) {
      errorEl.textContent = 'Network error. Try again.'
    }
  })

  createBtn.addEventListener('click', () => {
    if (!requireConnection()) return
    ws.send('CREATE_GAME', { scenario: scenarioSelect.value })
  })

  joinGameBtn.addEventListener('click', () => {
    if (!requireConnection()) return
    const gameId = gameIdInput.value.trim()
    if (!gameId) return
    ws.send('JOIN_GAME', { gameId })
  })

  startGameBtn.addEventListener('click', () => {
    if (!requireConnection()) return
    ws.send('START_GAME', {})
  })

  ws.on('ERROR', (payload) => {
    errorEl.textContent = (payload && payload.message) || 'Unable to process request right now. Check your connection and try again.'
  })

  ws.on('GAME_STATE', () => {
    errorEl.textContent = ''
  })

  // Hide lobby when game starts
  store.subscribe((state) => {
    if (state.game && state.game.phase !== 'setup') {
      document.getElementById('lobby').classList.add('hidden')
    }
    syncLobbyControls(state)
  })

  syncLobbyControls(store.getState())
}
