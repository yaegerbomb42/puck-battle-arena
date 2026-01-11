# puckOFF - Agent Handoff Document

> **Last Updated**: 2026-01-10 21:28 CST
> **Project Status**: Active Development
> **Dev Server**: `npm start` → <http://localhost:3000>

---

## 🎮 Project Overview

**puckOFF** is a multiplayer physics-based arena combat game built with:

- **React** + **React Three Fiber** (3D rendering)
- **@react-three/cannon** (physics)
- **Firebase** (auth + Firestore for user data)
- **Socket.IO** (multiplayer)
- **Web Audio API** (synthetic sound effects)

Players control glowing pucks in a procedurally generated arena, using powerups to knock opponents off the stage. Think Super Smash Bros meets air hockey.

---

## 📁 Key Files & Architecture

```
src/
├── components/
│   ├── BattleArena.jsx      # Main game orchestrator
│   ├── Puck.jsx             # Player puck (3D model + physics)
│   ├── ReplaySystem.jsx     # NEW: Killcam/replay system
│   ├── ProceduralArena.jsx  # Tile-based arena renderer
│   └── UI/
│       ├── Lobby.jsx        # Main menu + matchmaking
│       ├── LoadoutMenu.jsx  # Powerup selection (3 slots)
│       ├── Store.jsx        # Icon pack shop
│       └── IconChooser.jsx  # Icon collection viewer
├── utils/
│   ├── audio.js             # Synthetic audio manager
│   ├── analytics.js         # NEW: FPS/gameplay tracking
│   ├── economy.js           # Credits, packs, tiers
│   ├── powerups.js          # Powerup definitions
│   └── mapGenerator.js      # Procedural arena generation
├── contexts/
│   └── AuthContext.jsx      # Firebase auth + inventory
└── hooks/
    └── useMultiplayer.js    # Socket.IO game state
```

---

## 🔧 Recent Changes (This Session)

### Completed

1. **Enhanced Audio System** (`src/utils/audio.js`)
   - Added `startAmbient()` - droning pad with LFO
   - Added `playPositional(x, z, intensity)` - spatial stereo panning
   - Added `playReveal(tier)` - pack opening sounds
   - Added volume controls: `setMasterVolume()`, `setMusicVolume()`, `setSfxVolume()`, `toggleMute()`

2. **Replay/Killcam System** (`src/components/ReplaySystem.jsx`)
   - Records last 10 seconds in circular buffer
   - Triggers on knockout
   - Slow-motion playback with player color tracking

3. **Analytics System** (`src/utils/analytics.js`)
   - FPS tracking
   - Knockout/powerup usage tracking
   - Session stats

4. **Loadout Persistence**
   - Now supports 3 loadout slots
   - Added slot selector UI in `LoadoutMenu.jsx`
   - Integrated with Firebase via `updateLoadout()` and `setActiveLoadout()`

5. **Visual Updates**
   - New arena background image (`public/images/lobby_background.png`)
   - Mystery icon for unrevealed items (`public/images/mystery_icon.png`)
   - Fixed `emissiveIntensity` bug in Puck.jsx (was using `Date.now()`)

### Known Issues

- **Google Login COOP Policy**: May fail in some browsers (cross-origin isolation)
- **theme-color lint warning**: Browser compatibility warning, not a real error

---

## 📋 TODO List (See `/TODO.md`)

**Completed (10/22)**:

- ✅ Ambient audio layers
- ✅ Spatial audio
- ✅ Pack reveal sounds
- ✅ Loadout persistence
- ✅ Mystery icon asset
- ✅ Analytics system
- ✅ Replay/killcam system
- ✅ Arena background image

**Remaining**:

- [ ] Server timer interpolation (smoother countdown)
- [ ] Projectile velocity tracking
- [ ] Firebase retry logic for error handling
- [ ] Loading skeleton screens
- [ ] Ranked matchmaking
- [ ] Tournament mode
- [ ] Controller support

---

## 🚀 Quick Commands

```bash
# Start dev server
npm start

# Start multiplayer server
cd server && node index.js

# Build for production
npm run build
```

---

## 💡 Tips for Next Agent

1. **Puck.jsx is complex** - It has custom shaders for legendary/divine icons. Be careful with materials.

2. **Audio requires user gesture** - Browser policies require `audio.init()` to be called after user interaction (handled in App.js).

3. **The replay system is basic** - Currently shows a 2D mini-view. Could be enhanced to show actual 3D replay.

4. **Firebase structure**:
   - Users: `/users/{uid}` contains inventory, loadouts, stats
   - Economy uses `credits` not coins

5. **Map generation** - `mapGenerator.js` handles procedural arenas with biomes (Neon City, Volcanic Forge, etc.)

6. **Icon Tiers** - 10 tiers from Common to Divine. Tier 8+ are "mystery" and masked until owned.

---

## 🔗 External Integrations

- **Firebase**: Auth + Firestore (configured in `src/firebase.js`)
- **Stripe**: Payment links in `Store.jsx` (replace with real URLs)
- **Google AdSense**: Script added to `public/index.html`

---

## 📸 Assets

- Logo: `/public/images/logo.png` (puckOFF branding)
- Icons: `/public/icons/Tier_X_Name/icon_N.png` (150 collectibles)
- Powerups: `/public/powerups/` (gameplay abilities)

---

## 🎯 User's Style Preferences

- Prefers **minimal browser automation** (don't open many pages)
- Wants **premium, neon-tech aesthetic**
- Likes **comprehensive implementations** over minimal MVPs
- Values **clear progress tracking** (TODO.md)

---

Good luck, future agent! 🚀
