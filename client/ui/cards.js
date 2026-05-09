/**
 * Dead of Winter — Item Hand UI
 * Phase 4: Fan-layout card hand with type colour-coding, crisis contribution,
 *          and item-use affordances.
 */
import { escHtml } from '../utils/escape-html.js'

// Must match server/game/crisis.js
const FOOD_STORE_TOKEN_ID = '__FOOD_STORE__'

const TYPE_COLOURS = {
  food:     { bg: '#0f2e0f', border: '#3fb950', accent: '#3fb950', label: '#56d364' },
  medicine: { bg: '#0d1f3c', border: '#58a6ff', accent: '#58a6ff', label: '#79c0ff' },
  weapon:   { bg: '#2e0f0f', border: '#f85149', accent: '#f85149', label: '#ffa198' },
  fuel:     { bg: '#2b1a06', border: '#e3b341', accent: '#e3b341', label: '#f0c060' },
  tool:     { bg: '#161b22', border: '#8b949e', accent: '#8b949e', label: '#c9d1d9' },
  junk:     { bg: '#161b22', border: '#484f58', accent: '#484f58', label: '#6e7681' }
}

const TYPE_ICON = {
  food: '🥫', medicine: '💊', weapon: '🔫', fuel: '⛽', tool: '🔧', junk: '🔩'
}

export function initCards (store, ws) {
  const el = document.getElementById('cards-overlay')

  const styles = `
    #cards-hand {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 0;
      padding: 0 24px 16px;
      pointer-events: none;
      z-index: 20;
      min-height: 148px;
      max-width: 95vw;
      overflow: visible;
    }
    #cards-hand.hidden { display: none; }
    .item-card {
      position: relative;
      width: 88px;
      min-height: 124px;
      border-radius: 8px;
      border: 1.5px solid #30363d;
      padding: 10px 8px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      pointer-events: auto;
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s;
      transform-origin: center bottom;
      user-select: none;
      margin: 0 -8px;
    }
    .item-card:hover {
      transform: translateY(-16px) scale(1.06);
      z-index: 30;
    }
    .item-card.selected {
      transform: translateY(-24px) scale(1.08);
      box-shadow: 0 0 0 2px #58a6ff, 0 8px 24px rgba(0,0,0,0.6);
      z-index: 35;
    }
    .item-card.contribute-selected {
      transform: translateY(-24px) scale(1.08);
      box-shadow: 0 0 0 2px #ffa198, 0 8px 24px rgba(0,0,0,0.6);
      z-index: 35;
    }
    .card-icon {
      font-size: 1.6rem;
      line-height: 1;
      margin-bottom: 2px;
    }
    .card-name {
      font-size: 0.65rem;
      font-weight: 700;
      text-align: center;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .card-type-badge {
      font-size: 0.58rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 2px 5px;
      border-radius: 3px;
      margin-top: auto;
    }
    .card-effect {
      font-size: 0.58rem;
      color: #8b949e;
      text-align: center;
      line-height: 1.3;
      display: none;
    }
    .item-card.selected .card-effect { display: block; }

    /* Crisis contribute overlay */
    #crisis-contrib-bar {
      position: fixed;
      bottom: 148px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(22, 27, 34, 0.96);
      border: 1px solid #4d1d1d;
      border-radius: 8px;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 25;
      pointer-events: auto;
    }
    #crisis-contrib-bar.hidden { display: none; }
    #crisis-contrib-label {
      font-size: 0.78rem;
      color: #ffa198;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    #crisis-contrib-count {
      font-size: 0.78rem;
      color: #e6edf3;
      min-width: 80px;
    }
    #crisis-contrib-food {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: 10px;
      padding-left: 10px;
      border-left: 1px solid #30363d;
    }
    #crisis-contrib-food.hidden { display: none; }
    .contrib-food-label {
      font-size: 0.72rem;
      color: #56d364;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .contrib-food-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid #30363d;
      background: #21262d;
      color: #e6edf3;
      cursor: pointer;
      line-height: 1;
      font-weight: 800;
    }
    .contrib-food-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #contrib-food-count {
      min-width: 18px;
      text-align: center;
      color: #e6edf3;
      font-weight: 700;
      font-size: 0.85rem;
    }
    #contrib-food-available {
      font-size: 0.72rem;
      color: #8b949e;
    }
    .contrib-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 5px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .contrib-btn:hover { opacity: 0.82; }
    #contrib-submit-btn { background: #4d1d1d; color: #ffa198; border: 1px solid #ffa198; }
    #contrib-skip-btn  { background: #21262d; color: #8b949e; border: 1px solid #30363d; }
  `

  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  el.innerHTML = `
    <div id="cards-hand" class="hidden"></div>
    <div id="crisis-contrib-bar" class="hidden">
      <span id="crisis-contrib-label">Crisis</span>
      <span id="crisis-contrib-count">0 selected</span>
      <span id="crisis-contrib-food" class="hidden">
        <span class="contrib-food-label">Food store</span>
        <button class="contrib-food-btn" id="contrib-food-minus">−</button>
        <span id="contrib-food-count">0</span>
        <button class="contrib-food-btn" id="contrib-food-plus">+</button>
        <span id="contrib-food-available"></span>
      </span>
      <button class="contrib-btn" id="contrib-submit-btn">Contribute</button>
      <button class="contrib-btn" id="contrib-skip-btn">Skip</button>
    </div>
  `

  const handEl = el.querySelector('#cards-hand')
  const contribBar = el.querySelector('#crisis-contrib-bar')
  const contribCountEl = el.querySelector('#crisis-contrib-count')
  const foodWrap = el.querySelector('#crisis-contrib-food')
  const foodMinusBtn = el.querySelector('#contrib-food-minus')
  const foodPlusBtn = el.querySelector('#contrib-food-plus')
  const foodCountEl = el.querySelector('#contrib-food-count')
  const foodAvailEl = el.querySelector('#contrib-food-available')
  const submitBtn = el.querySelector('#contrib-submit-btn')
  const skipBtn = el.querySelector('#contrib-skip-btn')

  // Selected card IDs for crisis contribution
  const selectedForContrib = new Set()
  let selectedFoodFromStore = 0
  let currentPhase = 'setup'
  let currentHand = []
  let currentMyTurn = false
  let currentCrisis = null
  let currentFood = 0

  // Click outside to deselect normal selection
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.item-card')) {
      handEl.querySelectorAll('.item-card.selected').forEach(c => c.classList.remove('selected'))
    }
  })

  submitBtn.addEventListener('click', () => {
    const foodTokens = Array.from({ length: selectedFoodFromStore }, () => FOOD_STORE_TOKEN_ID)
    ws.send('CRISIS_CONTRIB', { cards: [...selectedForContrib, ...foodTokens] })
    selectedForContrib.clear()
    selectedFoodFromStore = 0
    contribBar.classList.add('hidden')
    renderHand(currentHand, currentPhase, currentMyTurn, currentCrisis, currentFood)
  })

  skipBtn.addEventListener('click', () => {
    ws.send('CRISIS_CONTRIB', { cards: [] })
    selectedForContrib.clear()
    selectedFoodFromStore = 0
    contribBar.classList.add('hidden')
  })

  function updateContribUi () {
    const hasCrisis = currentPhase === 'crisis' && currentCrisis
    const isFoodCrisis = hasCrisis && currentCrisis.contributionType === 'food'

    const parts = []
    if (selectedForContrib.size) parts.push(`${selectedForContrib.size} card${selectedForContrib.size === 1 ? '' : 's'}`)
    if (selectedFoodFromStore) parts.push(`${selectedFoodFromStore} food`)
    contribCountEl.textContent = parts.length ? parts.join(', ') : '0 selected'

    if (isFoodCrisis) {
      foodWrap.classList.remove('hidden')
      foodCountEl.textContent = String(selectedFoodFromStore)
      foodAvailEl.textContent = `(avail ${currentFood || 0})`
      foodMinusBtn.disabled = selectedFoodFromStore <= 0
      foodPlusBtn.disabled = selectedFoodFromStore >= (currentFood || 0)
    } else {
      foodWrap.classList.add('hidden')
      selectedFoodFromStore = 0
    }

    if (isFoodCrisis) {
      contribBar.classList.remove('hidden')
    } else if (hasCrisis && (selectedForContrib.size > 0 || selectedFoodFromStore > 0)) {
      contribBar.classList.remove('hidden')
    }
  }

  foodMinusBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    selectedFoodFromStore = Math.max(0, selectedFoodFromStore - 1)
    updateContribUi()
  })
  foodPlusBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    selectedFoodFromStore = Math.min(currentFood || 0, selectedFoodFromStore + 1)
    updateContribUi()
  })

  // ─── Item data cache (fetched once) ──────────────────────────────────────────
  let itemsCache = null

  async function getItems () {
    if (itemsCache) return itemsCache
    try {
      const res = await fetch('/game/items')
      if (res.ok) { itemsCache = await res.json(); return itemsCache }
    } catch (_) {}
    return []
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  async function renderHand (hand, phase, isMyTurn, crisisCard, food) {
    currentHand = hand
    currentPhase = phase
    currentMyTurn = isMyTurn
    currentCrisis = crisisCard || null
    currentFood = food || 0

    const isFoodCrisis = phase === 'crisis' && crisisCard && crisisCard.contributionType === 'food'
    if (!hand.length) handEl.classList.add('hidden')
    else handEl.classList.remove('hidden')

    const items = await getItems()
    const itemMap = new Map(items.map(i => [i.id, i]))

    handEl.innerHTML = hand.map((cardId, idx) => {
      const item = itemMap.get(cardId) || { id: cardId, name: cardId, type: 'junk', effect: '' }
      const colours = TYPE_COLOURS[item.type] || TYPE_COLOURS.junk
      const icon = TYPE_ICON[item.type] || '❓'
      const contribClass = selectedForContrib.has(cardId) ? ' contribute-selected' : ''
      return `
        <div class="item-card${contribClass}"
             data-id="${escHtml(cardId)}"
             data-index="${idx}"
             style="background:${colours.bg};border-color:${colours.border};">
          <div class="card-icon">${icon}</div>
          <div class="card-name" style="color:${colours.label}">${escHtml(item.name)}</div>
          <div class="card-type-badge" style="background:${colours.bg};color:${colours.accent};border:1px solid ${colours.border}">
            ${escHtml(item.type)}
          </div>
          <div class="card-effect">${escHtml(item.effect || '')}</div>
        </div>
      `
    }).join('')

    // Attach click handlers
    handEl.querySelectorAll('.item-card').forEach(cardEl => {
      cardEl.addEventListener('click', (e) => {
        e.stopPropagation()
        const cardId = cardEl.dataset.id

        if (phase === 'crisis') {
          // Toggle contribution selection
          if (selectedForContrib.has(cardId)) {
            selectedForContrib.delete(cardId)
            cardEl.classList.remove('contribute-selected')
          } else {
            selectedForContrib.add(cardId)
            cardEl.classList.add('contribute-selected')
          }
          updateContribUi()
          return
        }

        if (!isMyTurn || phase !== 'action') return

        // Toggle normal selection (show effect description)
        const wasSelected = cardEl.classList.contains('selected')
        handEl.querySelectorAll('.item-card.selected').forEach(c => c.classList.remove('selected'))
        if (!wasSelected) cardEl.classList.add('selected')
      })
    })

    // Ensure food controls remain available even if the player has no cards.
    if (isFoodCrisis) updateContribUi()
  }

  // ─── Store subscription ───────────────────────────────────────────────────────

  store.subscribe((state) => {
    const hand = state.privateState.hand || []
    const game = state.game
    const phase = game ? game.phase : 'setup'
    const isMyTurn = game && game.activePlayerId === state.auth.playerId
    const crisisCard = game ? game.currentCrisis : null
    const food = game ? game.food : 0

    currentPhase = phase
    currentMyTurn = isMyTurn

    // Show/hide crisis contribution bar
    if (phase !== 'crisis') {
      contribBar.classList.add('hidden')
      selectedForContrib.clear()
      selectedFoodFromStore = 0
    }

    renderHand(hand, phase, isMyTurn, crisisCard, food)
  })
}
