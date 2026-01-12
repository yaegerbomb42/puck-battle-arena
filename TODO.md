# puckOFF Future Improvements & TODO List

## 🎨 Visual & Audio Enhancements

- [x] Add more complex ambient layers to the audio system
- [x] Enhance pack-opening animations with synchronized audio-visual cues
- [x] Implement spatial audio for better collision awareness

## 🎮 Gameplay & Features

- [x] Implement proper loadout persistence
- [x] Improve server timer synchronization
- [x] Enhance projectile physics with proper velocity tracking

## 🖼️ Asset Management

- [x] Replace mystery icon placeholder with final asset

## 🔧 Technical Debt & Optimizations

- [x] Investigate and resolve Google login COOP policy issue
- [x] Implement comprehensive error handling for firebase operations
- [x] Add loading states and skeleton screens
  - Created `LoadingStates.jsx` with Store, IconPicker, PackOpening, Lobby skeletons
  - Full-page loading overlay component

## 📊 Analytics & Monitoring

- [x] Add performance metrics tracking
- [x] Implement player analytics

## 🎯 Future Feature Ideas

- [x] Replay system for epic moments (Killcam)
- [ ] Ranked matchmaking system
- [ ] Tournament mode with brackets
- [x] Custom game rules/modifiers
  - Created `GameRulesModal.jsx` with time, lives, gravity, knockback, speed options
- [x] Spectator mode
  - Created `SpectatorMode.jsx` with player focus, auto-follow, and spectator UI
  - Integrated into `useMultiplayer.js` hook
- [ ] Mobile responsive controls
- [x] Controller support
  - Created `useGamepad.js` hook for Xbox/PS4 controllers
  - Fullscreen/pointer lock for Xbox Edge browser optimization
  - Vibration feedback support

## 🐛 Known Issues

- [x] `meta[name=theme-color]` lint warning (public/index.html)
- [ ] Safari iOS compatibility (inset, backdrop-filter) - minor visual issues

---

**Last Updated**: 2026-01-11
**Completed**: 19/22
**Remaining**: 3
