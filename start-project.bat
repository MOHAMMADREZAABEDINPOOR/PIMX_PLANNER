@echo off
echo Starting Planner Project...
echo.

REM Set environment variables for API
set PG_CONNECTION_STRING=postgres://postgres:12345678fgh@localhost:5433/planner
set PORT=4000

REM Set environment variables for Frontend
set VITE_API_BASE_URL=http://localhost:4000/api

REM Resolve paths so we can start PostgreSQL even if the repo moved
set "PG_CTL=C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
set "DB_DIR=%~dp0db-data"

echo Environment variables set:
echo - PG_CONNECTION_STRING=%PG_CONNECTION_STRING%
echo - PORT=%PORT%
echo - VITE_API_BASE_URL=%VITE_API_BASE_URL%
echo.

echo Starting database...
"%PG_CTL%" -D "%DB_DIR%" -o "-p 5433" start

echo.
echo Waiting 3 seconds for database to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting API and Frontend...
npm start
