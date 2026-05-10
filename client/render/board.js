/**
 * Dead of Winter — Board Renderer
 * Phase 2: Procedural textured tiles, connection roads, name labels,
 *          live zombie/barricade indicators driven by store state.
 */
import * as THREE from 'three'
import { buildLocationMesh } from './procedural/locations.js'

// ─── Layout ───────────────────────────────────────────────────────────────────

const POSITIONS = {
  colony:         [  0,    0 ],
  gas_station:    [ -6,   -4 ],
  grocery_store:  [  6,   -4 ],
  hospital:       [ -6,    4 ],
  police_station: [  6,    4 ],
  school:         [ -3,   -7 ],
  library:        [  3,   -7 ]
}

const LOCATION_NAMES = {
  colony:         'THE COLONY',
  gas_station:    'GAS STATION',
  grocery_store:  'GROCERY STORE',
  hospital:       'HOSPITAL',
  police_station: 'POLICE STATION',
  school:         'SCHOOL',
  library:        'LIBRARY'
}

// ─── Main init ────────────────────────────────────────────────────────────────

export async function initBoard (scene, store) {
  const group = new THREE.Group()
  group.name = 'board'

  // Ground
  const groundTex = buildGroundTexture()
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0 })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(38, 28), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  ground.name = 'ground'
  group.add(ground)

  // Connection roads (each exterior location to colony)
  const colonyPos = POSITIONS.colony
  for (const [locId, pos] of Object.entries(POSITIONS)) {
    if (locId === 'colony') continue
    group.add(createRoad(pos[0], pos[1], colonyPos[0], colonyPos[1]))
  }

  // Location tiles + indicators
  const indicators = new Map()

  for (const [locId, [x, z]] of Object.entries(POSITIONS)) {
    const mesh = buildLocationMesh(locId)
    mesh.position.set(x, 0.04, z)
    group.add(mesh)

    // Label sprite
    const label = createLabelSprite(LOCATION_NAMES[locId])
    label.position.set(x, 1.4, z)
    label.name = `label_${locId}`
    group.add(label)

    // Zombie badge sprite
    const zombieBadge = createCountBadge(0, '#7b0000', '#ff4444')
    zombieBadge.position.set(x + 0.85, 0.4, z + 0.85)
    zombieBadge.visible = false
    group.add(zombieBadge)

    // Barricade indicators (up to 4 pre-created, toggled visible)
    const barricades = []
    const bOffsets = [[0.6, -0.8], [-0.6, -0.8], [0.6, 0.8], [-0.6, 0.8]]
    for (const [bx, bz] of bOffsets) {
      const bMesh = createBarricadeMarker()
      bMesh.position.set(x + bx, 0, z + bz)
      bMesh.visible = false
      group.add(bMesh)
      barricades.push(bMesh)
    }

    indicators.set(locId, { zombieBadge, barricades, zombieCount: -1, barricadeCount: -1 })
  }

  scene.add(group)

  // ─── Live updates from store ───────────────────────────────────────────────

  store.subscribe(state => {
    if (!state.game) return
    const locs = state.game.locations || {}
    for (const [locId, locData] of Object.entries(locs)) {
      const ind = indicators.get(locId)
      if (!ind) continue

      // zombie_count and barricade_count use snake_case — matches SQLite column names sent by server
      const zc = locData.zombie_count ?? 0
      const bc = locData.barricade_count ?? 0

      if (zc !== ind.zombieCount) {
        ind.zombieCount = zc
        updateCountBadge(ind.zombieBadge, zc, '#7b0000', '#ff4444')
        ind.zombieBadge.visible = zc > 0
      }

      if (bc !== ind.barricadeCount) {
        ind.barricadeCount = bc
        for (let i = 0; i < ind.barricades.length; i++) {
          ind.barricades[i].visible = i < bc
        }
      }
    }
  })

  // ─── Per-frame update ──────────────────────────────────────────────────────

  let elapsed = 0

  function update (delta) {
    elapsed += delta
    // Pulse zombie badges
    for (const [, ind] of indicators) {
      if (ind.zombieBadge.visible) {
        const s = 1 + 0.06 * Math.sin(elapsed * 3.5)
        ind.zombieBadge.scale.set(s, s, 1)
      }
    }
  }

  return { group, update }
}

// ─── Ground texture ───────────────────────────────────────────────────────────

function buildGroundTexture () {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')

  const bg = ctx.createLinearGradient(0, 0, size, size)
  bg.addColorStop(0, '#070c0e')
  bg.addColorStop(0.5, '#0a1014')
  bg.addColorStop(1, '#060a0c')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size)

  const rng = mulberry32(999)
  for (let i = 0; i < 200; i++) {
    const x = rng() * size, y = rng() * size
    const r = 10 + rng() * 60
    const a = 0.03 + rng() * 0.09
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(180,200,220,${a})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  ctx.strokeStyle = 'rgba(30,50,70,0.3)'; ctx.lineWidth = 1
  for (let i = 0; i < 30; i++) {
    ctx.beginPath()
    ctx.moveTo(rng() * size, rng() * size)
    for (let s = 0; s < 4; s++) ctx.lineTo(rng() * size, rng() * size)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)
  tex.anisotropy = 4
  return tex
}

// ─── Road strip ───────────────────────────────────────────────────────────────

function createRoad (x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1
  const len = Math.sqrt(dx * dx + dz * dz)
  const ux = dx / len, uz = dz / len
  const margin = 1.3
  const sx1 = x1 + ux * margin, sz1 = z1 + uz * margin
  const sx2 = x2 - ux * margin, sz2 = z2 - uz * margin
  const w = 0.28
  const nx = -uz * w / 2, nz = ux * w / 2

  const verts = new Float32Array([
    sx1 + nx, 0.01, sz1 + nz,
    sx1 - nx, 0.01, sz1 - nz,
    sx2 + nx, 0.01, sz2 + nz,
    sx2 - nx, 0.01, sz2 - nz
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  geo.setIndex([0, 1, 2, 1, 3, 2])
  geo.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({ color: 0x101610, roughness: 0.97 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  return mesh
}

// ─── Label sprite ─────────────────────────────────────────────────────────────

function createLabelSprite (text) {
  const W = 256, H = 48
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  roundRect(ctx, 2, 2, W - 4, H - 4, 6)
  ctx.fill()

  ctx.strokeStyle = 'rgba(120,150,180,0.55)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 2, 2, W - 4, H - 4, 6)
  ctx.stroke()

  ctx.font = 'bold 15px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#c8dce8'
  ctx.fillText(text, W / 2, H / 2)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(2.4, 0.45, 1)
  return sprite
}

function roundRect (ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ─── Count badge sprite ───────────────────────────────────────────────────────

function createCountBadge (count, bgColour, borderColour) {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')
  paintBadge(ctx, count, bgColour, borderColour)

  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.55, 0.55, 1)
  sprite.userData = { canvas, ctx, bgColour, borderColour }
  return sprite
}

function updateCountBadge (sprite, count, bgColour, borderColour) {
  const { canvas, ctx } = sprite.userData
  ctx.clearRect(0, 0, 64, 64)
  paintBadge(ctx, count, bgColour, borderColour)
  sprite.material.map.needsUpdate = true
}

function paintBadge (ctx, count, bgColour, borderColour) {
  ctx.fillStyle = bgColour
  ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = borderColour; ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(32, 32, 28, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(count), 32, 33)
}

// ─── Barricade marker ─────────────────────────────────────────────────────────

function createBarricadeMarker () {
  const group = new THREE.Group()

  // Create a stack of wooden planks for a more physical barricade appearance
  const plankColors = [0x5a3010, 0x4a2808, 0x6a4018, 0x503014]
  const rng = Math.random

  // Base platform/pallet
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x3a2408,
    roughness: 0.92,
    metalness: 0.05
  })
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.4), baseMat)
  base.position.y = 0.03
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)

  // Stacked planks with varying sizes and rotations
  const plankConfigs = [
    { w: 0.44, h: 0.08, d: 0.12, y: 0.10, rx: 0, ry: 0.1 },
    { w: 0.38, h: 0.08, d: 0.10, y: 0.18, rx: 0, ry: -0.15 },
    { w: 0.42, h: 0.08, d: 0.11, y: 0.26, rx: 0, ry: 0.08 },
    { w: 0.35, h: 0.07, d: 0.09, y: 0.33, rx: 0.05, ry: -0.12 }
  ]

  plankConfigs.forEach((cfg, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: plankColors[i % plankColors.length],
      roughness: 0.88,
      metalness: 0.08
    })
    const plank = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), mat)
    plank.position.y = cfg.y
    plank.position.x = (rng() - 0.5) * 0.05
    plank.position.z = (rng() - 0.5) * 0.05
    plank.rotation.x = cfg.rx
    plank.rotation.y = cfg.ry
    plank.castShadow = true
    plank.receiveShadow = true
    group.add(plank)
  })

  // Add a few nails/metal brackets for detail
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.6,
    metalness: 0.7
  })
  for (let i = 0; i < 3; i++) {
    const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.04), metalMat)
    nail.position.set((rng() - 0.5) * 0.3, 0.15 + rng() * 0.15, (rng() - 0.5) * 0.2)
    nail.rotation.z = Math.PI / 2 + (rng() - 0.5) * 0.3
    group.add(nail)
  }

  group.rotation.y = Math.PI / 4 + (rng() - 0.5) * 0.4
  return group
}

// ─── PRNG ─────────────────────────────────────────────────────────────────────

function mulberry32 (seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
