# Core Project Roadmap

This document tracks active development across two lanes: Feature Fixes (polishing existing systems) and Future Features (new implementations).

## 🔧 Feature Fixes Todo

Bugs, polish, and refinements for existing systems.

- [ ] [fix:wager] Wager System Logic: Implemented joinWagerMatch and updateMatchStats to handle Ante/Payouts correctly.
- [ ] [fix:store] Store UI Polish: Update "Fuel" copy, hide dollar signs, add rolling counters for currency.
- [ ] [fix:physics] Puck Collisions: Address jittery collisions on edge walls.
- [ ] [fix:loadout] Loadout Persistence: Ensure selected loadouts save/load reliably between sessions.
- [ ] [fix:timer] Server Timer Sync: Interpolate server timer for smoother countdown.
- [ ] [fix:network] Firebase Retry Logic: Add robust error handling for network flakes.
- [ ] [fix:ui] Loading Skeletons: Finalize skeleton screens for all views.
- [ ] [fix:safari] Safari iOS Compatibility: Fix inset and backdrop-filter visual glitches.

## 🚀 Future Features to Add

New gameplay mechanics, systems, and content.

- [ ] [feature:zoins] Economy Implementation: Migrated to integer-based Zoin system with bundles.
- [ ] [feature:announcer] AI Game Announcer: Implement a local LLM/TTS system to commentate on matches (e.g., "DOUBLE KILL!", "WHAT A SAVE!").
- [ ] [feature:crowd] Crowd Reactions: Dynamic sound engine that cheers/boos based on game intensity.
- [ ] [feature:replay] Killcam / Replay: Record and playback the last 5 seconds of a knockout.
- [x] [feature:ranked] Global Matchmaking: Persistent server-side queue with fallback systems.
- [x] [feature:spectator] Spectator Mode: Unlimited observers with cinematic action camera.
- [ ] [feature:tournament] Tournament Mode: Bracket-style tournament support.
- [ ] [feature:mobile] Mobile Controls: Responsive touch controls for mobile play.
- [ ] [feature:velocity] Projectile Tracking: Enhanced velocity tracking for projectiles.
