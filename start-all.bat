@echo off
setlocal

REM Root of the project (this batch file lives here)
set ROOT=%~dp0

REM Start API (reads .env.local for PG connection and PORT)
start "pimx-api" cmd /k "cd /d \"%ROOT%\" && npm run api"

REM Start frontend (Vite uses VITE_API_BASE_URL from .env.local)
start "pimx-ui" cmd /k "cd /d \"%ROOT%\" && npm run dev"

echo Started API and UI in separate windows.
