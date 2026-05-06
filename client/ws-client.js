/**
 * Dead of Winter — WebSocket Client
 * Wraps the WS connection and dispatches messages to the store.
 */
export class WsClient {
  constructor (store) {
    this.store = store
    this.ws = null
    this.reconnectDelay = 1000
    this._listeners = new Map()
  }

  connect () {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/ws`

    this.ws = new WebSocket(url)

    this.ws.addEventListener('open', () => {
      console.log('[WS] Connected')
      this.reconnectDelay = 1000
      this.store.dispatch({ type: 'WS_CONNECTED' })
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
      if (event.code !== 4001) {
        // Reconnect unless kicked for auth
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

    // Route to store
    this.store.dispatch({ type, payload })

    // Also notify any direct listeners
    const fns = this._listeners.get(type) || []
    for (const fn of fns) fn(payload)

    const wildcards = this._listeners.get('*') || []
    for (const fn of wildcards) fn(msg)
  }
}
