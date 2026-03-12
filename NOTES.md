# puckOFF - Agent Notes

## Key Gotchas

### Firebase Auth

- API key and config are in `.env` (gitignored)
- Production gets env vars from GitHub Actions secrets (see `deploy.yml`)
- If `auth/invalid-api-key` returns, check that all secrets exist in GitHub repo settings

### Standard Icons (Tier 0)

- **No image files exist** for standard colors — they reference `/images/pucks/standard_*.png` which don't exist
- All icon rendering must check `icon.tier === 0 && icon.color` and render a colored `<div>` instead of an `<img>`
- Fixed in: `IconChooser.jsx`, `Lobby.jsx`
- `PuckPreview.jsx` already handled this correctly (line 15: `hasTexture = icon?.tier !== 0`)

### Deployment

- Deploy pipeline: push to `main` → GitHub Actions → SSH to Oracle VPS → Docker build
- `.env` is generated on server from GitHub secrets (not committed)
- Docker build uses `--no-cache` to avoid stale builds
- Browser may cache old JS bundles; hard refresh (Ctrl+Shift+R) clears this

### Auth Wall

- `App.js` enforces login before game access
- Users can also choose "Play Offline"
- `BattleArena` receives `forceOffline` prop when in offline mode
- "Login to Save Progress" link appears inside BattleArena for offline users

### Loadout System (Refactored Feb 2026)

- **1/2/3 keybinds** activate powerup slots directly (no more random refresh)
- Cooldowns stored in `powerupCooldowns` state as `{ [playerId_itemId]: { end, duration } }`
- `executePowerup()` is the shared core; used by both map pickups (spacebar) and loadout slots
- `GameHUD` uses a `requestAnimationFrame` loop for smooth cooldown bar rendering
- Powerup info lives in `src/utils/powerups.js` — each has a `cooldown` field (default 5000ms)

### Game Start Countdown

- 3-2-1-GO overlay freezes physics and pauses game timer until countdown finishes
- `startCountdown` state: `3 → 2 → 1 → 'GO!' → null`
- Timer only begins after countdown ends (see `endTimeRef.current` reset)

### Damage Decay

- Only active when `modeConfig.damageDecay === true` (currently only "timed" mode)
- Heals 1 damage per 200ms tick after 3 seconds without taking damage
- `lastDamageTimeRef` tracks per-player last damage timestamps

### Offline Win Condition

- `reportGameEnd` in `useMultiplayer.js` now handles `isOffline` by setting `gameState='finished'`
- Previously silently failed because it required a socket

### Collision Sparks

- `CollisionSparks` / `SparkBurst` components in `Puck.jsx` use InstancedMesh
- Sparks emit at contact midpoint on puck-to-puck hits
- Auto-removed after 800ms via setTimeout

### Spectator Mode (March 2026)

- Unlimited observers allowed per room via `spectators` Set in server.
- `DynamicCamera.jsx` implements an "Action Center" follow logic for spectators (center of all players + zoom).
- `BattleArena.jsx` skips rendering local player components for spectators to save resources.

### Global Matchmaking (March 2026)

- Replaces individual room-hopping with a central `matchmakingQueue` on the server.
- Matches players in groups of 4 every 2.5s; 10s wait triggers a match with available players + bots.
- `useMultiplayer.js` automatically handles the `matchFound` event to join the room.

### 🤖 Bot Backfill & AI Proxies (March 2026)

- **Architecture**: Bots are "Server-Side Entities" that simulate player behavior within the 22Hz physics loop. They are broadcast in the `players` map like human players but with an `isBot: true` marker.
- **IDs**: Bot IDs always follow the pattern `bot_[random_suffix]`.
- **Combat**: The server performs active collision detection for bots. If a bot is above a human and within 1.5 units, it emits a `stomp` event authoritatively.
- **Matchmaking**: Bots are spawned in `startGame` if the room has < 4 players.
- **Replacement**: Bots replace human players after a 60s disconnect timeout or immediately on an AFK kick to maintain 4-player match integrity.

### 🌐 Multi-Region Support (March 2026)

- **Infrastructure**: The client connects to the regional endpoint URL defined in `config.js`. Matchmaking and sessions are currently regional-locked (players only play with others in the same region).
- **Latency**: Regional servers help, but "Lag Compensation" (Backwards Reconciliation) is the primary safeguard for fair play.
