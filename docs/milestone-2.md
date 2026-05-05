# Milestone 2 — Ship, Stations & Dynamic Camera

## 1. Load Tiled Map into Phaser ✅

**Goal:** The Tiled map renders in the game behind the player squares.

- [x] Add `preload()` to `MainScene.ts` — loads `mapa.json` + 3 tileset PNGs
- [x] Build tilemap in `create()` — 5 layers, 3 tilesets, depth 0
- [x] Player depth 10, camera bounds `setBounds(0, 0, map.widthInPixels, map.heightInPixels)`
- [x] `addPlayer()` now calls `centerOn(x, y)` + `startFollow(player)` — camera snaps to spawn
- [x] Map is finite (80×80 tiles, 1280×1280px). Infinite maps deferred.
- [x] Removed circular symlink `maps/Assets/Assets` created by Tiled export

**Verify:** Run `bash start.sh`. Full ocean map renders. Camera immediately snaps to the local player on spawn and follows them around the map.

**Verify:** Run `bash start.sh`. The ocean map renders as background. Player squares move on top of it. Camera follows the local player.

---

## 2. Ship Platform (next step)

- [ ] Create Ship class — rectangle/circle on the map representing the caravel
- [ ] Ship moves with arrow keys when player is at helm station
- [ ] Player position becomes relative to ship coordinates

## 3. Station Hitboxes (next step)

- [ ] Helm, Left Cannon, Right Cannon as interactive areas on the ship deck
- [ ] Walking near a station shows a prompt / highlights it

## 4. Dynamic Camera Transitions (next step)

- [ ] Deck mode: centered on player, high zoom
- [ ] Helm mode: zoomed out, centered on ship, offset forward
- [ ] Cannon mode: panned to port/starboard side
