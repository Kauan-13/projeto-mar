# AGENTS.md

**Project:** "They Will Drown" (2D Co-op Multiplayer Phaser Game)  
**How to Start:** `bash start.sh` (server `:3000`, Vite `:5173`). Client hardcodes Socket.io to `http://localhost:3000`.  
**Primary Rule:** Keep it simple. Avoid overengineering. "Good enough and playable" > "perfect but incomplete."

## Project Context
- Full design doc: `docs/Game Design Document Template - Kauan e Kauê.md`
- GitHub issues + milestones track current tasks: `gh issue list`
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
- Tracks ship position (`shipX`, `shipY`) and rotation (`shipAngle`). Ship movement includes angle delta validation.
- Receives player positions alongside `shipMove` to keep all clients in sync during rotation.
- No tick timer yet — event-driven via socket messages.
- Future: collision via 2D array (0=water, 1=obstacle). Never parse Tiled JSON on server.

### Client (`client/src/scenes/MainScene.ts`)
- Client-side prediction: move immediately, emit position to server.
- Other players currently snap to position (lerp/interpolation planned).
- Arrow keys work. RexUI Virtual Joystick plugin is **installed and registered** but not wired into MainScene yet.
- **Map:** Tiled finite map (80×80 tiles, 1280×1280px), loaded via `tilemapTiledJSON`. 10 layers (`mar`, `nevoa`, `ilha1`–`ilha4` + `ilhaXprops` each), 3 tilesets. Camera bounds set to map pixel dimensions. Ship-island collisions via Arcade Physics.
- **Ship:** `basic_ship.png` at scale 2, depth 5, at map center (640, 640). Tank controls (L/R rotates, U/D propels forward/backward at ½ speed). Movement has inertia — accelerates and coasts with friction. Station hitboxes (rudder, port cannon, starboard cannon) rotate with the ship via `cos/sin` offset math. Players are dragged alongside the ship during rotation (offset rotates). Ship angle synced via server.
- **Player sprites:** Spritesheets (48×128, 16×16 frames). 24-frame animations: 4 directions × 2 states (idle/walk) × 3 frames each. Animation key convention: `player{1|2}_{idle|walk}_{down|up|left|right}`. State and direction synced via server for remote players.

### RexUI Virtual Joystick
- Installed: `phaser3-rex-plugins` (npm dep in client).
- Registered in `client/src/main.ts` as global plugin with key `rexVirtualJoystick`.
- To create in a scene: `scene.plugins.get('rexVirtualJoystick').add(scene, config)`.

### Asset Organization
```
public/assets/
├── maps/         # Tiled .json exports (mapa.json)
│   └── Assets/   # Symlink → ../tilesets (so Tiled resolves tilesets in-editor)
├── tilesets/     # Tileset images used by maps (water, fog, ships, plants)
├── sprites/
│   ├── player/   # Player spritesheets (player_1.png, player_2.png)
│   ├── ship/     # basic_ship.png + Scallywag_Ships asset pack
│   ├── objects/  # Chest, etc.
│   └── environment/  # Wave, shore animations
├── audio/        # (empty)
└── unsorted/     # Source files (.aseprite), mockups — not loaded at runtime
```

### TypeScript
- `tsconfig.base.json` → `client/tsconfig.json` and `server/tsconfig.json`.
- Server runs via `node --experimental-strip-types` (no `tsc` build step).
- New shared interfaces → `shared/types.ts`.
- **Quirk:** Server value imports from `shared/` need `.ts` extension (`import { SHIP_X } from '../shared/types.ts'`). `import type` also uses `.ts`.

## Development Sprints (Do NOT jump ahead)

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Walking skeleton: squares move + sync via Socket.io | Done |
| 2 | Ship platform, stations (helm/cannons), camera transitions | In progress (map, ship, sprites, stations, tank controls done) |
| 3 | Waves, chaser enemies, cannon firing | Later |
| 4 | Shop/upgrades UI, sprite replacement | Later |

## Constraints & Conventions
- **Placeholders first:** Use `Phaser.GameObjects.Rectangle`/`Circle` with distinct colors for new entities (enemies, projectiles, etc.). Sprites only when the mechanic is proven or the asset already exists. (Player and ship already use sprites.)
- **No database:** All state in Node.js memory.
- **Mobile touch:** RexUI joystick only. No custom touch-event code.
- **Audio:** Must implement "Tap to Start" screen before any `sound.add()` call (browser autoplay policy).
- **Surgical edits:** Touch only what you must. Don't refactor adjacent code.
- **Prefer simple collisions:** AABB or circles over rotated bounding boxes.
- **Animation key convention:** `player{1|2}_{idle|walk}_{down|up|left|right}`. Spritesheets have 24 frames (4 dirs × 2 states × 3 frames each).
- **Ship rotation:** Station positions are computed via `cos/sin(angle) * offset`. Player offset rotates with the ship during turns — both local and remote players are dragged alongside.

## Documentation References

| Library / Tool | Docs URL |
|----------------|----------|
| Phaser 3 | https://docs.phaser.io (https://newdocs.phaser.io) |
| Vite | https://vitejs.dev |
| Socket.io | https://socket.io/docs/v4/ |
| Express 5 | https://expressjs.com/en/5x/api.html |
| RexUI Virtual Joystick | https://rexrainbow.github.io/phaser3-rex-notes/docs/site/virtualjoystick/ |
| tsx | https://tsx.hirok.io (repo: https://github.com/privatenumber/tsx) |
| Tiled Map Editor | https://doc.mapeditor.org/en/stable/ |
| TypeScript | https://www.typescriptlang.org/docs/ |
