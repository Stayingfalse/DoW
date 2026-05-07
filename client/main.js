/**
 * Dead of Winter — Main Entry Point
 * Phase 1: Initialises scene, UI, and WS connection.
 * Phase 6: Audio engine wired to game events.
 */
import { initScene } from './render/scene.js'
import { initStore } from './state/store.js'
import { WsClient } from './ws-client.js'
import { initZoomControls } from './ui/zoom-controls.js'
import { initLobby } from './ui/lobby.js'
import { initHud } from './ui/hud.js'
import { initCards } from './ui/cards.js'
import { initActions } from './ui/actions.js'
import { initModals } from './ui/modals.js'
import { initLog } from './ui/log.js'
import { initAudioControls } from './ui/audio-controls.js'
import {
  startAmbientLoop, stopAmbientLoop,
  playDiceRoll, playZombieAttack, playSurvivorDeath,
  playMoraleDrop, playCrisisReveal, playCrisisPass, playCrisisFail,
  playCrossroadsTrigger, playGameOverLoss, playGameOverWin
} from './audio/audio.js'

const loadingEl = document.getElementById('loading')
const loadingBar = document.getElementById('loading-bar')
const loadingText = document.getElementById('loading-text')

function setProgress (pct, text) {
  loadingBar.style.width = `${pct}%`
  loadingText.textContent = text
}

// Returns the locationId of the active player's first survivor, or null.
function _activePlayerLocation (state) {
  const game = state.game
  if (!game) return null
  const player = (game.players || []).find(p => p.id === game.activePlayerId)
  if (!player || !player.survivorIds || !player.survivorIds.length) return null
  const sid = player.survivorIds[0]
  for (const [locId, loc] of Object.entries(game.locations || {})) {
    if ((loc.survivor_ids || []).includes(sid)) return locId
  }
  return null
}

async function main () {
  try {
    setProgress(10, 'Initialising store…')
    const store = initStore()

    setProgress(25, 'Building scene…')
    const scene = await initScene(document.getElementById('canvas-container'), store)

    setProgress(50, 'Preparing UI…')
    const ws = new WsClient(store)
    initLobby(store, ws)
    initHud(store)
    initCards(store, ws)
    initActions(store, ws)
    initModals(store, ws)
    initLog(store)
    initAudioControls()
    initZoomControls(scene)

    // ─── Audio: WS event hooks ──────────────────────────────────────────────
    // Delay between crisis reveal sting and pass/fail resolution cue (ms)
    const CRISIS_RESOLUTION_DELAY_MS = 1800
    ws.on('ZOMBIE_SURGE',       ()  => playZombieAttack().catch(() => {}))
    ws.on('CROSSROADS_TRIGGER', ()  => playCrossroadsTrigger().catch(() => {}))
    ws.on('CRISIS_REVEAL',      (p) => {
      playCrisisReveal().catch(() => {})
      setTimeout(() => {
        (p && p.pass ? playCrisisPass : playCrisisFail)().catch(() => {})
      }, CRISIS_RESOLUTION_DELAY_MS)
    })
    ws.on('GAME_OVER', (p) => {
      const win = p && p.result === 'win'
      ;(win ? playGameOverWin : playGameOverLoss)().catch(() => {})
    })
    ws.on('ACTION_RESULT', (p) => {
      if (!p) return
      const n = (p.narration || '').toLowerCase()
      if (n.includes('attack') || n.includes('kill') || n.includes('zombie')) {
        playZombieAttack().catch(() => {})
      } else if (n.includes('search') || n.includes('found') || n.includes('item')) {
        playDiceRoll().catch(() => {})
      } else if (n.includes('barricade')) {
        /* no cue */
      } else if (n.includes('death') || n.includes('died') || n.includes('wound')) {
        playSurvivorDeath().catch(() => {})
      }
    })

    // ─── Audio: ambient loop + morale drop via store subscription ──────────
    let prevMorale = null
    let prevPhase  = null
    store.subscribe((state) => {
      const game = state.game
      if (!game) { stopAmbientLoop(); prevMorale = null; prevPhase = null; return }

      // Morale drop
      if (prevMorale !== null && game.morale < prevMorale) playMoraleDrop().catch(() => {})
      prevMorale = game.morale

      // Start/update ambient when game phase moves out of setup
      if (game.phase !== 'setup') {
        const locId = _activePlayerLocation(state) || game.phase
        if (prevPhase !== game.phase) startAmbientLoop(locId).catch(() => {})
      }
      prevPhase = game.phase
    })

    setProgress(80, 'Registering service worker…')
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch (err) {
        console.warn('SW registration failed:', err)
      }
    }

    setProgress(100, 'Ready!')
    setTimeout(() => loadingEl.classList.add('hidden'), 400)

    // Start render loop
    scene.start()
  } catch (err) {
    loadingText.textContent = `Error: ${err.message}`
    console.error(err)
  }
}

main()
