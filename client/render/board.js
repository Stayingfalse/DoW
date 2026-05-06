/**
 * Dead of Winter — Board Renderer
 * Phase 2: Procedural location planes, physical layout.
 * Phase 1: Placeholder — empty board.
 */
import * as THREE from 'three'

// Location layout positions [x, z] on the board plane
const LOCATION_POSITIONS = {
  colony:        [  0,    0 ],
  gas_station:   [ -6,   -4 ],
  grocery_store: [  6,   -4 ],
  hospital:      [ -6,    4 ],
  police_station:[  6,    4 ],
  school:        [ -3,   -6 ],
  library:       [  3,   -6 ]
}

export async function initBoard (scene, store) {
  const group = new THREE.Group()
  group.name = 'board'

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(30, 22)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0f14, roughness: 0.9, metalness: 0.0 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  group.add(ground)

  // Location tiles (placeholder coloured planes — Phase 2 adds procedural textures)
  for (const [locId, [x, z]] of Object.entries(LOCATION_POSITIONS)) {
    const tile = buildLocationTile(locId, x, z)
    group.add(tile)
  }

  scene.add(group)
  return group
}

function buildLocationTile (locId, x, z) {
  const isColony = locId === 'colony'
  const size = isColony ? 3.5 : 2.4

  const geo = new THREE.BoxGeometry(size, 0.05, size)
  const mat = new THREE.MeshStandardMaterial({
    color: locationColor(locId),
    roughness: 0.8,
    metalness: 0.1
  })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, 0.025, z)
  mesh.receiveShadow = true
  mesh.castShadow = false
  mesh.name = `location_${locId}`
  mesh.userData = { locId }

  return mesh
}

function locationColor (locId) {
  const palette = {
    colony:         0x1a2a3a,
    gas_station:    0x2a1800,
    grocery_store:  0x0d2212,
    hospital:       0x001a2e,
    police_station: 0x1a1600,
    school:         0x1a0a00,
    library:        0x0d0d1e
  }
  return palette[locId] || 0x111111
}
