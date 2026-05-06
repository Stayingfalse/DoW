/**
 * Dead of Winter — Scene Lighting
 * Phase 2: Cold blue ambient + directional key + per-location warm glows + moonlight.
 */
import * as THREE from 'three'

// Location world positions [x, z] (must match board.js POSITIONS)
const LOC_LIGHTS = [
  { pos: [  0,    0 ], color: 0xffaa44, intensity: 0.35, dist: 5.5 }, // colony campfire
  { pos: [ -6,   -4 ], color: 0xff6600, intensity: 0.20, dist: 4.0 }, // gas station
  { pos: [  6,   -4 ], color: 0x44ff88, intensity: 0.15, dist: 4.0 }, // grocery store
  { pos: [ -6,    4 ], color: 0x4488ff, intensity: 0.18, dist: 4.0 }, // hospital
  { pos: [  6,    4 ], color: 0x5566aa, intensity: 0.16, dist: 4.0 }, // police station
  { pos: [ -3,   -7 ], color: 0xffcc66, intensity: 0.14, dist: 3.5 }, // school
  { pos: [  3,   -7 ], color: 0x8855aa, intensity: 0.14, dist: 3.5 }  // library
]

export function initLighting (scene) {
  // Cold ambient (winter atmosphere)
  const ambient = new THREE.AmbientLight(0x7a9aaa, 0.42)
  scene.add(ambient)

  // Moonlight — very faint, near-overhead
  const moonLight = new THREE.DirectionalLight(0x9ab0cc, 0.25)
  moonLight.position.set(-3, 30, 5)
  scene.add(moonLight)

  // Key directional light (casts shadows, slight warm tint)
  const dirLight = new THREE.DirectionalLight(0xcce0ff, 1.15)
  dirLight.position.set(10, 20, 10)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 1
  dirLight.shadow.camera.far = 60
  dirLight.shadow.camera.left = -22
  dirLight.shadow.camera.right = 22
  dirLight.shadow.camera.top = 22
  dirLight.shadow.camera.bottom = -22
  dirLight.shadow.bias = -0.001
  scene.add(dirLight)

  // Soft fill light from opposite side
  const fillLight = new THREE.DirectionalLight(0x223344, 0.28)
  fillLight.position.set(-8, 10, -8)
  scene.add(fillLight)

  // Blue rim light
  const rimLight = new THREE.PointLight(0x1a3388, 0.55, 28)
  rimLight.position.set(0, 4, -10)
  scene.add(rimLight)

  // Per-location warm glows
  const locLights = LOC_LIGHTS.map(({ pos, color, intensity, dist }) => {
    const pl = new THREE.PointLight(color, intensity, dist)
    pl.position.set(pos[0], 0.8, pos[1])
    scene.add(pl)
    return pl
  })

  // Subtle flicker for colony campfire
  const campfireLight = locLights[0]
  let flickerTime = 0

  function update (delta) {
    flickerTime += delta
    const flicker = 0.9 + 0.1 * Math.sin(flickerTime * 12.3) + 0.05 * Math.sin(flickerTime * 7.1)
    campfireLight.intensity = 0.35 * flicker
  }

  return { ambient, moonLight, dirLight, fillLight, rimLight, locLights, update }
}
