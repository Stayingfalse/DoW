/**
 * Dead of Winter — Zoom Controls
 * Provides +/- buttons and a reset control for the 3D board camera.
 * Scroll-wheel zoom is handled directly in scene.js.
 */

const ZOOM_STEP = 1.5

export function initZoomControls (scene) {
  const styles = `
    #zoom-controls {
      position: fixed;
      right: 20px;
      bottom: 50%;
      transform: translateY(50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      z-index: 22;
    }
    .zoom-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #30363d;
      background: rgba(22, 27, 34, 0.92);
      color: #c9d1d9;
      font-size: 1.2rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
      user-select: none;
    }
    .zoom-btn:hover {
      background: rgba(33, 38, 45, 0.98);
      border-color: #58a6ff;
      color: #58a6ff;
    }
    #zoom-reset {
      font-size: 0.6rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 600;
    }
  `

  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  const el = document.createElement('div')
  el.id = 'zoom-controls'
  el.innerHTML = `
    <button class="zoom-btn" id="zoom-in"  title="Zoom In (+)">+</button>
    <button class="zoom-btn" id="zoom-reset" title="Reset Zoom">⊙</button>
    <button class="zoom-btn" id="zoom-out" title="Zoom Out (−)">−</button>
  `
  document.body.appendChild(el)

  el.querySelector('#zoom-in').addEventListener('click', () => scene.zoomBy(-ZOOM_STEP))
  el.querySelector('#zoom-out').addEventListener('click', () => scene.zoomBy(ZOOM_STEP))
  el.querySelector('#zoom-reset').addEventListener('click', () => scene.resetZoom())
}
