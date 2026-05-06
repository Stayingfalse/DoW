/**
 * Dead of Winter — WebSocket Client
 * Phase 5: Protocol versioning (HELLO/HELLO_ACK), VERSION_MISMATCH handling.
 * Wraps the WS connection and dispatches messages to the store.
 */

const PROTOCOL_VERSION = 1

export class WsClient {
  constructor (store) {
    this.store = store
    this.ws = null
    this.reconnectDelay = 1000
    this._listeners = new Map()
    // If a VERSION_MISMATCH is received, stop reconnecting
    this._versionMismatch = false
  }

  connect () {
    if (this._versionMismatch) return
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/ws`

    this.ws = new WebSocket(url)

    this.ws.addEventListener('open', () => {
      console.log('[WS] Connected')
      this.reconnectDelay = 1000
      this.store.dispatch({ type: 'WS_CONNECTED' })
      // Send protocol handshake immediately
      this.ws.send(JSON.stringify({ type: 'HELLO', payload: { version: PROTOCOL_VERSION } }))
    })

    this.ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data)
        this._dispatch(msg)
      } catch (err) {
        console.error('[WS] Parse error:', err)
      }
    })

    this.ws.addEventListener('close', (event) => {
      console.warn('[WS] Disconnected', event.code, event.reason)
      this.store.dispatch({ type: 'WS_DISCONNECTED' })
      if (event.code !== 4001 && !this._versionMismatch) {
        // Reconnect unless kicked for auth or version mismatch
        this.store.dispatch({ type: 'WS_RECONNECTING' })
        setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          this.connect()
        }, this.reconnectDelay)
      }
    })

    this.ws.addEventListener('error', (err) => {
      console.error('[WS] Error:', err)
    })
  }

  send (type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send — not connected')
      return
    }
    this.ws.send(JSON.stringify({ type, payload }))
  }

  on (type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, [])
    this._listeners.get(type).push(fn)
  }

  off (type, fn) {
    if (!this._listeners.has(type)) return
    this._listeners.set(type, this._listeners.get(type).filter(f => f !== fn))
  }

  _dispatch (msg) {
    const { type, payload } = msg

    // Handle VERSION_MISMATCH at client level — stop all reconnect attempts
    if (type === 'VERSION_MISMATCH') {
      this._versionMismatch = true
      console.error('[WS] Protocol version mismatch:', payload)
    }

    // Route to store
    this.store.dispatch({ type, payload })

    // Also notify any direct listeners
    const fns = this._listeners.get(type) || []
    for (const fn of fns) fn(payload)

    const wildcards = this._listeners.get('*') || []
    for (const fn of wildcards) fn(msg)
  }
}
