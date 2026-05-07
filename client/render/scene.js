/**
 * Dead of Winter — Three.js Scene
 * Phase 2: Full scene with procedural board, snow, lighting, camera fade transitions.
 */
import * as THREE from 'three'
import { initLighting } from './lighting.js'
import { initBoard } from './board.js'
import { initParticles } from './particles.js'
import { initTokens } from './tokens.js'

export async function initScene (container, store) {
  // ─── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  container.appendChild(renderer.domElement)

  // ─── Scene ─────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x060a0d)
  scene.fog = new THREE.FogExp2(0x060a0d, 0.032)

  // ─── Cameras ───────────────────────────────────────────────────────────────
  const aspect = window.innerWidth / window.innerHeight
  const FRUSTUM_DEFAULT = 8
  const FRUSTUM_MIN = 3
  const FRUSTUM_MAX = 20
  const SCROLL_SENSITIVITY = 0.08
  let frustum = FRUSTUM_DEFAULT

  const orthoCamera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
    frustum, -frustum,
    0.1, 200
  )
  orthoCamera.position.set(0, 22, 11)
  orthoCamera.lookAt(0, 0, 0)

  const perspCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200)
  perspCamera.position.set(0, 8, 12)
  perspCamera.lookAt(0, 0, 0)

  let activeCamera = orthoCamera

  function applyFrustum () {
    const a = window.innerWidth / window.innerHeight
    orthoCamera.left   = -frustum * a
    orthoCamera.right  =  frustum * a
    orthoCamera.top    =  frustum
    orthoCamera.bottom = -frustum
    orthoCamera.updateProjectionMatrix()
  }

  function zoomBy (delta) {
    frustum = Math.max(FRUSTUM_MIN, Math.min(FRUSTUM_MAX, frustum + delta))
    applyFrustum()
  }

  function resetZoom () {
    frustum = FRUSTUM_DEFAULT
    applyFrustum()
  }

  // Scroll-wheel zoom
  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault()
    // Positive deltaY = scroll down = zoom out; negative = zoom in
    const step = frustum * SCROLL_SENSITIVITY
    zoomBy(e.deltaY > 0 ? step : -step)
  }, { passive: false })

  // ─── Lighting ──────────────────────────────────────────────────────────────
  const lighting = initLighting(scene)

  // ─── Board ─────────────────────────────────────────────────────────────────
  const board = await initBoard(scene, store)

  // ─── Particles ─────────────────────────────────────────────────────────────
  const particles = initParticles(scene)

  // ─── Tokens ────────────────────────────────────────────────────────────────
  const tokens = initTokens(scene, store)

  // ─── Camera fade overlay ───────────────────────────────────────────────────
  const fadeEl = document.createElement('div')
  fadeEl.style.cssText = [
    'position:absolute', 'inset:0', 'background:#000',
    'opacity:0', 'pointer-events:none', 'z-index:5',
    'transition:opacity 0.22s ease'
  ].join(';')
  container.style.position = 'relative'
  container.appendChild(fadeEl)

  function switchToPerspective (ms = 400) {
    if (activeCamera === perspCamera) return
    fadeEl.style.opacity = '1'
    setTimeout(() => { activeCamera = perspCamera; fadeEl.style.opacity = '0' }, 220)
  }

  function switchToOrtho (ms = 400) {
    if (activeCamera === orthoCamera) return
    fadeEl.style.opacity = '1'
    setTimeout(() => { activeCamera = orthoCamera; fadeEl.style.opacity = '0' }, 220)
  }

  // ─── Resize handler ────────────────────────────────────────────────────────
  function onResize () {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h)
    perspCamera.aspect = w / h
    perspCamera.updateProjectionMatrix()
    applyFrustum()
  }
  window.addEventListener('resize', onResize)

  // ─── Render loop ───────────────────────────────────────────────────────────
  let rafId = null
  let elapsed = 0
  const clock = new THREE.Clock()

  function tick () {
    rafId = requestAnimationFrame(tick)
    const delta = clock.getDelta()
    elapsed += delta
    particles.update(delta)
    board.update(delta)
    lighting.update(delta)
    tokens.update(elapsed)
    renderer.render(scene, activeCamera)
  }

  function start () { if (!rafId) tick() }
  function stop () { if (rafId) { cancelAnimationFrame(rafId); rafId = null } }

  return {
    scene, renderer, orthoCamera, perspCamera,
    switchToPerspective, switchToOrtho,
    start, stop, board, tokens,
    zoomBy, resetZoom, getZoom: () => frustum
  }
}
