/**
 * Dead of Winter — Snow Particle System
 * Phase 2: Full blizzard effect — snowflake sprites, wind drift, two particle layers.
 */
import * as THREE from 'three'

const LAYER_CONFIGS = [
  { count: 1400, yRange: 22, spread: 44, sizeRange: [0.06, 0.13], opacity: 0.60, speedMult: 1.0 },
  { count:  600, yRange: 20, spread: 40, sizeRange: [0.14, 0.22], opacity: 0.40, speedMult: 0.7 }
]

export function initParticles (scene) {
  const flakeTex = buildFlakeTexture()

  const layers = LAYER_CONFIGS.map((cfg, layerIdx) => buildLayer(cfg, flakeTex, layerIdx))
  layers.forEach(l => scene.add(l.points))

  // Wind state
  const wind = { x: 0.18, z: 0.04, targetX: 0.18, targetZ: 0.04, timer: 0 }

  function update (delta) {
    // Slowly shift wind direction
    wind.timer += delta
    if (wind.timer > 3.5) {
      wind.timer = 0
      wind.targetX = (Math.random() - 0.5) * 0.8
      wind.targetZ = (Math.random() - 0.5) * 0.2
    }
    wind.x += (wind.targetX - wind.x) * delta * 0.4
    wind.z += (wind.targetZ - wind.z) * delta * 0.4

    for (const layer of layers) {
      const pos = layer.geo.attributes.position.array
      const { cfg, velocities, seeds } = layer
      const n = cfg.count

      for (let i = 0; i < n; i++) {
        pos[i * 3]     += (velocities[i].x + wind.x) * delta
        pos[i * 3 + 1] += velocities[i].y * delta
        pos[i * 3 + 2] += (velocities[i].z + wind.z) * delta

        // Slight horizontal drift oscillation
        pos[i * 3] += Math.sin(seeds[i] + layer.elapsed * 0.8) * 0.003

        if (pos[i * 3 + 1] < -0.5) {
          pos[i * 3]     = (Math.random() - 0.5) * cfg.spread
          pos[i * 3 + 1] = cfg.yRange * 0.9 + Math.random() * cfg.yRange * 0.2
          pos[i * 3 + 2] = (Math.random() - 0.5) * cfg.spread * 0.8
        }
      }

      layer.elapsed += delta
      layer.geo.attributes.position.needsUpdate = true
    }
  }

  return { layers, update }
}

// ─── Layer builder ────────────────────────────────────────────────────────────

function buildLayer (cfg, flakeTex, seed) {
  const { count, yRange, spread, sizeRange, opacity, speedMult } = cfg
  const positions = new Float32Array(count * 3)
  const velocities = []
  const seeds = []
  const rng = mulberry32(seed * 12345 + 7)

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (rng() - 0.5) * spread
    positions[i * 3 + 1] = rng() * yRange
    positions[i * 3 + 2] = (rng() - 0.5) * spread * 0.8
    velocities.push({
      x: (rng() - 0.5) * 0.3 * speedMult,
      y: -(0.6 + rng() * 1.8) * speedMult,
      z: (rng() - 0.5) * 0.2 * speedMult
    })
    seeds.push(rng() * Math.PI * 2)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  // Uniform size per layer (layers have different size ranges — that's the variation strategy).
  // Using per-particle BufferAttribute sizes would require a custom ShaderMaterial; the
  // two-layer approach is intentional and sufficient for the blizzard effect.
  const mat = new THREE.PointsMaterial({
    map: flakeTex,
    size: sizeRange[0] + rng() * (sizeRange[1] - sizeRange[0]),
    transparent: true,
    opacity,
    sizeAttenuation: true,
    alphaTest: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xd8eeff
  })

  const points = new THREE.Points(geo, mat)
  points.name = `snow_layer_${seed}`

  return { points, geo, cfg, velocities, seeds, elapsed: rng() * 100 }
}

// ─── Snowflake sprite texture ─────────────────────────────────────────────────

function buildFlakeTexture () {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const c = size / 2

  // Soft radial disc
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c * 0.9)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.5, 'rgba(220,235,255,0.7)')
  grad.addColorStop(1, 'rgba(200,220,255,0)')
  ctx.fillStyle = grad
  ctx.beginPath(); ctx.arc(c, c, c * 0.9, 0, Math.PI * 2); ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  return tex
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
