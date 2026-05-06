/**
 * Dead of Winter — Action Controls Panel
 * Phase 4: Action buttons (Move / Search / Attack / Barricade / Clean)
 *          + End Turn. Active only when it's the local player's turn in action phase.
 * Multi-step flow is handled via picker modals in modals.js, which this
 * module triggers via store dispatches.
 */

export function initActions (store, ws) {
  const el = document.getElementById('actions-overlay')
  if (!el) return

  const styles = `
    #actions-panel {
      position: fixed;
      bottom: 160px;
      left: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 22;
      pointer-events: none;
    }
    #actions-panel.hidden { display: none; }
    #actions-panel.active { pointer-events: auto; }
    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 7px;
      border: 1px solid #30363d;
      background: rgba(22, 27, 34, 0.92);
      color: #c9d1d9;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, opacity 0.15s;
      min-width: 140px;
    }
    .action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .action-btn:not(:disabled):hover {
      background: rgba(33, 38, 45, 0.98);
      border-color: #58a6ff;
    }
    .action-btn .btn-icon { font-size: 1rem; }
    #end-turn-btn {
      background: #0d419d;
      border-color: #1f6feb;
      color: #79c0ff;
      margin-top: 4px;
    }
    #end-turn-btn:not(:disabled):hover {
      background: #1158c7;
      border-color: #58a6ff;
    }
    .action-btn.pending {
      border-color: #e3b341;
      color: #e3b341;
      animation: pulse-border 1s ease infinite;
    }
    @keyframes pulse-border {
      0%, 100% { box-shadow: none; }
      50% { box-shadow: 0 0 0 2px rgba(227,179,65,0.35); }
    }

    /* Reconnect toast */
    #reconnect-toast {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #4d1d1d;
      border: 1px solid #f85149;
      border-radius: 6px;
      padding: 8px 20px;
      color: #ffa198;
      font-size: 0.82rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      z-index: 90;
      transition: opacity 0.3s;
    }
    #reconnect-toast.hidden { display: none; }
  `

  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  el.innerHTML = `
    <div id="actions-panel" class="hidden">
      <button class="action-btn" id="act-move"      data-action="ACTION_MOVE">
        <span class="btn-icon">🚶</span> Move
      </button>
      <button class="action-btn" id="act-search"    data-action="ACTION_SEARCH">
        <span class="btn-icon">🔍</span> Search
      </button>
      <button class="action-btn" id="act-attack"    data-action="ACTION_ATTACK">
        <span class="btn-icon">⚔️</span> Attack
      </button>
      <button class="action-btn" id="act-barricade" data-action="ACTION_BARRICADE">
        <span class="btn-icon">🪵</span> Barricade
      </button>
      <button class="action-btn" id="act-clean"     data-action="ACTION_CLEAN">
        <span class="btn-icon">🩹</span> Clean Wound
      </button>
      <button class="action-btn" id="end-turn-btn">
        <span class="btn-icon">✅</span> End Turn
      </button>
    </div>
    <div id="reconnect-toast" class="hidden">Reconnecting…</div>
  `

  const panel = el.querySelector('#actions-panel')
  const reconnectToast = el.querySelector('#reconnect-toast')

  // ─── End Turn ────────────────────────────────────────────────────────────────
  el.querySelector('#end-turn-btn').addEventListener('click', () => {
    ws.send('END_TURN', {})
  })

  // ─── Action buttons ──────────────────────────────────────────────────────────
  el.querySelectorAll('.action-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action
      store.dispatch({ type: 'UI_OPEN_ACTION_PICKER', payload: { action } })
    })
  })

  // ─── Store subscription ───────────────────────────────────────────────────────
  store.subscribe((state) => {
    const game = state.game
    const auth = state.auth || {}

    const isMyTurn = game && game.activePlayerId === auth.playerId
    const inActionPhase = game && game.phase === 'action'
    const hasDice = game && (game.actionDice || []).length > 0

    const active = isMyTurn && inActionPhase

    if (!game || game.phase === 'setup') {
      panel.classList.add('hidden')
      panel.classList.remove('active')
    } else {
      panel.classList.remove('hidden')
      panel.classList.toggle('active', active)
    }

    // Disable individual buttons when no dice left or not my turn
    el.querySelectorAll('.action-btn[data-action]').forEach(btn => {
      btn.disabled = !active || !hasDice
    })
    el.querySelector('#end-turn-btn').disabled = !isMyTurn || !game || game.phase === 'setup'

    // Reconnect toast
    const ws_state = state.wsState || ''
    reconnectToast.classList.toggle('hidden', ws_state !== 'reconnecting')
  })
}
