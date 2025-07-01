#!/bin/bash

echo "🚀 Starting Video Uploader AI Development Servers"

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping development servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start backend server
echo "🔧 Starting backend server on port 3001..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🌐 Starting frontend server on port 3000..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo ""
echo "📱 To start mobile app:"
echo "   cd mobile && npm run ios    # for iOS"
echo "   cd mobile && npm run android # for Android"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait
