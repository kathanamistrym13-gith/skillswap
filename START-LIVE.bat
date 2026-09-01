@echo off
setlocal
echo ==========================================
echo       SkillXchange Live Launcher
echo ==========================================

:: 1. Build the frontend (optional but recommended)
echo [1/3] Building frontend assets...
call npm run build

:: 2. Ensure port 3001 is free
echo [2/3] Preparing backend server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    if NOT "%%a"=="0" (
        echo Killing existing process on port 3001 (PID %%a)...
        taskkill /f /pid %%a >nul 2>&1
    )
)

:: 3. Start the backend and tunnel
echo [3/3] Going live! 
echo.
echo ************************************************************
echo  KEEP THIS WINDOW OPEN to maintain the live connection.
echo  Your website will be accessible via the tunnel URL below.
echo ************************************************************
echo.

:: Start the backend in a new window
start cmd /k "cd server && node index.js"

:: Start the tunnel in this window using Serveo (no password needed)
echo Your website will be available at a random .serveo.net URL shortly...
ssh -o StrictHostKeyChecking=no -R 80:localhost:3001 serveo.net

pause
