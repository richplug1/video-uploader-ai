#!/bin/bash

echo "🚀 Starting Video Uploader AI Development Environment"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "📋 Checking dependencies..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js (v16+)"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

if ! command_exists ffmpeg; then
    echo "⚠️  FFmpeg is not installed. Installing..."
    
    # Try to install FFmpeg based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update && sudo apt install -y ffmpeg
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command_exists brew; then
            brew install ffmpeg
        else
            echo "❌ Please install Homebrew first or install FFmpeg manually"
            exit 1
        fi
    else
        echo "❌ Please install FFmpeg manually for your operating system"
        exit 1
    fi
fi

echo "✅ All dependencies are available"

# Install project dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo "📦 Installing mobile dependencies..."
cd mobile
npm install
cd ..

# Create necessary directories
echo "📁 Creating upload directories..."
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/clips

# Copy environment file
echo "🔧 Setting up environment..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env file - please configure your settings"
fi

echo ""
echo "🎉 Setup complete! You can now start the development servers:"
echo ""
echo "🖥️  Start backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "🌐 Start web frontend:"
echo "   npm run dev"
echo ""
echo "📱 Start mobile app:"
echo "   cd mobile && npm run ios    # for iOS"
echo "   cd mobile && npm run android # for Android"
echo ""
echo "📚 Access the applications:"
echo "   Web App: http://localhost:3000"
echo "   API: http://localhost:3001"
echo ""
