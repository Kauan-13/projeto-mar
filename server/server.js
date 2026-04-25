import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const players = {};
const GAME_SPEED = 5;

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create new player with a random color and starting position
  players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * 400) + 200,
    y: Math.floor(Math.random() * 300) + 150,
    color: Math.floor(Math.random() * 16777215) // Random hex color
  };

  // Send current players to the new player
  socket.emit('currentPlayers', players);

  // Broadcast to all other players that a new player has joined
  socket.broadcast.emit('playerJoined', players[socket.id]);

  // Handle player movement
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      // Trust but verify: simple distance check
      const dx = movementData.x - players[socket.id].x;
      const dy = movementData.y - players[socket.id].y;
      const distanceSq = dx * dx + dy * dy;
      
      // Allow a reasonable max distance per tick (e.g., GAME_SPEED + some leniency)
      const maxDist = (GAME_SPEED * 2) * (GAME_SPEED * 2); 
      
      if (distanceSq <= maxDist) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        // Broadcast the updated position to other players
        socket.broadcast.emit('playerMoved', players[socket.id]);
      } else {
        // If movement is invalid, force client back to server position
        socket.emit('forcePosition', players[socket.id]);
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
