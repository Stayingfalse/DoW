/**
 * Dead of Winter — Audio Engine
 * All audio synthesised via Tone.js. No audio files.
 * Phase 6: Full implementation — ambient layers, diegetic cues, mix controls.
 */

/* global Tone */

let _started = false
let _muted = false

// Shared effects chain (created once on first user interaction)
let _masterVol = null
let _reverbLight = null
let _reverbHeavy = null

// Ambient state
let _ambientNoise = null
let _ambientGain = null
let _ambientHum = null
let _ambientHumGain = null
let _groanLoop = null
let _currentAmbientLocation = null

// Per-location ambient profiles: { windGain, humGain, groanInterval }
const LOCATION_AMBIENT = {
  colony:         { windGain: 0.12, humGain: 0.04, groanInterval: 14 },
  gas_station:    { windGain: 0.22, humGain: 0.01, groanInterval: 9  },
  grocery_store:  { windGain: 0.18, humGain: 0.02, groanInterval: 11 },
  hospital:       { windGain: 0.08, humGain: 0.07, groanInterval: 7  },
  police_station: { windGain: 0.15, humGain: 0.02, groanInterval: 10 },
  school:         { windGain: 0.20, humGain: 0.01, groanInterval: 12 },
  library:        { windGain: 0.10, humGain: 0.05, groanInterval: 15 },
}
const DEFAULT_AMBIENT = { windGain: 0.15, humGain: 0.02, groanInterval: 11 }

// ─── Startup ─────────────────────────────────────────────────────────────────

async function ensureStarted () {
  if (_started) return
  if (typeof Tone === 'undefined') return
  await Tone.start()
  _masterVol = new Tone.Volume(-6).toDestination()
  _reverbLight = new Tone.Reverb({ decay: 1.5, wet: 0.3 }).connect(_masterVol)
  _reverbHeavy = new Tone.Reverb({ decay: 3.5, wet: 0.45 }).connect(_masterVol)
  await Promise.all([_reverbLight.ready, _reverbHeavy.ready])
  _started = true
}

// ─── Mix controls ─────────────────────────────────────────────────────────────

export function setMuted (muted) {
  _muted = muted
  if (typeof Tone !== 'undefined') Tone.Destination.mute = muted
}

export function getMuted () { return _muted }

export function setVolume (normalised) {
  if (typeof Tone === 'undefined') return
  Tone.Destination.volume.value = normalised < 0.001 ? -Infinity : Tone.gainToDb(normalised)
}

// ─── Ambient loop ─────────────────────────────────────────────────────────────

export async function startAmbientLoop (locationId) {
  await ensureStarted()
  if (!_started) return
  if (_currentAmbientLocation === locationId) return
  stopAmbientLoop()

  const cfg = LOCATION_AMBIENT[locationId] || DEFAULT_AMBIENT
  _currentAmbientLocation = locationId

  // Wind: filtered pink noise
  _ambientGain = new Tone.Gain(cfg.windGain).connect(_masterVol)
  const filter = new Tone.Filter(700, 'lowpass').connect(_ambientGain)
  _ambientNoise = new Tone.Noise('pink').connect(filter)
  _ambientNoise.start()

  // Hum: low sine wave (interior feel)
  if (cfg.humGain > 0) {
    _ambientHumGain = new Tone.Gain(cfg.humGain).connect(_masterVol)
    _ambientHum = new Tone.Oscillator(55, 'sine').connect(_ambientHumGain)
    _ambientHum.start()
  }

  // Distant zombie groans at irregular intervals
  _groanLoop = new Tone.Loop((time) => _playGroan(time), cfg.groanInterval)
  _groanLoop.start('+6')
  if (Tone.Transport.state !== 'started') Tone.Transport.start()
}

export function stopAmbientLoop () {
  _currentAmbientLocation = null
  _dispose(_ambientNoise, true); _ambientNoise = null
  _dispose(_ambientGain);       _ambientGain = null
  _dispose(_ambientHum, true);  _ambientHum = null
  _dispose(_ambientHumGain);    _ambientHumGain = null
  _dispose(_groanLoop, true);   _groanLoop = null
}

function _dispose (node, stop = false) {
  if (!node) return
  try { if (stop) node.stop() } catch (_) {}
  try { node.dispose() } catch (_) {}
}

function _playGroan (time) {
  if (!_started || !_masterVol) return
  const synth = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.6, decay: 1.4, sustain: 0.15, release: 2.5 }
  }).connect(_masterVol)
  synth.volume.value = -30
  const freqs = [55, 65, 73, 80]
  synth.triggerAttackRelease(freqs[Math.floor(Math.random() * freqs.length)], '2n', time)
  setTimeout(() => _dispose(synth), 6000)
}

// ─── Diegetic cues ────────────────────────────────────────────────────────────

export async function playDiceRoll () {
  await ensureStarted()
  if (!_started) return
  const mem = new Tone.MembraneSynth({
    pitchDecay: 0.04, octaves: 4,
    envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.1 }
  }).connect(_masterVol)
  mem.volume.value = -10
  const now = Tone.now()
  ;[0, 0.06, 0.12, 0.19].forEach(t => mem.triggerAttackRelease('C2', '32n', now + t))
  setTimeout(() => _dispose(mem), 2000)
}

export async function playCardDraw () {
  await ensureStarted()
  if (!_started) return
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 }
  }).connect(_reverbLight)
  synth.volume.value = -14
  synth.triggerAttackRelease('C5', '32n')
  setTimeout(() => _dispose(synth), 1000)
}

export async function playCardPlace () {
  await ensureStarted()
  if (!_started) return
  const mem = new Tone.MembraneSynth({
    pitchDecay: 0.02, octaves: 2,
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.06 }
  }).connect(_masterVol)
  mem.volume.value = -14
  mem.triggerAttackRelease('A1', '32n')
  setTimeout(() => _dispose(mem), 1000)
}

export async function playZombieAttack () {
  await ensureStarted()
  if (!_started) return
  const dist = new Tone.Distortion(0.65).connect(_reverbLight)
  const synth = new Tone.FMSynth({
    harmonicity: 1.5, modulationIndex: 8,
    envelope: { attack: 0.01, decay: 0.35, sustain: 0.1, release: 0.6 }
  }).connect(dist)
  synth.volume.value = -12
  synth.triggerAttackRelease('G1', '8n')
  setTimeout(() => { _dispose(synth); _dispose(dist) }, 2500)
}

export async function playSurvivorDeath () {
  await ensureStarted()
  if (!_started) return
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.1, decay: 2, sustain: 0, release: 1.5 }
  }).connect(_reverbHeavy)
  synth.volume.value = -10
  synth.triggerAttackRelease('A3', '2n')
  setTimeout(() => { try { synth.frequency.rampTo('C2', 2) } catch (_) {} }, 100)
  setTimeout(() => _dispose(synth), 6000)
}

export async function playMoraleDrop () {
  await ensureStarted()
  if (!_started) return
  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.05, decay: 1, sustain: 0.1, release: 1.2 }
  }).connect(_reverbHeavy)
  poly.volume.value = -15
  poly.triggerAttackRelease(['D3', 'Ab3', 'Eb4'], '4n')
  setTimeout(() => _dispose(poly), 5000)
}

export async function playCrisisReveal () {
  await ensureStarted()
  if (!_started) return
  const synth = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.4, decay: 1, sustain: 0.3, release: 1.5 }
  }).connect(_reverbHeavy)
  synth.volume.value = -12
  synth.triggerAttackRelease('D2', '2n')
  setTimeout(() => { try { synth.frequency.rampTo('F2', 1.8) } catch (_) {} }, 400)
  setTimeout(() => _dispose(synth), 6000)
}

export async function playCrisisPass () {
  await ensureStarted()
  if (!_started) return
  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.05, decay: 0.7, sustain: 0.2, release: 1 }
  }).connect(_reverbLight)
  poly.volume.value = -12
  const now = Tone.now()
  poly.triggerAttackRelease(['C4', 'E4', 'G4'], '4n', now)
  poly.triggerAttackRelease(['E4', 'G4', 'C5'], '4n', now + 0.35)
  setTimeout(() => _dispose(poly), 5000)
}

export async function playCrisisFail () {
  await ensureStarted()
  if (!_started) return
  const dist = new Tone.Distortion(0.4).connect(_reverbLight)
  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.7 }
  }).connect(dist)
  poly.volume.value = -14
  poly.triggerAttackRelease(['Bb2', 'E3', 'Bb3'], '8n')
  setTimeout(() => { _dispose(poly); _dispose(dist) }, 3500)
}

export async function playCrossroadsTrigger () {
  await ensureStarted()
  if (!_started) return
  const metal = new Tone.MetalSynth({
    frequency: 400,
    envelope: { attack: 0.001, decay: 0.9, release: 1 },
    harmonicity: 5.1, modulationIndex: 32,
    resonance: 4000, octaves: 1.5
  }).connect(_reverbHeavy)
  metal.volume.value = -18
  metal.triggerAttackRelease('16n')
  setTimeout(() => _dispose(metal), 5000)
}

export async function playGameOverLoss () {
  await ensureStarted()
  if (!_started) return
  stopAmbientLoop()
  const LOSS_CHORD_PROGRESSION = [
    ['A2', 'C3', 'Eb3'],
    ['Ab2', 'B2', 'D3'],
    ['G2', 'Bb2', 'Db3'],
    ['F2', 'Ab2', 'C3']
  ]
  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.2, decay: 1.8, sustain: 0.25, release: 2.5 }
  }).connect(_reverbHeavy)
  poly.volume.value = -12
  const now = Tone.now()
  LOSS_CHORD_PROGRESSION.forEach((chord, i) => poly.triggerAttackRelease(chord, '2n', now + i * 1.4))
  setTimeout(() => _dispose(poly), 12000)
}

export async function playGameOverWin () {
  await ensureStarted()
  if (!_started) return
  stopAmbientLoop()
  const WIN_CHORD_PROGRESSION = [
    ['C4', 'E4', 'G4'],
    ['F4', 'A4', 'C5'],
    ['G4', 'B4', 'D5'],
    ['C4', 'E4', 'G4', 'C5']
  ]
  const poly = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.08, decay: 0.9, sustain: 0.3, release: 1.2 }
  }).connect(_reverbLight)
  poly.volume.value = -12
  const now = Tone.now()
  WIN_CHORD_PROGRESSION.forEach((chord, i) => poly.triggerAttackRelease(chord, '4n', now + i * 0.55))
  setTimeout(() => _dispose(poly), 8000)
}
