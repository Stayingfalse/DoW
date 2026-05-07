/**
 * Dead of Winter — Procedural Location Textures
 * Phase 2: CanvasTexture + Mesh builder for each board location.
 * All artwork drawn programmatically — no image files.
 */
import * as THREE from 'three'

const TEX = 512

// ─── Draw-function dispatch table (declared functions are hoisted) ────────────
const DRAW = {
  colony:         drawColony,
  gas_station:    drawGasStation,
  grocery_store:  drawGroceryStore,
  hospital:       drawHospital,
  police_station: drawPoliceStation,
  school:         drawSchool,
  library:        drawLibrary
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildLocationTexture (locationId) {
  const canvas = document.createElement('canvas')
  canvas.width = TEX
  canvas.height = TEX
  const ctx = canvas.getContext('2d')
  ;(DRAW[locationId] || drawGeneric)(ctx, TEX, locationId)
  addNoise(ctx, TEX, 300, locationId.charCodeAt(0))
  addSnowEdges(ctx, TEX, locationId.charCodeAt(0) + 7)
  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  return tex
}

export function buildLocationMesh (locationId) {
  const isColony = locationId === 'colony'
  const size = isColony ? 3.5 : 2.4
  const topTex = buildLocationTexture(locationId)
  const side = new THREE.MeshStandardMaterial({ color: SIDE_COLORS[locationId] || 0x111111, roughness: 0.95 })
  const top = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.72, metalness: 0.05 })
  const bot = new THREE.MeshStandardMaterial({ color: 0x040506, roughness: 1 })
  // BoxGeometry face order: +X, -X, +Y(top), -Y(bot), +Z, -Z
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, 0.08, size),
    [side, side, top, bot, side, side]
  )
  mesh.receiveShadow = true
  mesh.castShadow = true
  mesh.name = `location_${locationId}`
  mesh.userData = { locId: locationId }
  return mesh
}

// ─── Side colours ─────────────────────────────────────────────────────────────

const SIDE_COLORS = {
  colony:         0x0d1e2e,
  gas_station:    0x1a0f04,
  grocery_store:  0x071510,
  hospital:       0x060d18,
  police_station: 0x0e1218,
  school:         0x130b04,
  library:        0x0a0812
}

// ─── Deterministic PRNG ───────────────────────────────────────────────────────

function mulberry32 (seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function addNoise (ctx, S, n, seed) {
  const rng = mulberry32(seed)
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = rng() * S
    const y = rng() * S
    const r = 0.5 + rng() * 1.5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rng() * 0.18})`
    ctx.fill()
  }
  ctx.restore()
}

function addSnowEdges (ctx, S, seed) {
  const rng = mulberry32(seed)
  ctx.save()
  for (let i = 0; i < 90; i++) {
    const x = rng() * S
    const y = rng() * S
    const r = 4 + rng() * 14
    const edge = Math.min(x, y, S - x, S - y)
    const a = Math.max(0, (1 - edge / (S * 0.28))) * 0.55
    if (a < 0.02) continue
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(210, 230, 255, ${a})`
    ctx.fill()
  }
  ctx.restore()
}

function drawLabel (ctx, S, text, colour = '#c8d8e8') {
  ctx.save()
  const pad = 10
  const fh = 22
  ctx.font = `bold ${fh}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width + pad * 2
  const x = S / 2 - w / 2
  const y = S - 36
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fillRect(x, y, w, fh + 8)
  ctx.strokeStyle = colour
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, fh + 8)
  ctx.fillStyle = colour
  ctx.fillText(text, S / 2, y + fh / 2 + 4)
  ctx.restore()
}

function radialGlow (ctx, cx, cy, r0, r1, colourInner, colourOuter) {
  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1)
  g.addColorStop(0, colourInner)
  g.addColorStop(1, colourOuter)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

// ─── Colony ───────────────────────────────────────────────────────────────────

function drawColony (ctx, S) {
  // Background
  const bg = ctx.createLinearGradient(0, 0, S, S)
  bg.addColorStop(0, '#071520')
  bg.addColorStop(1, '#0a1e2e')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)

  // Perimeter wall
  ctx.strokeStyle = '#2c5040'
  ctx.lineWidth = 14
  ctx.strokeRect(28, 28, S - 56, S - 56)

  // Wall planks
  ctx.strokeStyle = 'rgba(40,90,58,0.5)'
  ctx.lineWidth = 2
  for (let y = 42; y < S - 40; y += 18) {
    ctx.beginPath(); ctx.moveTo(28, y); ctx.lineTo(S - 28, y); ctx.stroke()
  }
  for (let x = 42; x < S - 40; x += 18) {
    ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x, S - 28); ctx.stroke()
  }

  // Corner watchtowers
  for (const [tx, ty] of [[28,28],[S-28,28],[28,S-28],[S-28,S-28]]) {
    ctx.fillStyle = '#1e3828'; ctx.fillRect(tx - 22, ty - 22, 44, 44)
    ctx.strokeStyle = '#4a8a5a'; ctx.lineWidth = 2
    ctx.strokeRect(tx - 22, ty - 22, 44, 44)
    // Crenellations
    ctx.fillStyle = '#3a6848'
    for (let c = 0; c < 3; c++) { ctx.fillRect(tx - 20 + c * 14, ty - 29, 10, 9) }
  }

  // Campfire glow
  radialGlow(ctx, S/2, S/2, 0, S * 0.28, 'rgba(255,130,20,0.55)', 'rgba(0,0,0,0)')

  // Campfire ember
  ctx.fillStyle = '#ff8c14'
  ctx.beginPath(); ctx.arc(S/2, S/2, 13, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffee88'
  ctx.beginPath(); ctx.arc(S/2, S/2, 5, 0, Math.PI * 2); ctx.fill()

  // Inner buildings
  const blds = [[S*.25,S*.3,58,46],[S*.68,S*.26,52,44],[S*.28,S*.68,50,44],[S*.70,S*.68,54,48]]
  for (const [bx, by, bw, bh] of blds) {
    ctx.fillStyle = '#172a20'
    ctx.fillRect(bx - bw/2, by - bh/2, bw, bh)
    ctx.strokeStyle = '#3a6040'; ctx.lineWidth = 2
    ctx.strokeRect(bx - bw/2, by - bh/2, bw, bh)
    // Roof
    ctx.fillStyle = '#1e3428'
    ctx.beginPath()
    ctx.moveTo(bx - bw/2 - 6, by - bh/2)
    ctx.lineTo(bx, by - bh/2 - 16)
    ctx.lineTo(bx + bw/2 + 6, by - bh/2)
    ctx.closePath(); ctx.fill()
    // Lit window
    ctx.fillStyle = 'rgba(255,200,80,0.85)'
    ctx.fillRect(bx - 8, by - 7, 14, 12)
  }

  drawLabel(ctx, S, 'THE COLONY', '#88cc99')
}

// ─── Gas Station ──────────────────────────────────────────────────────────────

function drawGasStation (ctx, S) {
  const bg = ctx.createLinearGradient(0, 0, 0, S)
  bg.addColorStop(0, '#0f0802'); bg.addColorStop(1, '#1a0f04')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

  // Asphalt cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2
  const rng = mulberry32(55)
  for (let i = 0; i < 12; i++) {
    ctx.beginPath()
    ctx.moveTo(rng() * S, rng() * S)
    ctx.lineTo(rng() * S, rng() * S)
    ctx.stroke()
  }

  // Fuel spill (dark stain)
  const spill = ctx.createRadialGradient(S*.4, S*.7, 5, S*.4, S*.7, 70)
  spill.addColorStop(0, 'rgba(10,5,0,0.7)'); spill.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = spill; ctx.fillRect(0, 0, S, S)

  // Canopy
  ctx.fillStyle = '#2a1e0a'
  ctx.fillRect(S*.08, S*.12, S*.84, S*.18)
  ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = 3
  ctx.strokeRect(S*.08, S*.12, S*.84, S*.18)

  // Support poles
  for (const px of [S*.15, S*.85]) {
    ctx.fillStyle = '#3a2808'; ctx.fillRect(px - 6, S*.3, 12, S*.55)
  }

  // Gas pumps (two)
  for (const px of [S*.32, S*.62]) {
    ctx.fillStyle = '#2a1800'; ctx.fillRect(px - 22, S*.38, 44, 68)
    ctx.strokeStyle = '#6a3810'; ctx.lineWidth = 2
    ctx.strokeRect(px - 22, S*.38, 44, 68)
    // Display
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(px - 14, S*.4, 28, 20)
    ctx.fillStyle = '#ff4400'
    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center'
    ctx.fillText('EMPTY', px, S*.4 + 14)
    // Nozzle
    ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(px + 22, S*.45)
    ctx.bezierCurveTo(px + 45, S*.45, px + 50, S*.55, px + 38, S*.6)
    ctx.stroke()
    // Glow
    radialGlow(ctx, px, S*.55, 0, 40, 'rgba(200,100,0,0.12)', 'rgba(0,0,0,0)')
  }

  drawLabel(ctx, S, 'GAS STATION', '#cc8833')
}

// ─── Grocery Store ────────────────────────────────────────────────────────────

function drawGroceryStore (ctx, S) {
  const bg = ctx.createLinearGradient(0, 0, 0, S)
  bg.addColorStop(0, '#040f09'); bg.addColorStop(1, '#071510')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

  // Store facade
  ctx.fillStyle = '#0a1c10'; ctx.fillRect(S*.1, S*.08, S*.8, S*.84)
  ctx.strokeStyle = '#1e4028'; ctx.lineWidth = 3
  ctx.strokeRect(S*.1, S*.08, S*.8, S*.84)

  // Broken windows
  for (const [wx, wy] of [[S*.18,S*.12],[S*.58,S*.12],[S*.18,S*.25],[S*.58,S*.25]]) {
    ctx.fillStyle = '#000507'; ctx.fillRect(wx, wy, S*.2, S*.1)
    ctx.strokeStyle = '#1a3020'; ctx.lineWidth = 1
    ctx.strokeRect(wx, wy, S*.2, S*.1)
    // Crack
    ctx.strokeStyle = 'rgba(180,220,200,0.2)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(wx+5, wy+5); ctx.lineTo(wx+S*.18, wy+S*.08); ctx.stroke()
  }

  // Aisle shelves
  ctx.strokeStyle = '#1e4028'; ctx.lineWidth = 2
  for (let i = 0; i < 5; i++) {
    const ay = S*.42 + i * 26
    ctx.beginPath(); ctx.moveTo(S*.14, ay); ctx.lineTo(S*.86, ay); ctx.stroke()
    // Items on shelf (small rectangles)
    const rng = mulberry32(100 + i * 17)
    for (let j = 0; j < 18; j++) {
      const ix = S*.16 + j * ((S*.68) / 18)
      const h = 6 + rng() * 10
      ctx.fillStyle = `rgba(${30+rng()*40|0},${60+rng()*40|0},${20+rng()*30|0},0.8)`
      ctx.fillRect(ix, ay - h, 12, h)
    }
  }

  // Faint glow from refrigerators at back
  radialGlow(ctx, S/2, S*.2, 0, S*.3, 'rgba(30,120,60,0.18)', 'rgba(0,0,0,0)')

  // Shopping cart silhouette
  ctx.strokeStyle = 'rgba(100,160,100,0.3)'; ctx.lineWidth = 2
  const cx = S*.75, cy = S*.7
  ctx.strokeRect(cx, cy, 40, 30)
  ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx, cy); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx + 10, cy + 34, 5, 0, Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx + 34, cy + 34, 5, 0, Math.PI*2); ctx.stroke()

  drawLabel(ctx, S, 'GROCERY STORE', '#55aa77')
}

// ─── Hospital ─────────────────────────────────────────────────────────────────

function drawHospital (ctx, S) {
  const bg = ctx.createLinearGradient(0, 0, 0, S)
  bg.addColorStop(0, '#040a14'); bg.addColorStop(1, '#06101e')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

  // Tile grid
  ctx.strokeStyle = 'rgba(30,60,90,0.35)'; ctx.lineWidth = 1
  for (let x = 0; x < S; x += 32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,S); ctx.stroke() }
  for (let y = 0; y < S; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(S,y); ctx.stroke() }

  // Building
  ctx.fillStyle = '#07121e'; ctx.fillRect(S*.12, S*.1, S*.76, S*.8)
  ctx.strokeStyle = '#1a3a54'; ctx.lineWidth = 3
  ctx.strokeRect(S*.12, S*.1, S*.76, S*.8)

  // Lit windows
  const rng = mulberry32(77)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const wx = S*.17 + c * S*.18, wy = S*.18 + r * S*.17
      const lit = rng() > 0.35
      ctx.fillStyle = lit ? 'rgba(200,220,255,0.55)' : 'rgba(10,20,30,0.9)'
      ctx.fillRect(wx, wy, S*.12, S*.1)
      ctx.strokeStyle = '#1a3050'; ctx.lineWidth = 1
      ctx.strokeRect(wx, wy, S*.12, S*.1)
    }
  }

  // Red cross (prominent)
  const cx = S*.5, cy = S*.55
  ctx.fillStyle = 'rgba(180,0,0,0.9)'
  ctx.fillRect(cx - 10, cy - 32, 20, 64) // vertical
  ctx.fillRect(cx - 32, cy - 10, 64, 20) // horizontal
  // Glow around cross
  radialGlow(ctx, cx, cy, 10, 50, 'rgba(200,0,0,0.2)', 'rgba(0,0,0,0)')

  // Ambulance bay at bottom
  ctx.fillStyle = '#070f18'; ctx.fillRect(S*.3, S*.82, S*.4, S*.08)
  ctx.strokeStyle = '#ff2200'; ctx.lineWidth = 2
  ctx.strokeRect(S*.3, S*.82, S*.4, S*.08)

  drawLabel(ctx, S, 'HOSPITAL', '#5599dd')
}

// ─── Police Station ───────────────────────────────────────────────────────────

function drawPoliceStation (ctx, S) {
  const bg = ctx.createLinearGradient(0, 0, S, S)
  bg.addColorStop(0, '#090c10'); bg.addColorStop(1, '#0e1218')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

  // Building
  ctx.fillStyle = '#0d1520'; ctx.fillRect(S*.1, S*.1, S*.8, S*.8)
  ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 3
  ctx.strokeRect(S*.1, S*.1, S*.8, S*.8)

  // Barred windows
  for (const [wx,wy] of [[S*.15,S*.15],[S*.6,S*.15],[S*.15,S*.5],[S*.6,S*.5]]) {
    ctx.fillStyle = '#07101a'; ctx.fillRect(wx, wy, S*.2, S*.15)
    ctx.strokeStyle = '#2a3a4a'; ctx.lineWidth = 1; ctx.strokeRect(wx, wy, S*.2, S*.15)
    // Bars
    ctx.strokeStyle = '#3a4a5a'; ctx.lineWidth = 2
    for (let b = 0; b < 3; b++) {
      const bx = wx + b * (S*.2/3) + S*.033
      ctx.beginPath(); ctx.moveTo(bx, wy); ctx.lineTo(bx, wy + S*.15); ctx.stroke()
    }
  }

  // Badge star (5-pointed)
  const bx = S*.5, by = S*.52, br = 70
  ctx.strokeStyle = 'rgba(120,150,200,0.6)'; ctx.lineWidth = 2
  ctx.fillStyle = 'rgba(20,40,70,0.7)'
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI / 5) - Math.PI / 2
    const ai = a + (2 * Math.PI / 5)
    if (i === 0) ctx.moveTo(bx + br * Math.cos(a), by + br * Math.sin(a))
    else ctx.lineTo(bx + br * Math.cos(a), by + br * Math.sin(a))
    ctx.lineTo(bx + br * 0.38 * Math.cos(ai), by + br * 0.38 * Math.sin(ai))
  }
  ctx.closePath(); ctx.fill(); ctx.stroke()

  // Blue/red light flicker suggestion
  radialGlow(ctx, S*.2, S*.85, 0, 40, 'rgba(0,80,255,0.25)', 'rgba(0,0,0,0)')
  radialGlow(ctx, S*.8, S*.85, 0, 40, 'rgba(255,20,20,0.25)', 'rgba(0,0,0,0)')

  drawLabel(ctx, S, 'POLICE STATION', '#7799bb')
}

// ─── School ───────────────────────────────────────────────────────────────────

function drawSchool (ctx, S) {
  const bg = ctx.createLinearGradient(0, 0, 0, S)
  bg.addColorStop(0, '#0c0804'); bg.addColorStop(1, '#130b04')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

  // Building facade
  ctx.fillStyle = '#1a1008'; ctx.fillRect(S*.08, S*.12, S*.84, S*.76)
  ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 3
  ctx.strokeRect(S*.08, S*.12, S*.84, S*.76)

  // Window grid
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const wx = S*.13 + c * S*.2, wy = S*.18 + r * S*.2
      const rng = mulberry32(200 + r*4+c)
      const lit = rng() > 0.45
      ctx.fillStyle = lit ? 'rgba(255,220,80,0.45)' : 'rgba(8,6,3,0.9)'
      ctx.fillRect(wx, wy, S*.12, S*.1)
      ctx.strokeStyle = '#3a2818'; ctx.lineWidth = 1
      ctx.strokeRect(wx, wy, S*.12, S*.1)
    }
  }

  // Chalkboard through one window
  ctx.fillStyle = '#1a2816'; ctx.fillRect(S*.33, S*.18, S*.12, S*.1)
  ctx.strokeStyle = '#2a3020'; ctx.lineWidth = 1; ctx.strokeRect(S*.33, S*.18, S*.12, S*.1)
  ctx.strokeStyle = 'rgba(200,220,200,0.4)'; ctx.lineWidth = 1
  for (let cl = 0; cl < 3; cl++) {
    ctx.beginPath(); ctx.moveTo(S*.34, S*.2 + cl*8); ctx.lineTo(S*.44, S*.2 + cl*8); ctx.stroke()
  }

  // School bus silhouette at bottom
  ctx.fillStyle = 'rgba(120,80,0,0.4)'; ctx.fillRect(S*.2, S*.78, S*.6, S*.08)
  ctx.strokeStyle = 'rgba(180,120,0,0.3)'; ctx.lineWidth = 1
  ctx.strokeRect(S*.2, S*.78, S*.6, S*.08)
  // Windows on bus
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(S*.23 + i * S*.12, S*.79, S*.08, S*.05)
  }

  // Warm glow
  radialGlow(ctx, S/2, S/2, 0, S*.35, 'rgba(150,80,0,0.12)', 'rgba(0,0,0,0)')

  drawLabel(ctx, S, 'SCHOOL', '#cc9944')
}

// ─── Library ──────────────────────────────────────────────────────────────────

function drawLibrary (ctx, S) {
  const bg = ctx.createLinearGradient(0, 0, S, S)
  bg.addColorStop(0, '#07050c'); bg.addColorStop(1, '#0a0812')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S, S)

  // Stone walls
  ctx.fillStyle = '#0d0a16'; ctx.fillRect(S*.1, S*.1, S*.8, S*.8)
  ctx.strokeStyle = '#1e1830'; ctx.lineWidth = 3
  ctx.strokeRect(S*.1, S*.1, S*.8, S*.8)
  // Stone blocks
  ctx.strokeStyle = 'rgba(30,24,50,0.5)'; ctx.lineWidth = 1
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 6; c++) {
      const sx = S*.1 + c * S*.135 + (r%2 * S*.068)
      const sy = S*.1 + r * S*.1
      ctx.strokeRect(sx, sy, S*.13, S*.1)
    }
  }

  // Bookshelf rows
  const shelfY = [S*.25, S*.38, S*.51, S*.64]
  const rng = mulberry32(88)
  for (const sy of shelfY) {
    // Shelf board
    ctx.fillStyle = '#1a1228'; ctx.fillRect(S*.14, sy - 2, S*.72, 4)
    // Books (coloured spines)
    let bx = S*.14
    while (bx < S*.86) {
      const bw = 8 + rng() * 16
      const bh = 24 + rng() * 20
      const r = 40 + rng()*80|0, g = 20 + rng()*40|0, b = 60 + rng()*80|0
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(bx, sy - bh, bw - 1, bh)
      bx += bw
    }
  }

  // Reading table with candle
  ctx.fillStyle = '#12101e'
  ctx.fillRect(S*.3, S*.72, S*.4, S*.12)
  ctx.strokeStyle = '#2a2040'; ctx.lineWidth = 1
  ctx.strokeRect(S*.3, S*.72, S*.4, S*.12)
  // Candle glow
  radialGlow(ctx, S*.5, S*.74, 0, 50, 'rgba(180,130,30,0.35)', 'rgba(0,0,0,0)')
  ctx.fillStyle = '#ffe8a0'; ctx.fillRect(S*.49, S*.68, 4, 14)
  ctx.fillStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(S*.51, S*.67, 3, 0, Math.PI*2); ctx.fill()

  // Faint overhead glow
  radialGlow(ctx, S*.5, S*.3, 0, S*.2, 'rgba(80,60,120,0.2)', 'rgba(0,0,0,0)')

  drawLabel(ctx, S, 'LIBRARY', '#9977cc')
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function drawGeneric (ctx, S, locationId) {
  ctx.fillStyle = '#0d111a'; ctx.fillRect(0, 0, S, S)
  drawLabel(ctx, S, locationId.toUpperCase().replace(/_/g, ' '), '#888')
}
