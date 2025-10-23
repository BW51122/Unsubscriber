#!/bin/bash
# Setup script for Unsubscriber development environment (macOS/Linux)

echo "=========================================="
echo "Unsubscriber - Development Setup"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

echo "✅ Python version: $(python3 --version)"
echo ""

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

echo "✅ Node.js dependencies installed"
echo ""

# Set up Python virtual environment
echo "🐍 Setting up Python virtual environment..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo "✅ Python dependencies installed"
cd ..
echo ""

# Create placeholder tray icons if they don't exist
echo "🎨 Creating placeholder tray icons..."
if [ ! -f "assets/tray-icon.png" ]; then
    echo "⚠️  Please add tray-icon.png to the assets/ directory"
fi

if [ ! -f "assets/tray-icon-mac.png" ]; then
    echo "⚠️  Please add tray-icon-mac.png to the assets/ directory"
fi

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "To start the application in development mode:"
echo "  npm run dev"
echo ""
echo "To activate the Python virtual environment manually:"
echo "  cd backend && source venv/bin/activate"
echo ""

