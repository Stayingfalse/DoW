/**
 * Dead of Winter — Audio Controls
 * Phase 6: Mute toggle + volume slider in a fixed corner widget.
 * Persists preferences to localStorage. Starts muted if
 * the user has prefers-reduced-motion enabled (as a sensory-reduction proxy).
 */
import { setMuted, getMuted, setVolume } from '../audio/audio.js'

const KEY_MUTED = 'dow_audio_muted'
const KEY_VOL   = 'dow_audio_vol'

export function initAudioControls () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Load persisted preferences (default: unmuted at 70% volume)
  const storedMuted = localStorage.getItem(KEY_MUTED)
  const storedVol   = localStorage.getItem(KEY_VOL)
  // Respect prefers-reduced-motion: default to muted, but keep controls enabled
  // so users can opt in to audio if they choose.
  const initMuted   = prefersReduced ? true : storedMuted === 'true'
  const initVol     = storedVol !== null ? Math.min(1, Math.max(0, parseFloat(storedVol))) : 0.7

  setMuted(initMuted)
  setVolume(initVol)

  // Inject styles
  const style = document.createElement('style')
  style.textContent = `
    #audio-controls {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 80;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(22, 27, 34, 0.85);
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 6px 10px;
    }
    #audio-mute-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      padding: 2px;
      color: #c9d1d9;
    }
    #audio-mute-btn:hover { color: #e6edf3; }
    #audio-vol-slider {
      width: 72px;
      accent-color: #58a6ff;
      cursor: pointer;
    }
    #audio-vol-slider:disabled { opacity: 0.4; cursor: not-allowed; }
  `
  document.head.appendChild(style)

  // Build widget
  const container = document.createElement('div')
  container.id = 'audio-controls'
  container.setAttribute('aria-label', 'Audio controls')
  container.innerHTML = `
    <button id="audio-mute-btn" title="${initMuted ? 'Unmute' : 'Mute'}" aria-label="${initMuted ? 'Unmute' : 'Mute'}">
      ${initMuted ? '🔇' : '🔊'}
    </button>
    <input id="audio-vol-slider" type="range" min="0" max="1" step="0.05"
           value="${initVol}" aria-label="Volume" />
  `
  document.body.appendChild(container)

  const muteBtn  = document.getElementById('audio-mute-btn')
  const volSlider = document.getElementById('audio-vol-slider')

  muteBtn.addEventListener('click', () => {
    const nowMuted = !getMuted()
    setMuted(nowMuted)
    muteBtn.textContent = nowMuted ? '🔇' : '🔊'
    muteBtn.title = nowMuted ? 'Unmute' : 'Mute'
    muteBtn.setAttribute('aria-label', nowMuted ? 'Unmute' : 'Mute')
    localStorage.setItem(KEY_MUTED, String(nowMuted))
  })

  volSlider.addEventListener('input', () => {
    const vol = parseFloat(volSlider.value)
    setVolume(vol)
    localStorage.setItem(KEY_VOL, String(vol))
    // If volume raised from 0 while muted, unmute
    if (vol > 0 && getMuted()) {
      setMuted(false)
      muteBtn.textContent = '🔊'
      muteBtn.title = 'Mute'
      muteBtn.setAttribute('aria-label', 'Mute')
      localStorage.setItem(KEY_MUTED, 'false')
    }
  })
}
