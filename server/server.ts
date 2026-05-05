import express from 'express';
import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import type { PlayerData, PlayerMovementData } from '../shared/types.ts';

const app = express();
const httpServer = createServer(app);
const SHIP_X = 640;
const SHIP_Y = 640;

// Allow CORS for development with Vite
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory game state
const players: Record<string, PlayerData> = {};
const GAME_SPEED = 5;

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create new player on the ship deck
  const playerCount = Object.keys(players).length;
  const offsetX = playerCount === 0 ? -30 : 30;
  const newPlayer: PlayerData = {
    id: socket.id,
    x: SHIP_X + offsetX,
    y: SHIP_Y,
    color: Math.floor(Math.random() * 16777215)
  };
  players[socket.id] = newPlayer;

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
      const maxDist = (GAME_SPEED * 2) * (GAME_SPEED * 2);

      if (distanceSq <= maxDist) {
        player.x = movementData.x;
        player.y = movementData.y;
        // Broadcast the updated position to other players
        socket.broadcast.emit('playerMoved', player);
      } else {
        // If movement is invalid, force client back to server position
        socket.emit('forcePosition', player);
      }
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
