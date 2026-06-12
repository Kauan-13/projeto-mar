import express from 'express';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import type { PlayerData, PlayerMovementData, Station, StationChangeData, ShipMoveData, EnemyData, LobbyState } from '../shared/types.ts';
import { SHIP_X, SHIP_Y, PLAYER_SPEED, SHIP_SPEED, SHIP_ROTATION_SPEED, SHIP_MAX_HP, ENEMY_DAMAGE, MAX_ENEMIES, ENEMY_SPAWN_INTERVAL_MS, ENEMY_SPAWN_MARGIN, MAP_WIDTH, MAP_HEIGHT, ENEMY_SERVER_SPEED, ENEMY_HIT_DISTANCE, ENEMY_HP, CANNON_DAMAGE, MAX_PLAYERS_PER_LOBBY, LOBBY_CODE_LENGTH, ENEMY_SCORE, MAX_SCORE } from '../shared/types.ts';

const DEBUG = true;

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

interface LobbyData {
  code: string;
  hostId: string;
  status: 'waiting' | 'playing';
  players: Record<string, PlayerData>;
  shipX: number;
  shipY: number;
  shipAngle: number;
  shipHp: number;
  score: number;
  enemies: Record<string, EnemyData>;
  enemyIdCounter: number;
}

const lobbies: Record<string, LobbyData> = {};

function generateLobbyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  do {
    code = '';
    for (let i = 0; i < LOBBY_CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (lobbies[code]);
  return code;
}

function createPlayer(socketId: string, x: number, y: number): PlayerData {
  return {
    id: socketId,
    x, y,
    color: Math.floor(Math.random() * 16777215),
    station: null,
    state: 'idle',
    direction: 'down',
  };
}

function emitToLobby(lobbyCode: string, event: string, data: any) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;
  for (const id in lobby.players) {
    const sock = io.sockets.sockets.get(id);
    if (sock) sock.emit(event, data);
  }
}

function broadcastToLobby(lobbyCode: string, excludeId: string, event: string, data: any) {
  const lobby = lobbies[lobbyCode];
  if (!lobby) return;
  for (const id in lobby.players) {
    if (id === excludeId) continue;
    const sock = io.sockets.sockets.get(id);
    if (sock) sock.emit(event, data);
  }
}

function lobbyFromSocket(socket: Socket): LobbyData | undefined {
  return lobbies[socket.data.lobbyCode as string];
}

io.on('connection', (socket: Socket) => {
  if (DEBUG) console.log(`[Server] connection: ${socket.id}`);

  socket.emit('lobbyHint', { code: generateLobbyCode() });

  socket.on('joinLobby', (data: { code: string }) => {
    const code = data.code.toUpperCase().slice(0, LOBBY_CODE_LENGTH);
    if (lobbies[code]) {
      const lobby = lobbies[code];
      if (lobby.status !== 'waiting') {
        socket.emit('lobbyError', { message: 'Jogo em andamento.' });
        return;
      }
      if (Object.keys(lobby.players).length >= MAX_PLAYERS_PER_LOBBY) {
        socket.emit('lobbyError', { message: 'Lobby cheia.' });
        return;
      }
      const player = createPlayer(socket.id, lobby.shipX, lobby.shipY);
      lobby.players[socket.id] = player;
      socket.data.lobbyCode = code;
      const state: LobbyState = { code, players: lobby.players, hostId: lobby.hostId };
      socket.emit('lobbyState', state);
      broadcastToLobby(code, socket.id, 'lobbyUpdate', { players: lobby.players, hostId: lobby.hostId });
      if (DEBUG) console.log(`[Server] joinLobby: ${socket.id} joined ${code}, ${Object.keys(lobby.players).length} players`);
    } else {
      const lobby: LobbyData = {
        code, hostId: socket.id, status: 'waiting',
        players: {},
        shipX: SHIP_X, shipY: SHIP_Y, shipAngle: 0,
        shipHp: SHIP_MAX_HP,
        score: 0,
        enemies: {}, enemyIdCounter: 0,
      };
      const player = createPlayer(socket.id, lobby.shipX, lobby.shipY);
      lobby.players[socket.id] = player;
      lobbies[code] = lobby;
      socket.data.lobbyCode = code;
      socket.emit('lobbyState', { code, players: lobby.players, hostId: socket.id });
      if (DEBUG) console.log(`[Server] joinLobby: ${socket.id} created lobby ${code}`);
    }
  });

  socket.on('leaveLobby', () => {
    const lobby = lobbyFromSocket(socket);
    if (!lobby) return;
    delete lobby.players[socket.id];
    if (lobby.hostId === socket.id) {
      const remaining = Object.keys(lobby.players);
      if (remaining.length > 0) {
        lobby.hostId = remaining[0];
        emitToLobby(lobby.code, 'lobbyUpdate', { players: lobby.players, hostId: lobby.hostId });
      } else {
        delete lobbies[lobby.code];
      }
    } else {
      emitToLobby(lobby.code, 'lobbyUpdate', { players: lobby.players, hostId: lobby.hostId });
    }
    socket.data.lobbyCode = undefined;
    if (DEBUG) console.log(`[Server] leaveLobby: ${socket.id} left`);
  });

  socket.on('startGame', () => {
    const lobby = lobbyFromSocket(socket);
    if (DEBUG) console.log('[Server] startGame: lobby=', lobby?.code, 'hostId=', lobby?.hostId, 'socket.id=', socket.id, 'status=', lobby?.status);
    if (!lobby) {
      if (DEBUG) console.log('[Server] startGame: FAILED no lobby');
      return;
    }
    if (lobby.hostId !== socket.id) {
      if (DEBUG) console.log('[Server] startGame: FAILED not host:', lobby.hostId, '!=', socket.id);
      return;
    }
    if (lobby.status !== 'waiting') {
      if (DEBUG) console.log('[Server] startGame: FAILED status', lobby.status);
      return;
    }
    lobby.status = 'playing';
    const state = {
      players: lobby.players,
      shipX: lobby.shipX, shipY: lobby.shipY, shipAngle: lobby.shipAngle,
      hpPct: (lobby.shipHp / SHIP_MAX_HP) * 100,
      score: lobby.score,
    };
    emitToLobby(lobby.code, 'gameStarted', state);
    if (DEBUG) console.log(`[Server] startGame: ${lobby.code} started with ${Object.keys(lobby.players).length} players`);
  });

  socket.on('playerMovement', (movementData: PlayerMovementData) => {
    const lobby = lobbyFromSocket(socket);
    if (!lobby) return;
    const player = lobby.players[socket.id];
    if (!player) return;
    const dx = movementData.x - player.x;
    const dy = movementData.y - player.y;
    const distanceSq = dx * dx + dy * dy;
    const maxDist = (SHIP_SPEED + PLAYER_SPEED * 2) * (SHIP_SPEED + PLAYER_SPEED * 2);
    if (distanceSq <= maxDist) {
      player.x = movementData.x;
      player.y = movementData.y;
      if (movementData.state) player.state = movementData.state;
      if (movementData.direction) player.direction = movementData.direction;
      broadcastToLobby(lobby.code, socket.id, 'playerMoved', player);
    } else {
      socket.emit('forcePosition', player);
    }
  });

  socket.on('playerStationChange', (data: StationChangeData) => {
    const lobby = lobbyFromSocket(socket);
    if (!lobby) return;
    const player = lobby.players[socket.id];
    if (!player) return;
    player.station = data.station;
    emitToLobby(lobby.code, 'playerStationChanged', { id: socket.id, station: data.station });
    if (DEBUG) console.log('[Server] playerStationChange:', socket.id, '->', data.station);
  });

  socket.on('shipMove', (data: ShipMoveData) => {
    const lobby = lobbyFromSocket(socket);
    if (!lobby) return;
    const dx = data.x - lobby.shipX;
    const dy = data.y - lobby.shipY;
    const rawAngleDelta = data.angle - lobby.shipAngle;
    const angleDelta = ((rawAngleDelta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const distanceSq = dx * dx + dy * dy;
    const maxDist = (SHIP_SPEED * 2) * (SHIP_SPEED * 2);
    const maxAngle = SHIP_ROTATION_SPEED * 2;

    if (distanceSq <= maxDist && Math.abs(angleDelta) <= maxAngle) {
      lobby.shipX = data.x;
      lobby.shipY = data.y;
      lobby.shipAngle = data.angle;

      if (data.players && data.players[socket.id] && lobby.players[socket.id]) {
        lobby.players[socket.id].x = data.players[socket.id].x;
        lobby.players[socket.id].y = data.players[socket.id].y;
        for (const id in lobby.players) {
          if (id !== socket.id) {
            lobby.players[id].x += dx;
            lobby.players[id].y += dy;
          }
        }
      } else {
        for (const id in lobby.players) {
          lobby.players[id].x += dx;
          lobby.players[id].y += dy;
        }
      }

      emitToLobby(lobby.code, 'shipMoved', { x: lobby.shipX, y: lobby.shipY, dx, dy, angle: lobby.shipAngle });
      emitToLobby(lobby.code, 'playersMoved', lobby.players);
    } else {
      socket.emit('forceShipPosition', { x: lobby.shipX, y: lobby.shipY, angle: lobby.shipAngle });
    }
  });

  socket.on('cannonHit', (data: { enemyId: string }) => {
    const lobby = lobbyFromSocket(socket);
    if (!lobby) return;
    const e = lobby.enemies[data.enemyId];
    if (!e) return;
    e.hp = Math.max(0, e.hp - CANNON_DAMAGE);
    if (e.hp <= 0) {
      delete lobby.enemies[data.enemyId];
      lobby.score = Math.min(lobby.score + ENEMY_SCORE, MAX_SCORE);
      emitToLobby(lobby.code, 'enemyDestroyed', { id: data.enemyId });
      emitToLobby(lobby.code, 'scoreUpdated', { score: lobby.score });
    } else {
      emitToLobby(lobby.code, 'enemyDamaged', { id: data.enemyId, hp: e.hp });
    }
  });

  socket.on('cannonFired', (data: { x: number; y: number; vx: number; vy: number }) => {
    const lobby = lobbyFromSocket(socket);
    if (!lobby) return;
    broadcastToLobby(lobby.code, socket.id, 'cannonFired', data);
  });

  socket.on('disconnect', () => {
    if (DEBUG) console.log(`[Server] disconnect: ${socket.id}`);
    const code = socket.data.lobbyCode as string;
    if (code && lobbies[code]) {
      const lobby = lobbies[code];
      delete lobby.players[socket.id];
      if (lobby.hostId === socket.id) {
        const remaining = Object.keys(lobby.players);
        if (remaining.length > 0) {
          lobby.hostId = remaining[0];
          if (lobby.status === 'waiting') {
            emitToLobby(code, 'lobbyUpdate', { players: lobby.players, hostId: lobby.hostId });
          }
        }
      }
      if (Object.keys(lobby.players).length === 0) {
        delete lobbies[code];
        if (DEBUG) console.log(`[Server] disconnect: lobby ${code} deleted`);
      } else if (lobby.status === 'playing') {
        broadcastToLobby(code, socket.id, 'playerLeft', socket.id);
        emitToLobby(code, 'playersMoved', lobby.players);
      }
    }
  });

  socket.on('returnToMenu', () => {
    const lobby = lobbyFromSocket(socket);
    if (!lobby) return;
    emitToLobby(lobby.code, 'returnToMenu');
    delete lobbies[lobby.code];
    if (DEBUG) console.log(`[Server] returnToMenu: lobby ${lobby.code} closed`);
  });
});

const PORT = Number(process.env.PORT) || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] listening on all interfaces on port ${PORT}`);
});

// Enemy spawn interval
setInterval(() => {
  for (const code in lobbies) {
    const lobby = lobbies[code];
    if (lobby.status !== 'playing' || lobby.shipHp <= 0) continue;
    if (Object.keys(lobby.enemies).length >= MAX_ENEMIES) continue;
    if (Object.keys(lobby.players).length === 0) continue;

    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    const M = ENEMY_SPAWN_MARGIN;
    const W = MAP_WIDTH, H = MAP_HEIGHT;
    switch (side) {
      case 0: x = Math.random() * W; y = -M; break;
      case 1: x = W + M; y = Math.random() * H; break;
      case 2: x = Math.random() * W; y = H + M; break;
      default: x = -M; y = Math.random() * H; break;
    }
    const enemy: EnemyData = { id: `e${++lobby.enemyIdCounter}`, x, y, hp: ENEMY_HP, maxHp: ENEMY_HP };
    lobby.enemies[enemy.id] = enemy;
    emitToLobby(code, 'enemySpawned', enemy);
    if (DEBUG) console.log('[Server] enemy spawn:', code, enemy.id, 'at', x.toFixed(0), y.toFixed(0));
  }
}, ENEMY_SPAWN_INTERVAL_MS);

// Enemy movement and damage interval
setInterval(() => {
  for (const code in lobbies) {
    const lobby = lobbies[code];
    if (lobby.status !== 'playing' || lobby.shipHp <= 0) continue;
    if (Object.keys(lobby.players).length === 0) continue;

    const idsToRemove: string[] = [];
    for (const id in lobby.enemies) {
      const e = lobby.enemies[id];
      const dx = lobby.shipX - e.x;
      const dy = lobby.shipY - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ENEMY_HIT_DISTANCE) {
        idsToRemove.push(id);
      } else {
        e.x += (dx / dist) * ENEMY_SERVER_SPEED;
        e.y += (dy / dist) * ENEMY_SERVER_SPEED;
      }
    }
    for (const id of idsToRemove) {
      delete lobby.enemies[id];
      emitToLobby(code, 'enemyDestroyed', { id });
      lobby.shipHp = Math.max(0, lobby.shipHp - ENEMY_DAMAGE);
      emitToLobby(code, 'shipDamaged', { hp: lobby.shipHp, hpPct: (lobby.shipHp / SHIP_MAX_HP) * 100 });
      if (DEBUG) console.log('[Server] enemy hit:', code, id, 'destroyed, ship HP', lobby.shipHp);
      if (lobby.shipHp <= 0) {
        emitToLobby(lobby.code, 'gameOver', { score: lobby.score });
        if (DEBUG) console.log('[Server] gameOver:', code, 'score', lobby.score);
        break;
      }
    }
    emitToLobby(code, 'enemiesMoved', { enemies: Object.values(lobby.enemies) });
  }
}, 50);
