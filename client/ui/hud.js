/**
 * Dead of Winter — HUD
 * Morale track, round track, phase indicator, active player.
 */

export function initHud (store) {
  const el = document.getElementById('hud-overlay')

  const styles = `
    #hud {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 24px;
      background: rgba(22, 27, 34, 0.88);
      border: 1px solid #30363d;
      border-radius: 10px;
      padding: 10px 24px;
      pointer-events: none;
    }
    #hud.hidden { display: none; }
    .hud-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .hud-label {
      font-size: 0.65rem;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .hud-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: #e6edf3;
    }
    .hud-divider {
      width: 1px;
      height: 32px;
      background: #30363d;
    }
    .morale-dots {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }
    .morale-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #30363d;
      transition: background 0.3s;
    }
    .morale-dot.active { background: #58a6ff; }
    .morale-dot.critical { background: #f85149; }
    .phase-badge {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 3px 8px;
      border-radius: 4px;
      background: #21262d;
      color: #8b949e;
    }
    .phase-badge.action { background: #0d419d; color: #79c0ff; }
    .phase-badge.crisis { background: #4d1d1d; color: #ffa198; }
    .phase-badge.colony { background: #1a3424; color: #56d364; }
    .phase-badge.cleanup { background: #2b2015; color: #e3b341; }
  `
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  el.innerHTML = `
    <div id="hud" class="hidden">
      <div class="hud-item">
        <span class="hud-label">Round</span>
        <span class="hud-value" id="hud-round">1 / 10</span>
      </div>
      <div class="hud-divider"></div>
      <div class="hud-item">
        <span class="hud-label">Morale</span>
        <div class="morale-dots" id="hud-morale-dots"></div>
      </div>
      <div class="hud-divider"></div>
      <div class="hud-item">
        <span class="hud-label">Food</span>
        <span class="hud-value" id="hud-food">0</span>
      </div>
      <div class="hud-divider"></div>
      <div class="hud-item">
        <span class="hud-label">Phase</span>
        <span class="phase-badge" id="hud-phase">setup</span>
      </div>
      <div class="hud-divider"></div>
      <div class="hud-item">
        <span class="hud-label">Active</span>
        <span class="hud-value" id="hud-active">—</span>
      </div>
      <div class="hud-divider"></div>
      <div class="hud-item">
        <span class="hud-label">Dice</span>
        <span class="hud-value" id="hud-dice">—</span>
      </div>
    </div>
  `

  const hudEl = el.querySelector('#hud')
  const roundEl = el.querySelector('#hud-round')
  const moraleDotsEl = el.querySelector('#hud-morale-dots')
  const foodEl = el.querySelector('#hud-food')
  const phaseEl = el.querySelector('#hud-phase')
  const activeEl = el.querySelector('#hud-active')
  const diceEl = el.querySelector('#hud-dice')

  store.subscribe((state) => {
    const game = state.game
    if (!game) return

    hudEl.classList.remove('hidden')
    roundEl.textContent = `${game.round || 1} / ${game.scenarioRounds || 10}`

    // Morale dots (max 10)
    const morale = game.morale || 0
    moraleDotsEl.innerHTML = Array.from({ length: 10 }, (_, i) => {
      const active = i < morale
      const critical = active && morale <= 2
      return `<div class="morale-dot${active ? (critical ? ' critical' : ' active') : ''}"></div>`
    }).join('')

    // Food supply
    foodEl.textContent = game.food || 0

    // Phase badge
    const phase = game.phase || 'setup'
    phaseEl.textContent = phase
    phaseEl.className = `phase-badge ${phase}`

    // Active player
    const activePid = game.activePlayerId
    const activePlayer = (game.players || []).find(p => p.id === activePid)
    activeEl.textContent = activePlayer ? activePlayer.displayName : '—'

    // Dice remaining
    const diceCount = (game.actionDice || []).length
    diceEl.textContent = phase === 'action' ? diceCount : '—'
  })
}
