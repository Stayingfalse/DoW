/**
 * Dead of Winter — Main Entry Point
 * Phase 1: Initialises scene, UI, and WS connection.
 */
import { initScene } from './render/scene.js'
import { initStore } from './state/store.js'
import { WsClient } from './ws-client.js'
import { initLobby } from './ui/lobby.js'
import { initHud } from './ui/hud.js'
import { initCards } from './ui/cards.js'
import { initModals } from './ui/modals.js'
import { initLog } from './ui/log.js'

const loadingEl = document.getElementById('loading')
const loadingBar = document.getElementById('loading-bar')
const loadingText = document.getElementById('loading-text')

function setProgress (pct, text) {
  loadingBar.style.width = `${pct}%`
  loadingText.textContent = text
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
    initModals(store, ws)
    initLog(store)

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
