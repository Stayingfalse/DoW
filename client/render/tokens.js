/**
 * Dead of Winter — Token Renderer
 * Phase 4: Procedural survivor + zombie tokens, driven by store state.
 *
 * Survivor tokens  = coloured tapered cylinders (one per survivor ID)
 * Zombie tokens    = dark reddish irregular clumps (aggregated per location)
 */
import * as THREE from 'three'

// Board layout — mirrors board.js POSITIONS
const POSITIONS = {
  colony:         [  0,    0 ],
  gas_station:    [ -6,   -4 ],
  grocery_store:  [  6,   -4 ],
  hospital:       [ -6,    4 ],
  police_station: [  6,    4 ],
  school:         [ -3,   -7 ],
  library:        [  3,   -7 ]
}

// Colour palette for players
const PLAYER_COLOURS = [
  0x58a6ff, // blue
  0x3fb950, // green
  0xf78166, // red
  0xe3b341, // amber
  0xd2a8ff, // purple
  0x79c0ff, // light blue
  0xffa198, // pink
  0x56d364  // lime
]

/**
 * Returns a stable colour for a player ID by hashing the string.
 */
function playerColour (playerId) {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0
  return PLAYER_COLOURS[hash % PLAYER_COLOURS.length]
}

/**
 * Initialise the token layer.
 * Returns { updateAll } — call after any game state change.
 */
export function initTokens (scene, store) {
  const group = new THREE.Group()
  group.name = 'tokens'
  scene.add(group)

  // Map: survivorId -> THREE.Mesh
  const survivorMeshes = new Map()
  // Map: locationId -> THREE.Mesh[] (zombie clumps)
  const zombieMeshes = new Map()

  // ─── Shared geometries ────────────────────────────────────────────────────────

  const survivorBodyGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.6, 8)
  const survivorCapGeo = new THREE.SphereGeometry(0.18, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)
  const zombieGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.45, 6)

  // ─── Geometry factories ──────────────────────────────────────────────────────

  function makeSurvivorMesh (colour) {
    const mat = new THREE.MeshStandardMaterial({
      color: colour,
      roughness: 0.55,
      metalness: 0.1,
      emissive: colour,
      emissiveIntensity: 0.12
    })
    const mesh = new THREE.Mesh(survivorBodyGeo, mat)
    mesh.castShadow = true
    // Rounded cap disc (shared geometry, same material)
    const capMesh = new THREE.Mesh(survivorCapGeo, mat)
    capMesh.position.y = 0.28
    mesh.add(capMesh)
    return mesh
  }

  function makeZombieMesh () {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3d1c1c,
      roughness: 0.9,
      metalness: 0,
      emissive: 0x1a0a0a,
      emissiveIntensity: 0.3
    })
    const mesh = new THREE.Mesh(zombieGeo, mat)
    mesh.castShadow = true
    return mesh
  }

  // ─── Token placement helpers ─────────────────────────────────────────────────

  /**
   * Scatter N tokens around a centre position without overlap.
   * Returns an array of {x, z} offsets.
   */
  function scatterOffsets (count) {
    const offsets = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i % 2 === 0 ? 0 : 0.3)
      const r = 0.35 + Math.floor(i / 8) * 0.35
      offsets.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r })
    }
    return offsets
  }

  // ─── Main update ─────────────────────────────────────────────────────────────

  function updateAll (state) {
    const game = state.game
    if (!game) return

    const locations = game.locations || {}
    const players = game.players || []

    // Build survivorId -> playerId map for stable colour assignment
    const survivorOwner = new Map()
    players.forEach((p) => {
      (p.survivorIds || []).forEach(sid => survivorOwner.set(sid, p.id))
    })

    // ── Survivors ────────────────────────────────────────────────────────────
    // Collect all current survivor IDs across all locations
    const activeSurvivorIds = new Set()
    for (const [locId, locData] of Object.entries(locations)) {
      const survivorIds = locData.survivor_ids || []
      const [cx, cz] = POSITIONS[locId] || [0, 0]
      const offsets = scatterOffsets(survivorIds.length)

      survivorIds.forEach((sid, i) => {
        activeSurvivorIds.add(sid)
        const ownerId = survivorOwner.get(sid) || sid
        const colour = playerColour(ownerId)

        if (!survivorMeshes.has(sid)) {
          const mesh = makeSurvivorMesh(colour)
          group.add(mesh)
          survivorMeshes.set(sid, mesh)
        }
        const mesh = survivorMeshes.get(sid)
        // Animate toward target position
        const tx = cx + offsets[i].x
        const tz = cz + offsets[i].z
        mesh.position.x += (tx - mesh.position.x) * 0.15
        mesh.position.z += (tz - mesh.position.z) * 0.15
        mesh.position.y = 0.35
        mesh.visible = true
      })
    }

    // Remove meshes for survivors no longer present
    for (const [sid, mesh] of survivorMeshes.entries()) {
      if (!activeSurvivorIds.has(sid)) {
        group.remove(mesh)
        // Dispose material (geometry is shared, do not dispose)
        if (mesh.material) mesh.material.dispose()
        mesh.children.forEach(child => { if (child.material) child.material.dispose() })
        survivorMeshes.delete(sid)
      }
    }

    // ── Zombies ──────────────────────────────────────────────────────────────
    for (const [locId, locData] of Object.entries(locations)) {
      const count = locData.zombie_count || 0
      const [cx, cz] = POSITIONS[locId] || [0, 0]
      const existing = zombieMeshes.get(locId) || []

      // Add missing zombie meshes
      while (existing.length < count) {
        const mesh = makeZombieMesh()
        const offsets = scatterOffsets(count)
        const idx = existing.length
        mesh.position.set(
          cx + offsets[idx % offsets.length].x - 0.5,
          0.28,
          cz + offsets[idx % offsets.length].z + 0.4
        )
        group.add(mesh)
        existing.push(mesh)
      }

      // Hide/show based on count
      existing.forEach((mesh, i) => { mesh.visible = i < count })
      zombieMeshes.set(locId, existing)
    }
  }

  // ─── Per-frame wobble ────────────────────────────────────────────────────────

  function update (elapsed) {
    // Gentle idle sway for zombie tokens
    for (const [, meshes] of zombieMeshes.entries()) {
      meshes.forEach((mesh, i) => {
        if (mesh.visible) {
          mesh.rotation.z = Math.sin(elapsed * 1.4 + i * 1.3) * 0.08
        }
      })
    }
  }

  // Subscribe to store
  store.subscribe((state) => updateAll(state))

  return { group, update, updateAll }
}
