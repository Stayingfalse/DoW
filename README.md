# Dead of Winter (DoW)

**Survive the apocalypse, together or alone.** Dead of Winter drops you and your friends into a frozen wasteland where every decision matters. Work together to gather supplies, fend off zombies, and complete missions—but watch your back, because betrayal lurks in every shadow. Experience a rich 3D environment with atmospheric lighting, swirling blizzards, and immersive sound that brings the dead of winter to life right in your browser.

Built for instant play—no downloads, no installs. Jump in from any device, reconnect seamlessly if you lose signal, and enjoy a smooth multiplayer experience that just works. Whether you're strategizing with friends or testing your luck in solo mode, every game unfolds in a beautifully rendered 3D world that captures the tension and thrill of surviving against all odds.

---

## Technical Overview

A browser-first, multiplayer Dead of Winter–inspired experience: Fastify + SQLite on the server, vanilla JS + Three.js on the client, delivered as a PWA (no bundler).

## Local development

1. Install deps: `npm install` (runs `postinstall` to copy vendor assets into `client/vendor/`)
2. Create `.env`:
   - `SESSION_SECRET` (required in production; use 32+ chars)
   - `DB_PATH` (optional; defaults to `data/dow.db`)
3. Run server: `npm run dev` (or `npm start`)
4. Open: `http://localhost:3000`

## Project plan / roadmap

This project is built in phases. Earlier phases focus on shipping a playable slice; later phases expand content, polish, and operational readiness.

### Phase 1 — Foundation (PWA + server)
- Fastify server with sessions/cookies, static client hosting, and WebSocket endpoint
- SQLite schema + persistence layer for games/players/locations/events
- Auth flow: join/leave, open lobby (no password required)
- PWA: `manifest.json`, service worker caching, offline-friendly asset strategy
- Vendor workflow: copy Three.js/Tone.js assets to `client/vendor/` on install (no CDN / no bundler)

### Phase 2 — Three.js scene (visual foundation)
- 3D board tiles with per-location textures and readable overlays (labels, counts, markers)
- Procedural CanvasTexture “location” art (distinct silhouettes per location)
- Lighting pass (cold ambient/moon/key/fill/rim) + per-location color accents + campfire flicker
- Blizzard particles + atmospheric motion
- Camera + scene loop hooks for future interactions

### Phase 3 — Game data & engine (rules-first)
- Define core data sets: locations, survivors, items, crises, events, objectives, scenarios
- Implement authoritative game state machine (setup → rounds → end conditions)
- Actions + validation: move/search/attack/barricade/contribute/end turn, etc.
- Deterministic state transitions and server-side enforcement
- Event log stream to clients (for UI + replay/debug)

### Phase 4 — UI/UX (playable loop)
- Lobby flow: create/join, ready states, start game, reconnect handling
- In-game HUD: turn order, morale, round, current crisis, player hand
- Cards UI: draw/reveal/discard, clear affordances for “what can I do now?”
- Modals + prompts for multi-step actions (e.g., choose location → choose card)
- Accessibility + mobile-first layout pass (touch targets, scaling, contrast)

### Phase 5 — Multiplayer & sync (robustness)
- WS message protocol versioning + server broadcast patterns
- Reconciliation: reconnect/resume session, late-join/spectate policy
- Rate limiting / input throttling where needed
- Basic anti-cheat posture: server authoritative checks, ignore invalid commands

### Phase 6 — Audio & atmosphere ✅
- Tone.js-driven ambient layers: per-location wind (pink noise + low-pass filter), interior hum (sine oscillator), and distant zombie groans on a randomised loop
- Diegetic cues for every game event: dice roll, card draw/place, zombie attack, survivor death, morale drop, crisis reveal/pass/fail, crossroads trigger, game-over win/loss — all synthesised, no audio files
- Shared reverb chain (light + heavy) initialised once on first user interaction; all one-shot synths self-dispose after playback
- Mix controls widget (bottom-right corner): mute toggle + volume slider, state persisted to localStorage
- Respects `prefers-reduced-motion`: audio starts muted and volume control disabled when the OS accessibility preference is set

### Phase 7 — Content & balancing ✅
- Crisis deck expanded to 20 cards across all contribution types (food, medicine, fuel, weapon, tool, any)
- Objectives pool expanded to 12 survivor objectives + 1 betrayer; new goals include Field Medic, Crisis Hero, Explorer, and Generous Spirit
- 17 of 30 characters receive unique starting item kits (location-appropriate: weapons at police station, medicine at hospital, fuel at gas station, food at grocery store, tools at colony)
- Difficulty system (easy / normal / hard): action dice per turn scale 5 / 4 / 3; zombie spawn rate scales 1 / 2 / 3 per round; morale start shifts ±1 for easy/hard; hard mode grants betrayer extra dice
- Greedy bot AI (`server/game/bot-hooks.js`): attack > search > barricade > move toward most zombie-heavy location; full turn resolved server-side in 1.2 s; add via `ADD_BOT` WS message; bot chains turns automatically and is never assigned betrayer role

### Phase 8 — Release & operations ✅
- `Dockerfile` updated with `HEALTHCHECK` instruction (polls `/health` every 30 s; 3 retries; 5 s timeout); `.dockerignore` added to keep images lean
- `/health` JSON endpoint (`server/routes/health.js`): returns `status`, `uptime`, db latency, memory stats; responds 503 if DB is unreachable — ready for Docker, load balancers, and uptime monitors
- `scripts/migrate.js`: versioned migration runner backed by a `schema_version` table; idempotent re-runs; run with `npm run migrate`; migrations added for `difficulty` and `is_bot` columns
- Graceful shutdown on SIGTERM/SIGINT (`server/index.js`): Fastify drains in-flight requests before exiting
- `uncaughtException` / `unhandledRejection` handlers log fatally and exit (rely on Docker/PM2 restart policy for auto-recovery)

## Scope notes
- Target: fun, readable, fast-to-load browser game; prioritize “playable slice” over perfect rules completeness.
- The roadmap can change as the playable loop is validated; phases are a planning tool, not a contract.
