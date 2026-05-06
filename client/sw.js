/* Dead of Winter — Service Worker */
const CACHE_VERSION = 'dow-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/main.js',
  '/manifest.json',
  '/ws-client.js',
  '/state/store.js',
  '/render/scene.js',
  '/render/board.js',
  '/render/tokens.js',
  '/render/dice.js',
  '/render/particles.js',
  '/render/lighting.js',
  '/render/procedural/survivors.js',
  '/render/procedural/zombies.js',
  '/render/procedural/cards.js',
  '/render/procedural/locations.js',
  '/audio/audio.js',
  '/ui/lobby.js',
  '/ui/hud.js',
  '/ui/cards.js',
  '/ui/modals.js',
  '/ui/log.js',
  '/vendor/three.module.js',
  '/vendor/Tone.js'
]

const NETWORK_FIRST_PATTERNS = [
  /^\/auth\//,
  /^\/api\//
]

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('dow-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // WebSocket — bypass completely
  if (request.url.startsWith('ws://') || request.url.startsWith('wss://')) return

  // Network-first for auth + api routes
  if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request, STATIC_CACHE))
    return
  }

  // Cache-first for everything else (static assets + vendor)
  event.respondWith(cacheFirst(request, STATIC_CACHE))
})

async function cacheFirst (request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst (request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cache = await caches.open(cacheName)
    const cached = await cache.match(request)
    return cached || new Response('Offline', { status: 503 })
  }
}
