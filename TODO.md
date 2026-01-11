# puckOFF Future Improvements & TODO List

## 🎨 Visual & Audio Enhancements

- [x] Add more complex ambient layers to the audio system
  - Background music loops for different game modes
  - Ambient arena soundscapes (wind, machinery, etc.)
  - Dynamic music that intensifies with action

- [x] Enhance pack-opening animations with synchronized audio-visual cues
  - Add reveal sound effects for each rarity tier
  - Particle effects synced to audio beats
  - Celebratory sounds for high-tier pulls

- [x] Implement spatial audio for better collision awareness
  - 3D positional audio for impacts based on camera position
  - Distance-based volume attenuation
  - Directional cues for off-screen events

## 🎮 Gameplay & Features

- [x] Implement proper loadout persistence (currently only slot 0 is updated)
  - Location: `src/components/UI/Lobby.jsx`
  - Allow multiple loadout slots
  - Save/load different loadout configurations

- [ ] Improve server timer synchronization
  - Location: `src/components/BattleArena.jsx:310`
  - Current: Hard sync approach
  - Implement interpolation for smoother countdown

- [ ] Enhance projectile physics with proper velocity tracking
  - Location: `src/components/ProjectileSystem.jsx:48`
  - Implement accurate velocity calculations for advanced collision detection

## 🖼️ Asset Management

- [x] Replace mystery icon placeholder with final asset
  - Location: `src/utils/economy.js:164`
  - Created: `/images/mystery_icon.png`

## 🔧 Technical Debt & Optimizations

- [ ] Investigate and resolve Google login COOP policy issue (if not fully resolved)
  - Ensure cross-origin isolation headers are properly configured
  - Test across different browsers

- [ ] Implement comprehensive error handling for firebase operations
  - Add retry logic for network failures
  - Better user feedback for auth errors

- [ ] Add loading states and skeleton screens
  - Store component while fetching inventory
  - Icon chooser during initial load
  - Pack opening preparation

## 📊 Analytics & Monitoring

- [x] Add performance metrics tracking
  - FPS monitoring
  - Network latency indicators
  - Physics simulation performance

- [x] Implement player analytics
  - Track popular powerup combinations
  - Most successful strategies
  - Player progression metrics

## 🎯 Future Feature Ideas

- [x] Replay system for epic moments (Killcam)
- [ ] Ranked matchmaking system
- [ ] Tournament mode with brackets
- [ ] Custom game rules/modifiers
- [ ] Spectator mode
- [ ] Mobile responsive controls
- [ ] Controller support

## 🐛 Known Issues

- [x] `meta[name=theme-color]` lint warning (public/index.html)
  - Updated to use media queries for dark/light modes
  - Browser compatibility warning is expected (Chrome/Android only)

---

**Last Updated**: 2026-01-10
**Completed**: 10/22
**Remaining**: 12
