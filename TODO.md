# AGENTS.md Discrepancies — Fix List

Each item below corrects a stale/incorrect claim in `AGENTS.md` vs. the actual codebase.

---

## 1. `/shared` directory does not exist ✅
- [x] Created `shared/types.ts` with `PlayerData` and `PlayerMovementData` interfaces.
      Both client and server import from it.

## 2. Server is JavaScript (ESM), not TypeScript ✅
- [x] Converted `server/server.js` → `server/server.ts` with full types.
      Server now runs via `tsx` (installed as devDependency alongside `@types/node`).

## 3. Public assets are at `client/public/`, not root `/public/` ✅
- [x] AGENTS.md directory layout updated to show `client/public/assets/`.

## 4. RexUI Virtual Joystick is not installed ✅
- [x] Installed `phaser3-rex-plugins` in client.
      Registered `VirtualJoystickPlugin` as global plugin in `client/src/main.ts`.

## 5. No root workspace / monorepo config ✅
- [x] AGENTS.md revised. Removed "monorepo" language. Project is two independent packages
      sharing a `/shared` directory for code reuse.

## 6. Entities/ and network/ directories are empty stubs 🔵
- [ ] `client/src/entities/` and `client/src/network/` are empty. All logic is in `MainScene.ts`.
      Acceptable for current prototype stage. Fill when code naturally outgrows MainScene.

## 7. No `tsconfig.json` anywhere ✅
- [x] Created `tsconfig.base.json` (root), `client/tsconfig.json`, and `server/tsconfig.json`.

## 8. Start command and port info are not documented ✅
- [x] Added "How to Start" to AGENTS.md.

## 9. Companion design document not referenced ✅
- [x] Added reference to `docs/Game Design Document Template - Kauan e Kauê.md` in AGENTS.md.
