#!/bin/bash

# Kill all background processes started by this script when exiting (Ctrl+C)
trap 'kill $(jobs -p)' SIGINT SIGTERM EXIT

echo "Starting Express Server..."
cd server
npm start &
cd ..

echo "Starting Vite Client..."
cd client
npm run dev -- --open
