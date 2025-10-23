@echo off
REM Setup script for Unsubscriber development environment (Windows)

echo ==========================================
echo Unsubscriber - Development Setup
echo ==========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo [OK] Node.js version:
node --version

REM Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Python is not installed. Please install Python 3.11+ first.
    exit /b 1
)

echo [OK] Python version:
python --version
echo.

REM Install Node.js dependencies
echo [INSTALL] Installing Node.js dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo X Failed to install Node.js dependencies
    exit /b 1
)

echo [OK] Node.js dependencies installed
echo.

REM Set up Python virtual environment
echo [SETUP] Setting up Python virtual environment...
cd backend

if not exist "venv" (
    python -m venv venv
)

call venv\Scripts\activate.bat

REM Install Python dependencies
echo [INSTALL] Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo X Failed to install Python dependencies
    exit /b 1
)

echo [OK] Python dependencies installed
cd ..
echo.

REM Check for tray icons
echo [CHECK] Checking for tray icons...
if not exist "assets\tray-icon.png" (
    echo [WARNING] Please add tray-icon.png to the assets\ directory
)

if not exist "assets\tray-icon-mac.png" (
    echo [WARNING] Please add tray-icon-mac.png to the assets\ directory
)

echo.
echo ==========================================
echo [OK] Setup Complete!
echo ==========================================
echo.
echo To start the application in development mode:
echo   npm run dev
echo.
echo To activate the Python virtual environment manually:
echo   cd backend
echo   venv\Scripts\activate.bat
echo.

pause

