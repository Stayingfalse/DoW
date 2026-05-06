/**
 * Dead of Winter — Scene Lighting
 * Cold blue ambient + directional key light for token shadows.
 */
import * as THREE from 'three'

export function initLighting (scene) {
  // Cold ambient (winter atmosphere)
  const ambient = new THREE.AmbientLight(0x8aaabb, 0.4)
  scene.add(ambient)

  // Key directional light (casts shadows)
  const dirLight = new THREE.DirectionalLight(0xddeeff, 1.2)
  dirLight.position.set(10, 20, 10)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 1
  dirLight.shadow.camera.far = 60
  dirLight.shadow.camera.left = -20
  dirLight.shadow.camera.right = 20
  dirLight.shadow.camera.top = 20
  dirLight.shadow.camera.bottom = -20
  dirLight.shadow.bias = -0.001
  scene.add(dirLight)

  // Soft fill light from opposite side
  const fillLight = new THREE.DirectionalLight(0x334455, 0.3)
  fillLight.position.set(-8, 10, -8)
  scene.add(fillLight)

  // Subtle blue rim light
  const rimLight = new THREE.PointLight(0x2244aa, 0.6, 25)
  rimLight.position.set(0, 4, -8)
  scene.add(rimLight)

  return { ambient, dirLight, fillLight, rimLight }
}
