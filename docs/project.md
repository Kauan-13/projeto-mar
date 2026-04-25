# Project Manifest: "They Will Drown" (2D Multiplayer Phaser Game)

## 1. Project Overview & Constraints
* **Game Title**: They Will Drown.
* **Genre**: Top-down 2D co-op bullet-hell with 16-bit pixel art aesthetics.
* **Theme**: Pirates surviving in a chaotic ocean.
* **Timeline**: Hard constraint of < 4 weeks for a university project (overriding the 6-month timeline mentioned in the design document). 
* **Team**: 2 developers.
* **Core Philosophy**: Prioritize simplicity and velocity. Avoid over-engineering (no complex databases or full server-side physics engines).

## 2. Tech Stack & Architecture
* **Frontend**: Phaser 3 + Vite (TypeScript/ES6).
* **Backend**: Node.js + Express.
* **Networking**: Socket.io (WebSockets) for room management, broadcasting, and reconnections.
* **Level Design**: Tiled Map Editor. *Constraint: The server will not parse complex Tiled JSON files. Collision layers will be exported as lightweight 2D arrays for rapid server-side validation.*
* **Deployment**: Monorepo architecture where Express serves the Vite `dist` folder on a single port.

### Proposed Monorepo Structure
* `/client`: Vite root, Phaser scenes, dynamic camera logic, UI, and socket handlers.
* `/server`: Express server, Socket.io logic, 2D collision arrays, and wave/shop management.
* `/public`: Shared 16-bit assets, audio, and maps.

## 3. Core Gameplay Loop
Two players cooperate to pilot a single caravel ship and survive infinite waves of increasingly difficult enemies. 
* **Station-Based Control**: Players must physically coordinate and walk on the deck to control different aspects of the ship.
  * **Helm (Steering)**: Located at the back of the ship; controls forward, backward, and diagonal movement. *Dynamic Camera*: Zooms out to provide a wider view of the ocean.
  * **Cannons (Left/Right)**: Fires directional damage waves respecting the ship's current firing range. *Dynamic Camera*: Limits the player's vision strictly to the side of the active cannon.
* **Enemies & Hazards**: Enemy ships (chasers and shooters), natural hazards (whirlpools, lightning, tornadoes), and opposing winds that negatively affect ship velocity.
* **Progression (The Shop)**: After surviving a wave, a Pirate Haven shop appears. Players purchase upgrades using coins: hull health, sail speed/handling, ramming prow, new cannon positions, and special ammo (chain-shot to slow enemies, grapeshot for AoE).

## 4. Mobile Optimization (Target Platform)
The game must be highly accessible and fully playable on mobile web browsers during a game fair.
* **Screen Scaling**: Implement Phaser’s `ScaleManager` (e.g., `Phaser.Scale.FIT`) for responsive canvas resizing across different devices.
* **Inputs**: Integrate a community virtual joystick plugin (e.g., RexUI). Controls must dynamically adapt based on whether the player is walking on the deck or operating a station to keep learning curves smooth.
* **Audio**: Require a UI interaction (e.g., "Tap to Start") before initializing the Phaser audio context to comply with strict mobile browser autoplay blocks.

## 5. Multiplayer Synchronization Strategy
* **Sync Strategy**: Utilize a lower server tick-rate with client-side linear interpolation (lerp) to ensure smooth sprite rendering.
* **Movement & Anti-Cheat**: Clients are authoritative over their own movement. The server validates coordinates against the 2D collision array and executes a simple distance check. If the distance between ticks exceeds the `max_speed_per_tick`, the movement is rejected.

## 6. Scope Reduction Directives for Coding Agent
* **Procedural Generation**: The map is intended to generate procedural island obstacles. To meet the 4-week deadline, implement this via simplified, grid-based chunking rather than complex generation algorithms.
* **Assets**: Do not script complex drawing logic; utilize free assets and extend them. Implement the initial "walking skeleton" using basic geometric primitives before replacing them with sprites.