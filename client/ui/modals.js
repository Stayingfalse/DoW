/**
 * Dead of Winter — Modals
 * Character sheet, action radial menu, crisis panel, crossroads, exile vote, game over.
 */
import { escHtml } from '../utils/escape-html.js'

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
    /* Crisis phase panel */
    #crisis-panel {
      display: none;
      position: fixed;
      top: 120px;
      right: 20px;
      background: #161b22;
      border: 1px solid #4d1d1d;
      border-radius: 10px;
      padding: 18px 28px;
      min-width: 260px;
      max-width: 340px;
      z-index: 55;
    }
    .crisis-panel-eyebrow {
      font-size: 0.65rem;
      color: #ffa198;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
    }
    .crisis-panel-name {
      font-size: 1rem;
      font-weight: 700;
      color: #e6edf3;
      margin-bottom: 4px;
    }
    .crisis-panel-desc {
      font-size: 0.85rem;
      color: #8b949e;
      margin-bottom: 10px;
    }
    .crisis-panel-info {
      font-size: 0.78rem;
      color: #ffa198;
    }
    /* Action picker steps */
    .picker-hint {
      color: #8b949e;
      font-size: 0.85rem;
      margin-bottom: 12px;
    }
    .picker-loc-meta {
      color: #8b949e;
      display: block;
      margin-top: 2px;
    }
    .picker-survivor-meta {
      color: #8b949e;
      display: block;
      margin-top: 2px;
    }
    #action-picker-back {
      background: #0d1117;
      border-color: #484f58;
      color: #8b949e;
    }
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

    <!-- Crisis phase panel (shown during crisis phase, not a blocking modal) -->
    <div id="crisis-panel">
      <div class="crisis-panel-eyebrow">Active Crisis</div>
      <div id="crisis-name" class="crisis-panel-name"></div>
      <div id="crisis-desc" class="crisis-panel-desc"></div>
      <div id="crisis-type-info" class="crisis-panel-info"></div>
    </div>

    <!-- Crisis reveal modal -->
    <div id="modal-crisis" class="modal-backdrop hidden">
      <div class="modal-box">
        <button class="modal-close" id="crisis-close">✕</button>
        <h3 id="crisis-resolve-title">Crisis Resolved</h3>
        <p id="crisis-result-text"></p>
      </div>
    </div>

    <!-- Action picker modal (multi-step survivor/location selection) -->
    <div id="modal-action-picker" class="modal-backdrop hidden">
      <div class="modal-box">
        <button class="modal-close" id="action-picker-close">✕</button>
        <h3 id="action-picker-title">Choose Action</h3>
        <div id="action-picker-step1">
          <p class="picker-hint">Select one of your survivors:</p>
          <div class="modal-choices" id="survivor-choices"></div>
        </div>
        <div id="action-picker-step2" style="display:none">
          <p class="picker-hint" id="action-picker-step2-label">Select a location:</p>
          <div class="modal-choices" id="location-choices"></div>
        </div>
        <div style="margin-top:12px">
          <button class="modal-choice-btn" id="action-picker-back" style="display:none">
            ← Back
          </button>
        </div>
      </div>
    </div>

    <!-- Game over modal -->
    <div id="modal-gameover" class="modal-backdrop hidden">
      <div class="modal-box">
        <h3>Game Over</h3>
        <div id="gameover-result" class="game-over-result"></div>
        <p id="gameover-reason"></p>
      </div>
    </div>

    <!-- Version mismatch modal -->
    <div id="modal-version-mismatch" class="modal-backdrop hidden">
      <div class="modal-box">
        <h3>⚠️ Update Required</h3>
        <p id="version-mismatch-text">The server has been updated. Please reload the page to continue.</p>
        <button class="btn btn-primary" id="version-reload-btn" style="margin-top:16px;width:100%">Reload Now</button>
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
  const crisisPanel = el.querySelector('#crisis-panel')
  el.querySelector('#crisis-close').addEventListener('click', () => {
    crisisModal.classList.add('hidden')
    store.dispatch({ type: 'UI_CLOSE_MODAL' })
  })

  // ─── Data caches ──────────────────────────────────────────────────────────
  let charactersCache = null

  async function getCharacters () {
    if (charactersCache) return charactersCache
    try {
      const res = await fetch('/game/characters')
      if (res.ok) { charactersCache = await res.json(); return charactersCache }
    } catch (_) {}
    return []
  }

  // ─── Action Picker ─────────────────────────────────────────────────────────
  const actionPickerModal = el.querySelector('#modal-action-picker')
  let pickerState = { action: null, survivorId: null }

  const LOCATION_NAMES = {
    colony: 'The Colony', gas_station: 'Gas Station', grocery_store: 'Grocery Store',
    hospital: 'Hospital', police_station: 'Police Station', school: 'School', library: 'Library'
  }

  el.querySelector('#action-picker-close').addEventListener('click', () => {
    actionPickerModal.classList.add('hidden')
    store.dispatch({ type: 'UI_CLOSE_ACTION_PICKER' })
  })

  el.querySelector('#action-picker-back').addEventListener('click', () => {
    el.querySelector('#action-picker-step1').style.display = 'block'
    el.querySelector('#action-picker-step2').style.display = 'none'
    el.querySelector('#action-picker-back').style.display = 'none'
    pickerState.survivorId = null
  })

  async function openActionPicker (action, state) {
    pickerState = { action, survivorId: null }
    const game = state.game
    const auth = state.auth || {}
    const player = (game.players || []).find(p => p.id === auth.playerId)
    const survivorIds = (player && player.survivorIds) || []

    const ACTION_LABELS = {
      ACTION_MOVE: '🚶 Move Survivor',
      ACTION_SEARCH: '🔍 Search Location',
      ACTION_ATTACK: '⚔️ Attack Zombie',
      ACTION_BARRICADE: '🪵 Build Barricade',
      ACTION_CLEAN: '🩹 Clean Wound'
    }
    el.querySelector('#action-picker-title').textContent = ACTION_LABELS[action] || action
    el.querySelector('#action-picker-step1').style.display = 'block'
    el.querySelector('#action-picker-step2').style.display = 'none'
    el.querySelector('#action-picker-back').style.display = 'none'

    // Load character names for display
    const chars = await getCharacters()
    const charMap = new Map(chars.map(c => [c.id, c]))

    // Step 1: pick survivor
    const survivorChoicesEl = el.querySelector('#survivor-choices')
    survivorChoicesEl.innerHTML = survivorIds.map(sid => {
      // Find which location the survivor is at
      let locId = null
      for (const [lid, loc] of Object.entries(game.locations || {})) {
        if ((loc.survivor_ids || []).includes(sid)) { locId = lid; break }
      }
      const locName = locId ? (LOCATION_NAMES[locId] || locId) : 'Unknown'
      const charName = charMap.has(sid) ? charMap.get(sid).name : sid
      return `
        <button class="modal-choice-btn" data-survivor="${escHtml(sid)}">
          👤 ${escHtml(charName)}
          <small class="picker-survivor-meta">📍 ${escHtml(locName)}</small>
        </button>
      `
    }).join('') || '<p class="picker-hint">No survivors assigned.</p>'

    survivorChoicesEl.querySelectorAll('.modal-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pickerState.survivorId = btn.dataset.survivor
        pickStep2(action, pickerState.survivorId, state)
      })
    })

    actionPickerModal.classList.remove('hidden')
  }

  function pickStep2 (action, survivorId, state) {
    const game = state.game
    el.querySelector('#action-picker-step1').style.display = 'none'
    el.querySelector('#action-picker-step2').style.display = 'block'
    el.querySelector('#action-picker-back').style.display = 'inline-block'

    // For CLEAN action — no location needed, submit immediately
    if (action === 'ACTION_CLEAN') {
      ws.send(action, { survivorId })
      actionPickerModal.classList.add('hidden')
      store.dispatch({ type: 'UI_CLOSE_ACTION_PICKER' })
      return
    }

    // For BARRICADE — auto-submit at survivor's current location
    if (action === 'ACTION_BARRICADE') {
      ws.send(action, { survivorId })
      actionPickerModal.classList.add('hidden')
      store.dispatch({ type: 'UI_CLOSE_ACTION_PICKER' })
      return
    }

    // Step 2: pick location
    const label = action === 'ACTION_MOVE' ? 'Move to which location?' : 'At which location?'
    el.querySelector('#action-picker-step2-label').textContent = label

    const locations = game.locations || {}
    const locationChoicesEl = el.querySelector('#location-choices')
    locationChoicesEl.innerHTML = Object.entries(locations).map(([locId, loc]) => {
      const name = LOCATION_NAMES[locId] || locId
      const zombies = loc.zombie_count || 0
      const barricades = loc.barricade_count || 0
      return `
        <button class="modal-choice-btn" data-loc="${escHtml(locId)}">
          ${escHtml(name)}
          <small class="picker-loc-meta">
            🧟 ${zombies} zombies · 🪵 ${barricades} barricades
          </small>
        </button>
      `
    }).join('')

    locationChoicesEl.querySelectorAll('.modal-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const locId = btn.dataset.loc
        ws.send(action, { survivorId, locationId: locId, toLocationId: locId })
        actionPickerModal.classList.add('hidden')
        store.dispatch({ type: 'UI_CLOSE_ACTION_PICKER' })
      })
    })
  }

  // ─── Version mismatch ──────────────────────────────────────────────────────
  el.querySelector('#version-reload-btn').addEventListener('click', () => {
    window.location.reload()
  })

  // ─── Store subscription ────────────────────────────────────────────────────
  store.subscribe((state) => {
    const modal = state.ui.activeModal

    // Crisis panel — visible during the crisis phase to show the active card
    const game = state.game
    if (game && game.phase === 'crisis' && game.currentCrisis) {
      const c = game.currentCrisis
      el.querySelector('#crisis-name').textContent = c.name || 'Unknown Crisis'
      el.querySelector('#crisis-desc').textContent = c.description || ''
      el.querySelector('#crisis-type-info').textContent =
        `Contribute ${c.threshold} ${c.contributionType} card${c.threshold !== 1 ? 's' : ''} to pass.`
      crisisPanel.style.display = 'block'
    } else {
      crisisPanel.style.display = 'none'
    }
    // Action picker
    if (modal === 'action_picker' && state.ui.actionPicker) {
      openActionPicker(state.ui.actionPicker.action, state).catch(err => {
        console.error('[Modals] Action picker error:', err)
      })
    }

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
      text.textContent = 'See the event log for details.'
      crisisModal.classList.remove('hidden')
    }

    // Game over
    if (modal === 'game_over' && state.game) {
      const resultEl = el.querySelector('#gameover-result')
      const reasonEl = el.querySelector('#gameover-reason')
      const result = (state.game && state.game.result) || 'unknown'
      resultEl.textContent = result === 'win' ? 'Victory!' : 'Defeat'
      resultEl.className = `game-over-result game-over-${result === 'win' ? 'win' : 'loss'}`
      const reasonMap = {
        morale_zero: 'Colony morale collapsed.',
        rounds_exceeded: 'The survivors did not complete the scenario in time.',
        scenario_complete: 'Scenario objectives achieved!'
      }
      reasonEl.textContent = reasonMap[state.game.reason || ''] || ''
      el.querySelector('#modal-gameover').classList.remove('hidden')
    }

    // Version mismatch
    if (modal === 'version_mismatch') {
      el.querySelector('#modal-version-mismatch').classList.remove('hidden')
    }
  })
}
