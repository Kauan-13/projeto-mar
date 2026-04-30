# AGENTS.md

**Project:** "They Will Drown" (2D Co-op Multiplayer Phaser Game)  
**How to Start:** `bash start.sh` (server `:3000`, Vite `:5173`). Client hardcodes Socket.io to `http://localhost:3000`.  
**Primary Rule:** Keep it simple. Avoid overengineering. "Good enough and playable" > "perfect but incomplete."

## Project Context
- Full design doc: `docs/Game Design Document Template - Kauan e Kauê.md`
- Two pirates cooperatively pilot a ship with stations (helm, cannons), survive waves of enemies.
- Mobile-first web (touch controls, `Phaser.Scale.FIT`).
- Prototype deadline: < 4 weeks.

## Tech Stack

| Layer  | Stack |
|--------|-------|
| Client | Phaser 3 + Vite + TypeScript + RexUI plugins |
| Server | Node.js + Express + Socket.io + TypeScript (via `tsx`, no build) |
| Shared | `shared/types.ts` — interfaces used by both client and server |

## Directory Layout
```
/
├── client/src/         # Phaser scenes, entities, network (Vite root=src)
│   └── public/assets/  # Sprites, audio, maps
├── server/             # Express + Socket.io game server (data/ and logic/ are stubs)
├── shared/types.ts     # PlayerData, PlayerMovementData, etc.
├── docs/               # Game design document
├── tsconfig.base.json  # Shared TS config (strict, ESNext, bundler)
├── client/tsconfig.json
└── server/tsconfig.json
```

## How Things Work

### Server (`server/server.ts`)
- In-memory state only (`Record<string, PlayerData>`). Restart = state gone. Acceptable.
- Movement validation: distance check per message. If delta exceeds `(GAME_SPEED * 2)^2`, server rejects and forces client back.
- No tick timer yet — event-driven via socket messages.
- Future: collision via 2D array (0=water, 1=obstacle). Never parse Tiled JSON on server.

### Client (`client/src/scenes/MainScene.ts`)
- Client-side prediction: move immediately, emit position to server.
- Other players currently snap to position (lerp/interpolation planned).
- Arrow keys work. RexUI Virtual Joystick plugin is **installed and registered** but not wired into MainScene yet.

### RexUI Virtual Joystick
- Installed: `phaser3-rex-plugins` (npm dep in client).
- Registered in `client/src/main.ts` as global plugin with key `rexVirtualJoystick`.
- To create in a scene: `scene.plugins.get('rexVirtualJoystick').add(scene, config)`.

### TypeScript
- `tsconfig.base.json` → `client/tsconfig.json` and `server/tsconfig.json`.
- Server runs via `tsx server.ts`, no `tsc` build step.
- New shared interfaces → `shared/types.ts`.

## Development Sprints (Do NOT jump ahead)

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Walking skeleton: squares move + sync via Socket.io | Done |
| 2 | Ship platform, stations (helm/cannons), camera transitions | Next |
| 3 | Waves, chaser enemies, cannon firing | Later |
| 4 | Shop/upgrades UI, sprite replacement | Later |

## Constraints & Conventions
- **Placeholders first:** Use `Phaser.GameObjects.Rectangle`/`Circle` with distinct colors. Sprites only in final polish.
- **No database:** All state in Node.js memory.
- **Mobile touch:** RexUI joystick only. No custom touch-event code.
- **Audio:** Must implement "Tap to Start" screen before any `sound.add()` call (browser autoplay policy).
- **Surgical edits:** Touch only what you must. Don't refactor adjacent code.
- **Prefer simple collisions:** AABB or circles over rotated bounding boxes.
