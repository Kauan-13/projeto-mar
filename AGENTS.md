# AGENTS.md: Coding Agent Master Instructions

**Project:** "They Will Drown" (2D Co-op Multiplayer Phaser Game)
**Agent Role:** Expert Full-Stack Game Developer
**Primary Directive:** Maximize development velocity and prioritize simplicity. You are building a prototype to be delivered in **less than 4 weeks**. Do not over-engineer. "Good enough and playable" is strictly preferred over "perfect but incomplete."

---

## 1. Project Constraints & Mindset
* **Deadlines Rule All:** Reject complex algorithms (e.g., BSP trees for procedural generation, custom physics engines) in favor of simple, grid-based, or randomized solutions.
* **Placeholder First:** When generating visual components, use primitive Phaser shapes (`Phaser.GameObjects.Rectangle`, `Circle`) mapped to distinct colors. Asset integration (sprites/audio) happens *only* in the final polish phase.
* **In-Memory State:** Do not configure databases (SQL/NoSQL). Game state, lobbies, and shop progression live entirely in Node.js memory. If the server restarts, state resets. This is acceptable.
* **Mobile-First Web:** The target platform is mobile web browsers. Every mechanic must be playable via touch.

## 2. Tech Stack & Directory Enforcement
You must strictly adhere to the following stack and monorepo structure:
* **Frontend:** Phaser 3 + Vite + TypeScript.
* **Backend:** Node.js + Express + Socket.io + TypeScript.
* **Shared:** Types, constants, and collision arrays shared between client/server.

**Directory Structure:**
```text
/
├── /client          # Vite root, Phaser config, Scenes, Entities, UI
├── /server          # Express server, Socket.io handlers, Game State Manager
├── /shared          # TypeScript interfaces (e.g., PlayerState, GameConfig)
└── /public          # Static assets (served by Express/Vite)
```

## 3. Architectural Directives

### A. Multiplayer Sync (The "Trust but Verify" Model)
* **Client-Side Prediction:** The client calculates movement immediately upon input and sends updates to the server. Do not wait for server acknowledgment to move the local player sprite.
* **Server Validation:** The server maintains a tick rate (e.g., 20-30 ticks/sec). It validates incoming client coordinates against:
  1. A lightweight 2D array (0s for water, 1s for obstacles/islands). **Do not parse Tiled JSON on the server.**
  2. A simple distance check (Delta `x/y` cannot exceed `max_speed_per_tick`).
* **Interpolation:** Other players' sprites must be smoothly interpolated (lerped) between server updates. 

### B. Core Mechanics Implementation
* **The Ship & Stations:** The ship is the central entity. Implement "Stations" (Helm, Left Cannon, Right Cannon) as interactive hitboxes on the ship deck.
* **Input Context Switching:** * *Default:* Virtual joystick controls player movement on the deck.
  * *Station Engaged:* Virtual joystick controls the *station* (e.g., steering the ship or aiming the cannon).
* **Dynamic Camera:** Use `Phaser.Cameras.Main`. 
  * *Deck:* High zoom, centered on player.
  * *Helm:* Zoom out drastically, centered on ship, offset forward to show upcoming obstacles.
  * *Cannons:* Pan heavily to the respective port/starboard side.

### C. Mobile-Specific Rules
* **Scaling:** Configure Phaser with `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`.
* **Controls:** Use the **RexUI Virtual Joystick Plugin**. Do not write custom touch-event joysticks.
* **Audio Context:** You must implement a distinct "Tap to Start" UI screen before calling `this.sound.add()`. Browsers will block audio if this user interaction is missing.

## 4. Development Sprints (Agent Execution Order)
When asked to implement features, align your work with these milestones. Do not jump to Milestone 3 before Milestone 1 is functional.

* **Milestone 1: The Walking Skeleton**
  * Express server serving Vite build.
  * Socket.io connection established.
  * Two colored squares (players) can move independently on a blank canvas.
  * Positions broadcasted and synced across clients.
* **Milestone 2: The Ship & Stations**
  * Implement the Ship as a moving platform.
  * Keep players relative to the ship's coordinates.
  * Implement interaction hitboxes for Helm and Cannons.
  * Hook up the dynamic camera transitions.
* **Milestone 3: Hazards & Enemies (The Loop)**
  * Implement wave logic on the server.
  * Spawn basic chaser enemies (rectangles that move toward the ship).
  * Implement Cannon firing logic (hitboxes/projectiles destroying enemies).
* **Milestone 4: Progression & Polish**
  * Implement the Pirate Haven (Shop UI) appearing between waves.
  * Replace rectangles with actual 16-bit sprites and tilesets.

## 5. Coding Standards for Agent Output
* **TypeScript:** Use strict typing for all Socket.io payloads (e.g., `interface PlayerMovedPayload { id: string; x: number; y: number }`).
* **Modular Code:** Do not dump everything into a single `Scene.ts`. Separate logic into `Player.ts`, `Ship.ts`, `NetworkManager.ts`, etc.
* **Comments:** Briefly comment the *why*, not the *how*, especially around network sync math (lerping/interpolation).
* **Ask for Clarification:** If a request requires complex math (like rotated bounding box collisions for the ship), ask the user if a simpler AABB (Axis-Aligned Bounding Box) or circular collision fallback is acceptable to save time.