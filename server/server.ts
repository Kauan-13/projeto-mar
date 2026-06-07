import express from 'express';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import type { PlayerData, PlayerMovementData, Station, StationChangeData, ShipMoveData, EnemyData } from '../shared/types.ts';
import { SHIP_X, SHIP_Y, PLAYER_SPEED, SHIP_SPEED, SHIP_ROTATION_SPEED, SHIP_MAX_HP, ENEMY_DAMAGE, MAX_ENEMIES, ENEMY_SPAWN_INTERVAL_MS, ENEMY_SPAWN_MARGIN, MAP_WIDTH, MAP_HEIGHT, ENEMY_SERVER_SPEED, ENEMY_HIT_DISTANCE } from '../shared/types.ts';

const DEBUG = false;

const app = express();
const httpServer = createServer(app);

// Allow CORS for development with Vite
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory game state
const players: Record<string, PlayerData> = {};
let shipX = SHIP_X;
let shipY = SHIP_Y;
let shipAngle = 0;
let shipHp = SHIP_MAX_HP;
const enemies: Record<string, EnemyData> = {};
let enemyIdCounter = 0;
const GAME_SPEED = PLAYER_SPEED;

io.on('connection', (socket: Socket) => {
  if (DEBUG) console.log(`[Server] connection: Player connected ${socket.id}`);

  if (shipHp <= 0) {
    if (DEBUG) console.log('[Server] connection: Game over state detected, resetting...');
    shipHp = SHIP_MAX_HP;
    shipX = SHIP_X;
    shipY = SHIP_Y;
    shipAngle = 0;
    for (const id in enemies) delete enemies[id];
    enemyIdCounter = 0;
  }

  // Create new player on the ship deck
  const newPlayer: PlayerData = {
    id: socket.id,
    x: shipX,
    y: shipY,
    color: Math.floor(Math.random() * 16777215),
    station: null,
    state: 'idle',
    direction: 'down'
  };
  players[socket.id] = newPlayer;

  // Send current ship position
  socket.emit('shipMoved', { x: shipX, y: shipY, dx: 0, dy: 0, angle: shipAngle });

  // Send current players to the new player
  socket.emit('currentPlayers', players);

  // Send enemy state and HP to the new player
  socket.emit('enemyState', { enemies: Object.values(enemies), shipHpPct: (shipHp / SHIP_MAX_HP) * 100 });

  // Broadcast to all other players that a new player has joined
  socket.broadcast.emit('playerJoined', newPlayer);

  if (DEBUG) console.log(`[Server] connection: ${socket.id} created, ${Object.keys(players).length} players, ${Object.keys(enemies).length} enemies`);

  // Handle player movement
  socket.on('playerMovement', (movementData: PlayerMovementData) => {
    const player = players[socket.id];
    if (player) {
      // Trust but verify: simple distance check
      const dx = movementData.x - player.x;
      const dy = movementData.y - player.y;
      const distanceSq = dx * dx + dy * dy;

      // Allow a reasonable max distance per tick (GAME_SPEED + leniency)
      const maxDist = (SHIP_SPEED + GAME_SPEED * 2) * (SHIP_SPEED + GAME_SPEED * 2);

      if (distanceSq <= maxDist) {
        player.x = movementData.x;
        player.y = movementData.y;
        if (movementData.state) player.state = movementData.state;
        if (movementData.direction) player.direction = movementData.direction;
        // Broadcast the updated position to other players
        socket.broadcast.emit('playerMoved', player);
      } else {
        if (DEBUG) console.log('[Server] playerMovement: REJECTED for', socket.id, 'dist^2', distanceSq.toFixed(0), 'max', maxDist);
        // If movement is invalid, force client back to server position
        socket.emit('forcePosition', player);
      }
    }
  });

  // Handle station enter/exit
  socket.on('playerStationChange', (data: StationChangeData) => {
    const player = players[socket.id];
    if (player) {
      player.station = data.station;
      io.emit('playerStationChanged', { id: socket.id, station: data.station });
      if (DEBUG) console.log('[Server] playerStationChange:', socket.id, '->', data.station);
    }
  });

  // Handle ship movement (rudder)
  socket.on('shipMove', (data: ShipMoveData) => {
    const dx = data.x - shipX;
    const dy = data.y - shipY;
    const rawAngleDelta = data.angle - shipAngle;
    const angleDelta = ((rawAngleDelta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const distanceSq = dx * dx + dy * dy;
    const maxDist = (SHIP_SPEED * 2) * (SHIP_SPEED * 2);
    const maxAngle = SHIP_ROTATION_SPEED * 2;

    if (distanceSq <= maxDist && Math.abs(angleDelta) <= maxAngle) {
      if (DEBUG) console.log('[Server] shipMove: ACCEPTED dx', dx.toFixed(1), 'dy', dy.toFixed(1), 'angleDelta', angleDelta.toFixed(3));
      shipX = data.x;
      shipY = data.y;
      shipAngle = data.angle;

      // Helm player position from client (accounts for station rotation offset).
      // Non-helm players: translate by ship movement delta — their exact
      // positions are maintained by their own playerMovement events.
      if (data.players && data.players[socket.id] && players[socket.id]) {
        players[socket.id].x = data.players[socket.id].x;
        players[socket.id].y = data.players[socket.id].y;
        Object.keys(players).forEach(id => {
          if (id !== socket.id) {
            players[id].x += dx;
            players[id].y += dy;
          }
        });
      } else {
        // Fallback: just move by propulsion delta
        Object.keys(players).forEach(id => {
          players[id].x += dx;
          players[id].y += dy;
        });
      }

      // Broadcast ship position and angle
      io.emit('shipMoved', { x: shipX, y: shipY, dx, dy, angle: shipAngle });

      // Broadcast all player positions so remote clients stay in sync
      io.emit('playersMoved', players);
    } else {
      if (DEBUG) console.log('[Server] shipMove: REJECTED dist^2', distanceSq.toFixed(0), 'max', maxDist, 'angle', Math.abs(angleDelta).toFixed(3), 'max', maxAngle);
      socket.emit('forceShipPosition', { x: shipX, y: shipY, angle: shipAngle });
    }
  });

  socket.on('disconnect', () => {
    if (DEBUG) console.log(`[Server] disconnect: Player ${socket.id} disconnected, ${Object.keys(players).length - 1} remaining`);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });

  socket.on('returnToMenu', () => {
    if (DEBUG) console.log('[Server] returnToMenu: resetting game state');
    shipHp = SHIP_MAX_HP;
    shipX = SHIP_X;
    shipY = SHIP_Y;
    shipAngle = 0;
    for (const id in enemies) delete enemies[id];
    enemyIdCounter = 0;
    for (const id in players) delete players[id];
    io.emit('returnToMenu');
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[Server] listening on port ${PORT}`);
});

setInterval(() => {
  if (Object.keys(players).length === 0 || Object.keys(enemies).length >= MAX_ENEMIES || shipHp <= 0) return;
  const side = Math.floor(Math.random() * 4);
  let x: number;
  let y: number;
  const M = ENEMY_SPAWN_MARGIN;
  const W = MAP_WIDTH;
  const H = MAP_HEIGHT;
  switch (side) {
    case 0: x = Math.random() * W; y = -M; break;
    case 1: x = W + M; y = Math.random() * H; break;
    case 2: x = Math.random() * W; y = H + M; break;
    default: x = -M; y = Math.random() * H; break;
  }
  const enemy: EnemyData = { id: `e${++enemyIdCounter}`, x, y };
  enemies[enemy.id] = enemy;
  io.emit('enemySpawned', enemy);
  if (DEBUG) console.log('[Server] enemy spawn:', enemy.id, 'at', x.toFixed(0), y.toFixed(0), 'total', Object.keys(enemies).length);
}, ENEMY_SPAWN_INTERVAL_MS);

setInterval(() => {
  if (shipHp <= 0) return;
  const idsToRemove: string[] = [];
  for (const id in enemies) {
    const e = enemies[id];
    const dx = shipX - e.x;
    const dy = shipY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ENEMY_HIT_DISTANCE) {
      idsToRemove.push(id);
    } else {
      e.x += (dx / dist) * ENEMY_SERVER_SPEED;
      e.y += (dy / dist) * ENEMY_SERVER_SPEED;
    }
  }
  for (const id of idsToRemove) {
    delete enemies[id];
    io.emit('enemyDestroyed', { id });
    shipHp = Math.max(0, shipHp - ENEMY_DAMAGE);
    io.emit('shipDamaged', { hp: shipHp, hpPct: (shipHp / SHIP_MAX_HP) * 100 });
    if (DEBUG) console.log('[Server] enemy hit:', id, 'destroyed, ship HP', shipHp, '/', SHIP_MAX_HP);
    if (shipHp <= 0) {
      io.emit('gameOver');
      if (DEBUG) console.log('[Server] gameOver triggered');
      break;
    }
  }
  io.emit('enemiesMoved', { enemies: Object.values(enemies) });
}, 50);
