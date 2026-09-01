@echo off
REM ==========================
REM Full SkillXchange Launcher
REM ==========================

REM 1. Start backend in a new window
echo Starting backend...
start cmd /k "cd server && node index.js"

REM 2. Start Vite frontend in the current window
echo Starting frontend...
npm run dev

REM 3. Optional: Start localtunnel in a new window
REM Uncomment the next line if you want external access
REM start cmd /k "lt --port 5173 --subdomain skillxchange-v2 && start https://skillxchange-v2.loca.lt""

pause