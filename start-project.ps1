Write-Host "Starting Planner Project..." -ForegroundColor Green
Write-Host ""

# Set environment variables
$env:PG_CONNECTION_STRING = "postgres://postgres:12345678fgh@localhost:5433/planner"
$env:PORT = "4000"
$env:VITE_API_BASE_URL = "http://localhost:4000/api"
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$dbDir = Join-Path $PSScriptRoot "db-data"

Write-Host "Environment variables set:" -ForegroundColor Yellow
Write-Host "- PG_CONNECTION_STRING: $env:PG_CONNECTION_STRING"
Write-Host "- PORT: $env:PORT"
Write-Host "- VITE_API_BASE_URL: $env:VITE_API_BASE_URL"
Write-Host ""

Write-Host "Starting database..." -ForegroundColor Cyan
& $pgCtl -D $dbDir -o "-p 5433" start

Write-Host ""
Write-Host "Waiting 3 seconds for database to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Starting API and Frontend..." -ForegroundColor Green
npm start
