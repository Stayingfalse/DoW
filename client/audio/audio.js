/**
 * Dead of Winter — Audio Engine
 * All audio synthesised via Tone.js. No audio files.
 * Phase 7: Full implementation.
 * Phase 1: Stub with correct export surface.
 */

/* global Tone */

let _started = false
let _ambientLoop = null
let _ambientGain = null

async function ensureStarted () {
  if (!_started && typeof Tone !== 'undefined') {
    await Tone.start()
    _started = true
  }
}

export async function playDiceRoll () {
  await ensureStarted()
  // Phase 7: synth rattle
}

export async function playCardDraw () {
  await ensureStarted()
  // Phase 7
}

export async function playCardPlace () {
  await ensureStarted()
  // Phase 7
}

export async function playZombieAttack () {
  await ensureStarted()
  // Phase 7
}

export async function playSurvivorDeath () {
  await ensureStarted()
  // Phase 7
}

export async function playMoraleDrop () {
  await ensureStarted()
  // Phase 7
}

export async function playCrisisReveal () {
  await ensureStarted()
  // Phase 7
}

export async function playCrisisPass () {
  await ensureStarted()
  // Phase 7
}

export async function playCrisisFail () {
  await ensureStarted()
  // Phase 7
}

export async function playCrossroadsTrigger () {
  await ensureStarted()
  // Phase 7
}

export async function playGameOverLoss () {
  await ensureStarted()
  // Phase 7
}

export async function playGameOverWin () {
  await ensureStarted()
  // Phase 7
}

export async function startAmbientLoop (locationId) {
  await ensureStarted()
  // Phase 7: wind + location bed, intensity scales with round
}

export function stopAmbientLoop () {
  if (_ambientLoop) {
    _ambientLoop.stop()
    _ambientLoop = null
  }
}
