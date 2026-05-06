/**
 * Dead of Winter — Event Log
 * Collapsible sidebar, plain text event narration.
 */

export function initLog (store) {
  const el = document.getElementById('log-overlay')

  const styles = `
    #log-panel {
      position: fixed;
      top: 80px;
      right: 0;
      width: 280px;
      max-height: calc(100vh - 120px);
      background: rgba(22, 27, 34, 0.92);
      border: 1px solid #30363d;
      border-right: none;
      border-radius: 10px 0 0 10px;
      display: flex;
      flex-direction: column;
      transform: translateX(248px);
      transition: transform 0.25s ease;
    }
    #log-panel.expanded { transform: translateX(0); }
    #log-panel.hidden { display: none; }
    #log-toggle {
      position: absolute;
      left: -32px;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 64px;
      background: rgba(22, 27, 34, 0.92);
      border: 1px solid #30363d;
      border-right: none;
      border-radius: 8px 0 0 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #8b949e;
      font-size: 0.9rem;
      writing-mode: vertical-rl;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 0.65rem;
    }
    #log-header {
      padding: 12px 16px 8px;
      font-size: 0.72rem;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-bottom: 1px solid #21262d;
      flex-shrink: 0;
    }
    #log-entries {
      overflow-y: auto;
      flex: 1;
      padding: 8px 0;
    }
    .log-entry {
      padding: 5px 16px;
      font-size: 0.8rem;
      color: #c9d1d9;
      border-bottom: 1px solid #161b22;
      line-height: 1.45;
    }
    .log-entry .log-time {
      font-size: 0.68rem;
      color: #484f58;
      margin-right: 6px;
    }
  `
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  el.innerHTML = `
    <div id="log-panel" class="hidden">
      <div id="log-toggle">Log</div>
      <div id="log-header">Event Log</div>
      <div id="log-entries"></div>
    </div>
  `

  const panel = el.querySelector('#log-panel')
  const toggleBtn = el.querySelector('#log-toggle')
  const entriesEl = el.querySelector('#log-entries')

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('expanded')
  })

  store.subscribe((state) => {
    if (state.game) {
      panel.classList.remove('hidden')
    }

    const log = state.ui.log || []
    entriesEl.innerHTML = log
      .slice().reverse()
      .map(entry => {
        const t = new Date(entry.time)
        const time = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`
        return `<div class="log-entry"><span class="log-time">${time}</span>${escHtml(entry.text)}</div>`
      })
      .join('')
  })
}

function pad (n) { return String(n).padStart(2, '0') }

function escHtml (str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
