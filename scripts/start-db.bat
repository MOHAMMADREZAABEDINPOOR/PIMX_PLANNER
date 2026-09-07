@echo off
setlocal

set "PG_CTL=C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "DB_DIR=%%~fI\db-data"

echo Checking if PostgreSQL is already running...
"%PG_CTL%" -D "%DB_DIR%" status >nul 2>&1
if %errorlevel% equ 0 (
    echo PostgreSQL is already running on port 5433
    exit /b 0
) else (
    echo Starting PostgreSQL from %DB_DIR% ...
    "%PG_CTL%" -D "%DB_DIR%" -o "-p 5433" start
)
