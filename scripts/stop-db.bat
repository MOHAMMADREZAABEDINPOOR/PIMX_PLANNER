@echo off
setlocal

set "PG_CTL=C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "DB_DIR=%%~fI\db-data"

"%PG_CTL%" -D "%DB_DIR%" stop
