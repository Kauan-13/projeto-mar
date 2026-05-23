import express from 'express';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import type { PlayerData, PlayerMovementData, Station, StationChangeData, ShipMoveData } from '../shared/types.ts';
import { SHIP_X, SHIP_Y, PLAYER_SPEED, SHIP_SPEED, SHIP_ROTATION_SPEED } from '../shared/types.ts';

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
const GAME_SPEED = PLAYER_SPEED;

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

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

  // Broadcast to all other players that a new player has joined
  socket.broadcast.emit('playerJoined', newPlayer);

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
      socket.emit('forceShipPosition', { x: shipX, y: shipY, angle: shipAngle });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
