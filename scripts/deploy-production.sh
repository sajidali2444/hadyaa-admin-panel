#!/bin/bash

# Production Deployment Script for TanStack Start / Nitro
# Exit on error
set -e

echo "🚀 Starting production deployment..."

# 1. Check for pnpm
if ! command -v pnpm &> /dev/null
then
    echo "❌ pnpm could not be found. Please install pnpm first."
    exit 1
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 3. Build the application
echo "🏗️ Building the application..."
pnpm build

# 4. Check build output
if [ ! -d ".output" ]; then
    echo "❌ Build failed: .output directory not found."
    exit 1
fi

echo "✅ Build successful!"

# 5. Start the production server
# Note: In a real VPS, you might want to use PM2 or a systemd service.
# For this script, we'll provide the command to start.
echo "🌐 Production server ready to start."
echo "To start the server, run: pnpm start"

# Optional: Uncomment if you want the script to start the server immediately
# pnpm start
