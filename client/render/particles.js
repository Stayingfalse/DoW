/**
 * Dead of Winter — Snow Particle System
 * Phase 2: Full blizzard effect.
 * Phase 1: Minimal stub.
 */
import * as THREE from 'three'

export function initParticles (scene) {
  const PARTICLE_COUNT = 800
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const velocities = []

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 40
    positions[i * 3 + 1] = Math.random() * 20
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30
    velocities.push({
      x: (Math.random() - 0.5) * 0.5,
      y: -(0.5 + Math.random() * 1.5),
      z: (Math.random() - 0.5) * 0.3
    })
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: 0xd0e8ff,
    size: 0.08,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true
  })

  const points = new THREE.Points(geo, mat)
  points.name = 'snow'
  scene.add(points)

  function update (delta) {
    const pos = geo.attributes.position.array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3]     += velocities[i].x * delta
      pos[i * 3 + 1] += velocities[i].y * delta
      pos[i * 3 + 2] += velocities[i].z * delta

      // Reset particle if it falls below ground
      if (pos[i * 3 + 1] < -0.5) {
        pos[i * 3]     = (Math.random() - 0.5) * 40
        pos[i * 3 + 1] = 18 + Math.random() * 4
        pos[i * 3 + 2] = (Math.random() - 0.5) * 30
      }
    }
    geo.attributes.position.needsUpdate = true
  }

  return { points, update }
}
