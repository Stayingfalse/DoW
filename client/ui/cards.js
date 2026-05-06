/**
 * Dead of Winter — Item Hand UI
 * Bottom-of-screen card hand. Phase 6: full card play. Phase 1: stub.
 */

export function initCards (store, ws) {
  const el = document.getElementById('cards-overlay')

  const styles = `
    #cards-hand {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: -16px;
      padding: 0 24px 12px;
      pointer-events: none;
    }
    #cards-hand.hidden { display: none; }
  `
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  el.innerHTML = `<div id="cards-hand" class="hidden"></div>`

  store.subscribe((state) => {
    const hand = state.privateState.hand || []
    if (!hand.length) return
    // Phase 6: render card objects
  })
}
