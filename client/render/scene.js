/**
 * Dead of Winter — Three.js Scene
 * Phase 1: Initialises renderer, cameras, and base lighting.
 * Phase 2+: Board, tokens, and dice added here.
 */
import * as THREE from 'three'
import { initLighting } from './lighting.js'
import { initBoard } from './board.js'
import { initParticles } from './particles.js'

export async function initScene (container, store) {
  // ─── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  // ─── Scene ─────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1117)
  scene.fog = new THREE.FogExp2(0x0d1117, 0.04)

  // ─── Cameras ───────────────────────────────────────────────────────────────
  const aspect = window.innerWidth / window.innerHeight
  const frustum = 12

  const orthoCamera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
    frustum, -frustum,
    0.1, 200
  )
  orthoCamera.position.set(0, 20, 10)
  orthoCamera.lookAt(0, 0, 0)

  const perspCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200)
  perspCamera.position.set(0, 8, 12)
  perspCamera.lookAt(0, 0, 0)

  let activeCamera = orthoCamera

  // ─── Lighting ──────────────────────────────────────────────────────────────
  initLighting(scene)

  // ─── Board ─────────────────────────────────────────────────────────────────
  await initBoard(scene, store)

  // ─── Particles ─────────────────────────────────────────────────────────────
  const particles = initParticles(scene)

  // ─── Resize handler ────────────────────────────────────────────────────────
  function onResize () {
    const w = window.innerWidth
    const h = window.innerHeight
    const a = w / h

    renderer.setSize(w, h)

    perspCamera.aspect = a
    perspCamera.updateProjectionMatrix()

    orthoCamera.left = -frustum * a
    orthoCamera.right = frustum * a
    orthoCamera.updateProjectionMatrix()
  }
  window.addEventListener('resize', onResize)

  // ─── Camera switch helpers ─────────────────────────────────────────────────
  function switchToPerspective (ms = 400) {
    activeCamera = perspCamera
  }

  function switchToOrtho (ms = 400) {
    activeCamera = orthoCamera
  }

  // ─── Render loop ───────────────────────────────────────────────────────────
  let rafId = null
  const clock = new THREE.Clock()

  function tick () {
    rafId = requestAnimationFrame(tick)
    const delta = clock.getDelta()
    particles.update(delta)
    renderer.render(scene, activeCamera)
  }

  function start () {
    if (!rafId) tick()
  }

  function stop () {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
  }

  return { scene, renderer, orthoCamera, perspCamera, switchToPerspective, switchToOrtho, start, stop }
}
