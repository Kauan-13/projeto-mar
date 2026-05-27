# Code & Architecture Problems

> Generated: 2026-05-25. Based on commit `1e19c51` (HEAD).
> This document catalogues existing issues — it does NOT prescribe solutions.

---

## Critical (Blocks Gameplay / Causes Bugs)

### 1. Matter.js debug rendering enabled in production config
**File:** `client/src/main.ts:22`  
`debug: true` renders wireframes over all physics bodies. This makes the game visually broken for any player.

### 2. Ship collision only active when a player is at the rudder
**File:** `client/src/entities/Ship.ts:66-68`  
`setCollisionEnabled(false)` is called when exiting the rudder. This means the ship can freely clip through islands when nobody is steering. If a collision is in-progress when the player leaves the rudder, the ship may become permanently stuck inside geometry.

### 3. Cannonball direction ignores ship rotation
**File:** `client/src/entities/CannonballManager.ts:15-33`  
`fire()` spawns the ball at `shipX + direction * 80` and applies a purely horizontal velocity. The ship's current rotation angle is not considered — cannonballs always fire left/right in world-space regardless of where the ship faces.

### 4. Cannonball velocity is unreasonably high
**File:** `client/src/entities/CannonballManager.ts:31`  
`setVelocity(CANNONBALL_SPEED * 60 * direction, 0)` = velocity of 480. Matter.js velocity is per-step (60Hz), so this fires the ball at ~28,800 px/s — it crosses the entire map in ~2 frames.

### 5. No mobile input controls
**Files:** `client/src/main.ts:26-30`, `client/src/scenes/MainScene.ts`  
RexUI VirtualJoystick is registered as a global plugin but never instantiated. The game currently requires a keyboard (arrow keys, E, Space). The design doc states this is a "mobile-first" game for a game fair.

---

## Significant (Architecture / Networking)

### 6. Server trusts client-provided positions for ALL players during ship movement
**File:** `server/server.ts:99-103`  
When the rudder-controlling client emits `shipMove`, it sends `data.players` containing world positions for every connected player. The server blindly writes these positions. A malicious client can teleport other players.

### 7. Ship physics bypassed on remote (non-driver) clients
**File:** `client/src/network/NetworkManager.ts:62-66`  
On `shipMoved`, remote clients directly set `ship.sprite.x/y/rotation` and zero the velocity. This bypasses Matter.js's internal state, potentially causing physics desync — Matter still thinks the body is elsewhere.

### 8. Duplicate rotation sync logic
**Files:** `client/src/entities/PlayerManager.ts:130-141` and `client/src/network/NetworkManager.ts:70-79`  
The same cos/sin rotation offset algorithm for remote player positions is implemented in two separate places. These can diverge silently.

### 9. No server game loop (tick rate)
**File:** `server/server.ts`  
The server is purely event-driven. It processes messages as they arrive with no fixed-tick simulation. This means:
- No server-authoritative physics reconciliation
- Movement validation depends on message arrival timing
- No broadcast throttling — a fast client can flood the server

### 10. No reconnection/error handling in NetworkManager
**File:** `client/src/network/NetworkManager.ts`  
No handling for `disconnect`, `connect_error`, or `reconnect` events. If the connection drops, the game silently breaks with no feedback to the player.

### 11. Server TypeScript never type-checked
**File:** `server/package.json:9`  
The server runs via `node --experimental-strip-types` which strips types at runtime without checking them. There is no `tsc --noEmit` script or CI step — type errors in server code go undetected.

---

## Moderate (Code Quality / Correctness)

### 12. Extensive debug logging left in production code
**File:** `client/src/scenes/MainScene.ts:42-146`  
Over 15 `console.log`/`console.warn`/`console.error` calls with `[DEBUG]` and `[Collision]` prefixes from the Matter.js migration. These spam the browser console and hurt performance.

### 13. Unused shared constants
**File:** `shared/types.ts:47-51`  
`SHIP_ACCELERATION`, `SHIP_FRICTION`, `SHIP_ROTATION_ACCEL`, `SHIP_ROTATION_FRICTION`, `SHIP_DISPLAY_WIDTH`, `SHIP_DISPLAY_HEIGHT` are all exported but never imported by any file. They are vestiges of the pre-Matter arcade physics system.

### 14. Pervasive `as any` type casts
**Files:** `PlayerManager.ts:52-53,59,67,76,136,145,194`, `StationManager.ts:32,41`, `CannonballManager.ts:31-32,37`  
Remote player sprites use `(other as any).playerId`, station rects use `(rect as any).stationKey`. No proper type-safe data attachment pattern (e.g., Phaser Data component or a Map lookup).

### 15. Collision fallback makes entire layer solid
**File:** `client/src/scenes/MainScene.ts:100-101`  
If a tilemap layer has 0 tiles with `collides: true`, the code calls `setCollisionByExclusion([-1])` which marks every non-empty tile as collidable. For prop layers (`ilha1props` etc.), this likely makes decorative objects into solid walls.

### 16. `DECK_ZOOM` constant duplicated
**Files:** `client/src/config/gameConfig.ts:20` and `client/src/systems/StationManager.ts:97`  
`DECK_ZOOM` is `2.2` in gameConfig, but `getDeckCameraConfig()` hardcodes `zoom: 2.2` instead of importing the constant.

### 17. Player sprite assignment is fixed, not data-driven
**Files:** `client/src/entities/PlayerManager.ts:42,49`  
Local player always gets `player_1` texture; all remote players get `player_2`. The `color` field in `PlayerData` (from the rectangle prototype era) is generated on the server but never used. If 3+ players connect, they all share the same sprite.

### 18. Inconsistent delta-time usage
**Files:** `client/src/scenes/MainScene.ts:155`, `client/src/entities/Ship.ts:31-58`  
MainScene computes `dt = delta / 16.67` and passes it to `moveOnDeck()`, but `Ship.helmUpdate()` uses hardcoded force values (0.01, 0.0075) without receiving or using delta. Movement speed depends on framerate for the ship but not for players.

### 19. Non-null assertions on tileset loading
**File:** `client/src/scenes/MainScene.ts:51`  
`[waterTileset!, fogTileset!, shipTileset!]` — if any tileset image fails to load (network error, wrong path), this crashes the scene with no helpful error message.

---

## Minor / Housekeeping

### 20. Hardcoded server URL
**File:** `client/src/network/NetworkManager.ts:18`  
`io('http://localhost:3000')` — no environment variable, no Vite `import.meta.env` usage. Deploy requires code change.

### 21. Empty server stub directories
**Paths:** `server/data/`, `server/logic/`  
Placeholder directories created for planned architecture that was never implemented. They add noise to the project structure.

### 22. No "Tap to Start" screen
The AGENTS.md documents this as a requirement for mobile browser autoplay policy compliance. No audio is loaded yet, but when it is, the game will need a user-interaction gate — which currently doesn't exist.

### 23. No test infrastructure
Both `client/package.json` and `server/package.json` have no test framework. The client test script is literally `echo "Error: no test specified" && exit 1`.

### 24. `dist/` folder committed but gitignored
The `dist/` directory exists in the repo with a built `index.html` + assets, yet `.gitignore` lists `dist/`. This was likely committed before the gitignore rule was added and never cleaned up.

### 25. Matter.js `enableSleeping` not configured
**File:** `client/src/main.ts:17-24`  
Hundreds of static island tile bodies are created but never sleep. Enabling `enableSleeping: true` would reduce CPU load.

---

## Summary Table

| Severity | Count | Theme                          |
|----------|-------|--------------------------------|
| Critical | 5     | Visual, physics, mobile        |
| Significant | 6 | Networking, security, arch     |
| Moderate | 8     | Code quality, correctness      |
| Minor    | 6     | Config, housekeeping           |
| **Total**| **25**|                                |
