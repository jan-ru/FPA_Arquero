#!/bin/bash

# Development Server Startup Script
# Kills any process on port 8000 and starts the Deno dev server

PORT=8000

echo "🔍 Checking for processes on port $PORT..."

# Find and kill any process using port 8000
PID=$(lsof -ti:$PORT 2>/dev/null)

if [ ! -z "$PID" ]; then
    echo "⚠️  Found process $PID using port $PORT"
    echo "🔪 Killing process..."
    kill -9 $PID 2>/dev/null
    sleep 1
    echo "✅ Port $PORT is now free"
else
    echo "✅ Port $PORT is already free"
fi

echo ""
echo "🚀 Starting Deno development server..."
echo ""

# Start the Deno dev server
deno task dev
