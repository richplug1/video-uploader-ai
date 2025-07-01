#!/bin/bash

# Deploy script for Video Uploader AI
set -e

echo "🚀 Déploying Video Uploader AI..."

# Configuration
ENVIRONMENT=${1:-development}
BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo "Environment: $ENVIRONMENT"
echo "Backend Port: $BACKEND_PORT"
echo "Frontend Port: $FRONTEND_PORT"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "📋 Checking dependencies..."

if ! command_exists node; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "✅ Dependencies check passed"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Check FFmpeg
echo "🎬 Checking FFmpeg..."
if ! command_exists ffmpeg; then
    echo "⚠️ FFmpeg not found. Installing FFmpeg..."
    if command_exists apt-get; then
        sudo apt-get update && sudo apt-get install -y ffmpeg
    elif command_exists yum; then
        sudo yum install -y ffmpeg
    elif command_exists brew; then
        brew install ffmpeg
    else
        echo "❌ Please install FFmpeg manually"
        exit 1
    fi
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/uploads/videos
mkdir -p backend/uploads/clips
mkdir -p backend/temp

# Environment setup
echo "⚙️ Setting up environment..."
cd ..

if [ ! -f backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cat > backend/.env << EOF
# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=$ENVIRONMENT
FRONTEND_URL=http://localhost:$FRONTEND_PORT

# File Upload Limits
MAX_FILE_SIZE=500MB
MAX_FILES_PER_REQUEST=1

# Video Processing
TEMP_DIR=./temp
UPLOADS_DIR=./uploads

# Security
JWT_SECRET=your_development_jwt_secret_key_here_$(date +%s)
BCRYPT_ROUNDS=10

# Cloud Storage Configuration (Local by default)
USE_CLOUD_STORAGE=false
CLOUD_STORAGE_PROVIDER=local

# AWS S3 Configuration (uncomment and configure to enable)
# USE_CLOUD_STORAGE=true
# CLOUD_STORAGE_PROVIDER=aws-s3
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_access_key_id
# AWS_SECRET_ACCESS_KEY=your_secret_access_key
# AWS_S3_BUCKET_NAME=your-video-uploader-bucket
# AWS_CLOUDFRONT_URL=https://your-distribution.cloudfront.net
EOF
    echo "✅ Backend .env file created"
else
    echo "⚠️ Backend .env file already exists, skipping..."
fi

if [ ! -f .env.local ]; then
    echo "📝 Creating frontend .env.local file..."
    cat > .env.local << EOF
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT
EOF
    echo "✅ Frontend .env.local file created"
else
    echo "⚠️ Frontend .env.local file already exists, skipping..."
fi

# Build frontend (production only)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🏗️ Building frontend for production..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build frontend"
        exit 1
    fi
fi

# Test the setup
echo "🧪 Testing the setup..."

# Start backend in background
echo "▶️ Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Test backend health
echo "🔍 Testing backend health..."
HEALTH_CHECK=$(curl -s http://localhost:$BACKEND_PORT/api/health || echo "failed")
if [[ $HEALTH_CHECK == *"OK"* ]]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Stop background processes
kill $BACKEND_PID 2>/dev/null || true

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Start the backend: cd backend && npm start"
echo "2. Start the frontend: npm run dev"
echo "3. Open http://localhost:$FRONTEND_PORT in your browser"
echo ""
echo "📖 Documentation:"
echo "- API Documentation: http://localhost:$BACKEND_PORT/api/health"
echo "- Cloud Storage Guide: ./CLOUD_STORAGE_GUIDE.md"
echo "- README: ./README.md"
echo ""
echo "🔧 Configuration:"
echo "- Backend config: backend/.env"
echo "- Frontend config: .env.local"
echo ""
echo "🌐 URLs:"
echo "- Frontend: http://localhost:$FRONTEND_PORT"
echo "- Backend API: http://localhost:$BACKEND_PORT"
echo "- Health Check: http://localhost:$BACKEND_PORT/api/health"
echo ""

if [ "$ENVIRONMENT" = "development" ]; then
    echo "🛠️ Development commands:"
    echo "- npm run dev        # Start development server"
    echo "- npm run test       # Run tests"
    echo "- npm run build      # Build for production"
    echo ""
    echo "📊 Test commands:"
    echo "- node test-complete-flow.js    # Test complete flow"
    echo "- node test-cloud-storage.js    # Test cloud storage"
    echo ""
fi

echo "✨ Happy coding!"
