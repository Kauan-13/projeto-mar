# AGENTS.md Discrepancies — Fix List

Each item below corrects a stale/incorrect claim in `AGENTS.md` vs. the actual codebase.

---

## 1. `/shared` directory does not exist ✅
- [x] Created `shared/types.ts` with `PlayerData` and `PlayerMovementData` interfaces.
      Both client and server import from it.
      AGENTS.md directory structure updated.

## 2. Server is JavaScript (ESM), not TypeScript ✅
- [x] Converted `server/server.js` → `server/server.ts` with full types.
      Server now runs via `tsx` (installed as devDependency alongside `@types/node`).
      AGENTS.md updated to reflect `tsx`-based stack.

## 3. Public assets are at `client/public/`, not root `/public/`
- [ ] AGENTS.md shows `/public` as a top-level directory for static assets.
      Reality: assets live at `client/public/assets/` (empty audio/, enemies/ dirs, ship sprites,
      player sprites, map files). Vite `publicDir` is `'../public'` relative to `client/src/`.

## 4. RexUI Virtual Joystick is not installed
- [ ] AGENTS.md says "Use the RexUI Virtual Joystick Plugin. Do not write custom touch-event joysticks."
      The plugin is NOT listed in `client/package.json` dependencies. It must be installed
      before Milestone 2 (ship/stations) begins.

## 5. No root workspace / monorepo config
- [ ] AGENTS.md describes a monorepo, but there is no root `package.json`, no npm workspaces,
      no shared config. `client/` and `server/` are independent packages started via `start.sh`.

## 6. Entities/ and network/ directories are empty stubs
- [ ] `client/src/entities/` and `client/src/network/` exist but contain no files.
      AGENTS.md says to separate logic into `Player.ts`, `Ship.ts`, `NetworkManager.ts` —
      all logic is currently in a single `MainScene.ts` (acceptable for prototype stage).

## 7. No `tsconfig.json` anywhere ✅
- [x] Created `tsconfig.base.json` (root), `client/tsconfig.json`, and `server/tsconfig.json`.
      Strict mode, bundler resolution, proper includes for shared types.

## 8. Start command and port info are not documented ✅
- [x] Added "How to Start" line to AGENTS.md header: `bash start.sh` (server `:3000`, Vite `:5173`).
      Noted client hardcodes `http://localhost:3000`.

## 9. Companion design document not referenced ✅
- [x] Added "Design Doc" reference to `docs/project.md` in AGENTS.md header.

## 10. Karpathy guidelines skill exists but is not referenced
- [ ] `docs/skills/karpathy-guidelines/SKILL.md` defines a project skill for reducing LLM mistakes.
      Mention it in AGENTS.md so agents know it exists and when to load it.
