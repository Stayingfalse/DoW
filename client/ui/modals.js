/**
 * Dead of Winter — Modals
 * Character sheet, action radial menu, crisis panel, crossroads, exile vote, game over.
 */

export function initModals (store, ws) {
  const el = document.getElementById('modals-overlay')

  const styles = `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 60;
    }
    .modal-backdrop.hidden { display: none; }
    .modal-box {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 32px 40px;
      max-width: 520px;
      width: 90%;
    }
    .modal-box h3 {
      font-size: 1.2rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #c9d1d9;
      margin-bottom: 16px;
    }
    .modal-box p {
      color: #8b949e;
      font-size: 0.95rem;
      line-height: 1.55;
      margin-bottom: 20px;
    }
    .modal-choices { display: flex; flex-direction: column; gap: 10px; }
    .modal-choice-btn {
      padding: 11px 16px;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      font-size: 0.9rem;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s;
    }
    .modal-choice-btn:hover { background: #2d333b; }
    .modal-close {
      float: right;
      background: none;
      border: none;
      color: #8b949e;
      font-size: 1.4rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .game-over-result {
      font-size: 2rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin: 16px 0;
    }
    .game-over-win { color: #3fb950; }
    .game-over-loss { color: #f85149; }
  `
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  el.innerHTML = `
    <!-- Crossroads modal -->
    <div id="modal-crossroads" class="modal-backdrop hidden">
      <div class="modal-box">
        <button class="modal-close" id="crossroads-close">✕</button>
        <h3 id="crossroads-title">Crossroads</h3>
        <p id="crossroads-narrative"></p>
        <div class="modal-choices" id="crossroads-choices"></div>
      </div>
    </div>

    <!-- Crisis reveal modal -->
    <div id="modal-crisis" class="modal-backdrop hidden">
      <div class="modal-box">
        <button class="modal-close" id="crisis-close">✕</button>
        <h3>Crisis Resolved</h3>
        <p id="crisis-result-text"></p>
      </div>
    </div>

    <!-- Game over modal -->
    <div id="modal-gameover" class="modal-backdrop hidden">
      <div class="modal-box">
        <h3>Game Over</h3>
        <div id="gameover-result" class="game-over-result"></div>
        <p id="gameover-betrayer"></p>
      </div>
    </div>
  `

  // ─── Crossroads ────────────────────────────────────────────────────────────
  const crossroadsModal = el.querySelector('#modal-crossroads')
  el.querySelector('#crossroads-close').addEventListener('click', () => {
    crossroadsModal.classList.add('hidden')
    store.dispatch({ type: 'UI_CLOSE_MODAL' })
  })

  // ─── Crisis ────────────────────────────────────────────────────────────────
  const crisisModal = el.querySelector('#modal-crisis')
  el.querySelector('#crisis-close').addEventListener('click', () => {
    crisisModal.classList.add('hidden')
    store.dispatch({ type: 'UI_CLOSE_MODAL' })
  })

  // ─── Store subscription ────────────────────────────────────────────────────
  store.subscribe((state) => {
    const modal = state.ui.activeModal

    // Crossroads
    if (modal === 'crossroads' && state.ui.crossroadsCard) {
      const card = state.ui.crossroadsCard
      el.querySelector('#crossroads-title').textContent = card.title || 'Crossroads'
      el.querySelector('#crossroads-narrative').textContent = card.narrative || ''

      const choicesEl = el.querySelector('#crossroads-choices')
      choicesEl.innerHTML = (card.choices || []).map(c => `
        <button class="modal-choice-btn" data-id="${escHtml(c.id)}">
          <strong>${escHtml(c.text)}</strong>
          <br><small style="color:#8b949e">${escHtml(c.outcome || '')}</small>
        </button>
      `).join('')

      choicesEl.querySelectorAll('.modal-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          ws.send('CROSSROADS_CHOICE', { crossroadsId: card.id, choice: btn.dataset.id })
          crossroadsModal.classList.add('hidden')
          store.dispatch({ type: 'UI_CLOSE_MODAL' })
        })
      })

      crossroadsModal.classList.remove('hidden')
    }

    // Crisis reveal
    if (modal === 'crisis_reveal') {
      const text = el.querySelector('#crisis-result-text')
      text.textContent = 'See event log for details.'
      crisisModal.classList.remove('hidden')
    }

    // Game over
    if (modal === 'game_over' && state.game) {
      const resultEl = el.querySelector('#gameover-result')
      const betrayerEl = el.querySelector('#gameover-betrayer')
      const result = (state.game && state.game.result) || 'unknown'
      resultEl.textContent = result === 'win' ? 'Victory!' : 'Defeat'
      resultEl.className = `game-over-result game-over-${result === 'win' ? 'win' : 'loss'}`
      betrayerEl.textContent = ''
      el.querySelector('#modal-gameover').classList.remove('hidden')
    }
  })
}

function escHtml (str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
