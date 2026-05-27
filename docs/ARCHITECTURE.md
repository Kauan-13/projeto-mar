# Architecture Report: "They Will Drown"

> Generated: 2026-05-25. Based on commit `1e19c51` (HEAD of `phaser-main`).

## 1. High-Level Overview

A 2D cooperative multiplayer pirate game built with Phaser 3 (client) and Node.js + Socket.io (server). Two players share a ship, walking between stations (helm, cannons) to control it cooperatively. The project is a university prototype with a < 4-week deadline.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Monorepo Root                            │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│  client/    │  server/    │  shared/    │  docs/                │
│  (Phaser 3  │  (Express + │  (types.ts) │  (Design docs)        │
│   + Vite)   │  Socket.io) │             │                       │
└─────────────┴─────────────┴─────────────┴───────────────────────┘
```

## 2. Tech Stack (Actual)

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Client    | Phaser 3.80 + Vite 5 + TypeScript + RexUI       |
| Server    | Express 5 + Socket.io 4.8 + Node (strip-types)  |
| Physics   | Matter.js (Phaser integration) — client-only     |
| Shared    | `shared/types.ts` (interfaces + constants)       |
| Maps      | Tiled JSON (80x80 tile map, 16px tiles)          |

## 3. Directory Structure (Actual)

```
/
├── AGENTS.md                  # AI agent instructions
├── TASKS.md                   # Manual task tracking (partially outdated)
├── start.sh                   # Starts server + Vite dev in parallel
├── tsconfig.base.json         # Shared TS config (strict, ESNext, bundler)
├── shared/
│   └── types.ts               # PlayerData, ShipMoveData, constants
├── server/
│   ├── server.ts              # Single-file server (Express + Socket.io)
│   ├── package.json           # express, socket.io, tsx (dev)
│   ├── tsconfig.json          # extends base, allowImportingTsExtensions
│   ├── data/                  # EMPTY stub directory
│   └── logic/                 # EMPTY stub directory
├── client/
│   ├── package.json           # phaser, phaser3-rex-plugins, socket.io-client
│   ├── vite.config.js         # root=src, publicDir=../public
│   ├── tsconfig.json          # extends base
│   ├── src/
│   │   ├── index.html         # Entry point HTML (mobile viewport)
│   │   ├── main.ts            # Phaser GameConfig + Matter.js physics
│   │   ├── config/
│   │   │   └── gameConfig.ts  # Station definitions, zoom, speeds
│   │   ├── scenes/
│   │   │   └── MainScene.ts   # Main game scene (orchestrator)
│   │   ├── entities/
│   │   │   ├── Ship.ts        # Matter.js sprite, helm controls
│   │   │   ├── PlayerManager.ts   # Local + remote player management
│   │   │   └── CannonballManager.ts  # Cannonball firing + lifetime
│   │   ├── systems/
│   │   │   └── StationManager.ts  # Station hitboxes, proximity, camera
│   │   └── network/
│   │       └── NetworkManager.ts  # Socket.io client + event handlers
│   └── public/
│       └── assets/            # Maps, tilesets, sprites, ship
├── dist/                      # Vite build output (gitignored)
└── docs/                      # GDD, project manifest, phaser notes
```

## 4. How It Runs

`bash start.sh` launches two processes:
1. **Server**: `node --experimental-strip-types server/server.ts` on port 3000
2. **Client**: `vite` dev server (root: `client/src`) on port 5173

The client hardcodes Socket.io connection to `http://localhost:3000`.

## 5. Server Architecture (`server/server.ts` — 132 lines)

The entire server is a single file. No game loop, no tick rate — purely event-driven via Socket.io messages.

### State
- `players: Record<string, PlayerData>` — in-memory player registry
- `shipX`, `shipY`, `shipAngle` — single shared ship state (scalars)

### Socket Events Handled

| Event               | Purpose                                          |
|---------------------|--------------------------------------------------|
| `connection`        | Create PlayerData, emit `currentPlayers` + `shipMoved` |
| `playerMovement`    | Validate distance, broadcast `playerMoved` or `forcePosition` |
| `playerStationChange` | Store station, broadcast `playerStationChanged` |
| `shipMove`          | Validate position+angle delta, update ship + all player positions, broadcast `shipMoved` + `playersMoved` |
| `disconnect`        | Delete player, emit `playerLeft`                  |

### Validation
- Player movement: `distanceSq <= (SHIP_SPEED + GAME_SPEED*2)^2`
- Ship movement: `distanceSq <= (SHIP_SPEED*2)^2` AND `|angleDelta| <= SHIP_ROTATION_SPEED*2`

## 6. Client Architecture

### Entry Point (`main.ts`)
- Configures Phaser with `Matter.js` physics (gravity: 0, debug: true)
- Registers `rexVirtualJoystick` as global plugin (unused in gameplay)
- Single scene: `MainScene`

### MainScene (Orchestrator — 261 lines)
The scene ties together all subsystems:
- **preload()**: Loads tilemap, tilesets, spritesheets, ship texture
- **create()**: Builds tilemap layers, creates Ship (Matter body), sets up island collision (Matter static bodies), instantiates PlayerManager, StationManager, CannonballManager, NetworkManager
- **update()**: Detects ship movement delta, syncs stations/players, delegates to `handleStationOperation()` or `handleDeckMovement()`

### Ship Entity (`entities/Ship.ts` — 69 lines)
- Matter.js sprite at map center (640, 640), scale 2, depth 5
- Rectangle collision body (46x105), mass 1, air friction 0.05
- Collision disabled by default (mask: 0x0000), enabled only when player is at rudder
- `helmUpdate()`: applies force in ship's forward direction, sets angular velocity, caps max speed
- `stopMovement()`: zeroes velocity/angular when leaving rudder

### PlayerManager (`entities/PlayerManager.ts` — 235 lines)
- Manages local player sprite + group of remote player sprites
- Uses **ship-local coordinate system**: stores `offsetX`/`offsetY` relative to ship center, converts to world coords via rotation math
- `moveOnDeck()`: Moves in world-axis directions, converts to local offset, clamps within deck bounds
- `syncToShip()`: When ship moves/rotates, recalculates world positions for local and remote players
- `createAnimations()`: 24-frame animations per player (4 directions x 2 states x 3 frames)
- Remote players: snap to position (no interpolation)

### StationManager (`systems/StationManager.ts` — 99 lines)
- Creates colored rectangles as visual station hitboxes
- `updatePositions()`: Rotates station positions with ship via cos/sin
- `highlightProximity()`: Changes alpha based on distance to player
- `findNearest()`: Returns closest station within `STATION_PROXIMITY_RANGE` (20px)
- `getCameraConfig()`: Returns zoom level and follow target per station

### CannonballManager (`entities/CannonballManager.ts` — 44 lines)
- Fires a circle (radius 4, orange) at fixed horizontal direction
- Matter body with no collision mask (passes through everything)
- Lifetime-based destruction (CANNONBALL_LIFE = 50 frames)

### NetworkManager (`network/NetworkManager.ts` — 126 lines)
- Connects to `http://localhost:3000` via socket.io-client
- Handles: `currentPlayers`, `playerJoined`, `playerLeft`, `playerMoved`, `forcePosition`, `shipMoved`, `playersMoved`, `playerStationChanged`
- On `shipMoved` (remote): directly sets ship sprite position/rotation (bypassing physics), recalculates player positions
- Emits: `playerMovement`, `playerStationChange`, `shipMove`

## 7. Physics System

The project migrated from **Arcade Physics** to **Matter.js** (commits `49ec24a`–`6c608e3`, May 21-22).

Current state:
- Ship uses Matter.js body for proper rotated collision with islands
- Islands are converted from Tiled tilemap layers to Matter static bodies
- Ship collision is toggled: disabled when walking on deck, enabled when at rudder
- Cannonballs use Matter bodies but with mask 0x0000 (no actual collisions)
- Players have NO physics bodies — they are plain sprites positioned via math

### Collision Categories
| Category | Value  | Used By        |
|----------|--------|----------------|
| SHIP     | 0x0001 | Ship body      |
| ISLAND   | 0x0002 | Tilemap bodies |
| CANNONBALL | 0x0004 | Cannonballs  |

## 8. Network Synchronization Model

- **Client-authoritative movement**: Local player moves immediately, emits position to server
- **Server validates**: Simple distance check, rejects if too far
- **Ship movement**: Only the player at the rudder station drives the ship. They emit `shipMove` with ship position + all player world positions. Server broadcasts to all.
- **Remote rendering**: Snap-to-position (no interpolation/lerp)
- **No server tick loop**: All updates are event-driven responses to client messages

## 9. Git History Summary (38 commits, Apr 24 – May 22, 2026)

### Phase 1: Foundation (Apr 24 – Apr 30)
- Initial commit, TypeScript refactoring, asset reorganization

### Phase 2: Map & Sprites (May 5 – May 7)
- Finite Tiled map (80x80), ship spawn, player spritesheets, camera

### Phase 3: Features (May 13 – May 15)
- Antialiasing fix (pixelArt: true)
- Ship stations (rudder, cannons) with camera zoom
- Player-ship boundary collision (offset + clamp)
- Ship-island collision (Arcade Physics at this point)
- Player animations (spritesheet 24 frames)
- Tank controls with inertia
- Delta-time movement

### Phase 4: Physics Migration & Refactor (May 20 – May 22)
- Ship-to-island collision via Tiled `collides` property
- Refactor: decoupled monolithic MainScene into 6 modules
- Migration from Arcade Physics to Matter.js
- Multiple iterative fixes for Matter integration
- Final: ship-local coordinate system for deck boundary

## 10. Shared Constants (`shared/types.ts`)

| Constant              | Value | Notes                    |
|-----------------------|-------|--------------------------|
| SHIP_X / SHIP_Y      | 640   | Map center spawn         |
| SHIP_DISPLAY_WIDTH    | 138   | Ship sprite display size |
| SHIP_DISPLAY_HEIGHT   | 384   | Ship sprite display size |
| PLAYER_SPEED          | 2     | px/frame on deck         |
| SHIP_SPEED            | 4     | Max ship speed           |
| SHIP_ACCELERATION     | 0.08  | (unused in current code) |
| SHIP_FRICTION         | 0.02  | (unused in current code) |
| SHIP_ROTATION_SPEED   | 0.7   | rad/s angular velocity   |
| SHIP_ROTATION_ACCEL   | 0.2   | (unused in current code) |
| SHIP_ROTATION_FRICTION| 0.001 | (unused in current code) |

## 11. What's NOT Implemented Yet

Per the GDD and AGENTS.md, these are planned but not present in code:
- Enemy system (wave spawning, AI chase/shoot)
- Health/damage system
- Shop/upgrade UI between waves
- Virtual joystick (mobile controls) — registered but not wired
- "Tap to Start" screen (required for mobile audio)
- Audio of any kind
- Interpolation/lerp for remote players
- Server tick loop
- Procedural island generation (map is static Tiled export)
- Wind mechanics
- Multiple rooms/lobbies
