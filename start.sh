#!/bin/bash

# Kill all background processes started by this script when exiting (Ctrl+C)
trap 'kill $(jobs -p)' SIGINT SIGTERM EXIT

echo "Installing server dependencies..."
npm --prefix server install

echo "Installing client dependencies..."
npm --prefix client install

echo "Starting Express Server..."
node --no-warnings --experimental-strip-types server/server.ts &

echo "Starting Vite Client..."
cd client
npm run dev --host --open
