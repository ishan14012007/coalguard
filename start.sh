#!/bin/sh
set -e

echo "========================================================"
echo "🛡️  CoalGuard Unified Production Web Service Starting..."
echo "========================================================"

# Launch MineSign AI Python Inference Service on internal port 5005 in background
echo "🚀 Starting MineSign AI Inference Service on 127.0.0.1:5005..."
python3 /app/minesign_ai/inference_server.py &

# Brief pause to let inference server initialize models
sleep 2

# Launch Express Backend & SPA Web Server on $PORT
echo "🚀 Starting Express API & Static Web Server on port ${PORT:-5001}..."
cd /app/server && exec node index.js
