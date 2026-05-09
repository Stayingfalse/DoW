# Dead of Winter

**Survive the apocalypse, together or alone.** Dead of Winter drops you and your friends into a frozen wasteland where every decision matters. Work together to gather supplies, fend off zombies, and complete missions—but watch your back, because betrayal lurks in every shadow. Experience a rich 3D environment with atmospheric lighting, swirling blizzards, and immersive sound that brings the dead of winter to life right in your browser.

Built for instant play—no downloads, no installs. Jump in from any device, reconnect seamlessly if you lose signal, and enjoy a smooth multiplayer experience that just works. Whether you're strategizing with friends or testing your luck solo with bot opponents, every game unfolds in a beautifully rendered 3D world that captures the tension and thrill of surviving against all odds.

---

## Game Overview

Dead of Winter is a browser-based multiplayer survival game inspired by the tabletop board game. Players control survivors in a zombie-infested colony, working together to complete objectives while managing limited resources and dealing with potential traitors.

### Core Gameplay

- **Multiplayer Co-op**: 2-5 players work together to survive and complete scenario objectives
- **Hidden Objectives**: Each player receives a secret objective—most are cooperative, but one might be the betrayer
- **Turn-Based Actions**: Players take turns moving survivors, searching for supplies, fighting zombies, and barricading locations
- **Crisis Management**: Each round presents a crisis that the colony must collectively resolve
- **Morale System**: The colony's morale determines victory or defeat—keep it above zero or lose everything
- **Multiple Difficulty Levels**: Choose between easy, normal, or hard mode for different challenge levels
- **Bot Players**: Add AI opponents to fill out your game or practice strategies

### Locations

The game features 7 distinct locations, each with unique characteristics:

- **The Colony**: Your central stronghold and starting location
- **Gas Station**: Find fuel and mechanical supplies
- **Grocery Store**: Stock up on food to feed the colony
- **Hospital**: Gather medicine and medical equipment
- **Police Station**: Arm yourself with weapons and ammunition
- **School**: Search for useful tools and supplies
- **Library**: Discover rare items and resources

### Game Phases

Each round consists of four phases:

1. **Action Phase**: Players take turns performing actions with their survivors
2. **Crisis Phase**: All players contribute cards to resolve the current crisis
3. **Colony Phase**: Zombies move, attack survivors, and test barricades
4. **Cleanup Phase**: Prepare for the next round

### Actions

During your turn, you can perform actions using dice:

- **Move**: Travel between locations on the board
- **Search**: Draw item cards from a location's deck
- **Attack**: Kill zombies at your current location
- **Barricade**: Build defenses to protect against zombie attacks
- **Use Item**: Play special item cards for various effects
- **Clean Waste**: Remove waste tokens that accumulate at locations

### Winning & Losing

**Victory**: Complete the main objective before the scenario ends and maintain morale above zero

**Defeat**: The colony's morale drops to zero, or you fail to complete objectives before the final round

**Betrayer**: If you're the betrayer, you win by driving morale to zero while appearing to help

---

## Technical Stack

**Server**: Fastify 5 + SQLite (better-sqlite3) + WebSockets

**Client**: Vanilla JavaScript + Three.js for 3D rendering + Tone.js for audio

**Architecture**: Progressive Web App (PWA) with service worker caching, no build step required

---

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm (comes with Node.js)

### Installation & Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```
   This automatically runs `postinstall` to copy Three.js and Tone.js vendor assets into `client/vendor/`.

2. **Create a `.env` file** (optional for development, required for production):
   ```bash
   SESSION_SECRET=your-secret-key-at-least-32-characters-long
   DB_PATH=data/dow.db
   LOBBY_PASSWORD=optional-password-for-private-games
   PORT=3000
   ```

3. **Run database migrations** (optional on first run—server will auto-migrate):
   ```bash
   npm run migrate
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

5. **Open your browser**:
   ```
   http://localhost:3000
   ```

### Docker Deployment

The project includes a production-ready Dockerfile with health checks and graceful shutdown:

```bash
# Build the image
docker build -t dow .

# Run the container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e SESSION_SECRET=your-secret-key \
  dow
```

The container includes:
- Automatic health checks via `/health` endpoint
- Graceful shutdown handling
- Persistent data storage via volume mount
- Database migration on startup

---

## Game Features

### 🎨 Immersive 3D Graphics

- Procedurally generated textures for each location
- Dynamic lighting with cold ambient, moonlight, and warm location glows
- Real-time blizzard particle system with wind effects
- Smooth camera controls and zoom

### 🎵 Atmospheric Audio

- Synthesized ambient soundscapes unique to each location
- Diegetic sound effects for all game events (dice rolls, card draws, zombie attacks)
- Persistent mix controls with localStorage
- Respects `prefers-reduced-motion` accessibility preference

### 🎮 Smart Bot AI

- Greedy decision-making: attack > search > barricade > move
- Full turn execution in 1.2 seconds
- Never assigned as the betrayer
- Automatically chains turns

### ⚙️ Three Difficulty Modes

| Setting | Action Dice | Zombie Spawn | Starting Morale | Betrayer Bonus |
|---------|-------------|--------------|-----------------|----------------|
| Easy | 5 | 1/round | +1 | None |
| Normal | 4 | 2/round | 0 | None |
| Hard | 3 | 3/round | -1 | +1 die |

### 📦 Rich Content

- **30 unique characters** with distinct abilities and flavor
- **17 characters** have location-specific starting item kits
- **20 crisis cards** covering all contribution types
- **12 survivor objectives** + 1 betrayer objective
- **Multiple scenarios** with varying objectives and round limits
- **Dozens of item cards** including weapons, food, medicine, tools, fuel

### 🔐 Robust Multiplayer

- WebSocket-based real-time synchronization
- Automatic reconnection and session resume
- Rate limiting and anti-cheat validation
- Protocol versioning for compatibility

---

## Project Structure

```
DoW/
├── client/                 # Client-side code
│   ├── audio/             # Tone.js audio engine
│   ├── render/            # Three.js rendering (board, lighting, particles)
│   │   └── procedural/    # Procedural texture generation
│   ├── state/             # Client state management
│   ├── ui/                # UI components (lobby, HUD, cards, modals)
│   ├── utils/             # Utility functions (HTML escaping, etc.)
│   ├── index.html         # Main HTML entry point
│   ├── main.js            # Client bootstrap
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker for offline caching
│   └── vendor/            # Third-party libraries (Three.js, Tone.js)
├── server/                # Server-side code
│   ├── data/              # Game content (JSON files)
│   │   ├── characters.json
│   │   ├── crisis.json
│   │   ├── crossroads.json
│   │   ├── items.json
│   │   ├── locations.json
│   │   ├── objectives.json
│   │   └── scenarios.json
│   ├── db/                # Database setup and queries
│   ├── game/              # Game engine and logic
│   │   ├── actions.js     # Action handlers (move, attack, search, etc.)
│   │   ├── bot-hooks.js   # AI decision-making
│   │   ├── crisis.js      # Crisis resolution logic
│   │   ├── crossroads.js  # Crossroads event system
│   │   ├── engine.js      # Core game engine
│   │   ├── ratelimit.js   # WebSocket rate limiting
│   │   ├── statemachine.js # Phase transitions
│   │   ├── validate.js    # Input validation
│   │   └── zombie.js      # Zombie movement and attacks
│   ├── plugins/           # Fastify plugins
│   ├── routes/            # HTTP and WebSocket routes
│   └── index.js           # Server entry point
├── scripts/               # Utility scripts
│   ├── copy-vendor.js     # Copies vendor assets (runs on postinstall)
│   └── migrate.js         # Database migration runner
├── data/                  # SQLite database (gitignored)
├── .dockerignore          # Docker build exclusions
├── .env                   # Environment variables (gitignored)
├── Dockerfile             # Production container definition
└── package.json           # Dependencies and scripts
```

---

## Available Scripts

- `npm start` — Start production server
- `npm run dev` — Start development server with auto-restart (nodemon)
- `npm run migrate` — Run database migrations manually
- `npm install` — Install dependencies (auto-runs `postinstall` to copy vendor assets)

---

## API Endpoints

### HTTP Endpoints

- `GET /` — Serves the game client
- `GET /health` — Health check endpoint (returns status, uptime, DB latency, memory)
- `GET /auth/player` — Get current player session info
- `POST /auth/join` — Join/create player session
- `POST /auth/leave` — Leave current session
- `GET /game/meta` — Get game metadata (scenarios, difficulties)

### WebSocket Messages

Connect to `/ws` for real-time game updates. All messages follow the format:

```javascript
{
  type: "MESSAGE_TYPE",
  payload: { /* message-specific data */ }
}
```

**Client → Server**:
- `CREATE_GAME`, `JOIN_GAME`, `START_GAME`
- `ACTION_MOVE`, `ACTION_SEARCH`, `ACTION_ATTACK`, `ACTION_BARRICADE`, `ACTION_CLEAN`, `ACTION_ITEM`
- `END_TURN`, `ADVANCE_PHASE`
- `CRISIS_CONTRIB`
- `CROSSROADS_CHOICE`
- `EXILE_VOTE`
- `ADD_BOT`

**Server → Client**:
- `GAME_STATE` — Full state sync
- `EVENT_LOG` — Game event notifications

---

## Health & Monitoring

The `/health` endpoint provides real-time system status:

```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": "2026-05-09T22:00:00.000Z",
  "db": {
    "ok": true,
    "latencyMs": 2
  },
  "memory": {
    "rss": 67108864,
    "heapUsed": 45678901,
    "heapTotal": 54321098
  }
}
```

- Returns `200 OK` when healthy
- Returns `503 Service Unavailable` if database is unreachable
- Cached for 10 seconds to prevent abuse

---

## Contributing

This is a complete, playable implementation of Dead of Winter for the browser. The codebase prioritizes:

- **Readability**: Clear, well-commented code
- **Performance**: Fast load times, smooth 3D rendering, efficient state management
- **Accessibility**: Keyboard navigation, reduced motion support, clear visual hierarchy
- **Security**: Server-side validation, rate limiting, XSS protection

---

## License

This project is a fan-made browser adaptation inspired by the Dead of Winter board game. It is intended for educational and entertainment purposes only.
