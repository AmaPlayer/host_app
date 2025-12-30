# Stop AmaPlayer Containers
# Run this script to stop all containers

Write-Host "Stopping AmaPlayer containers..." -ForegroundColor Yellow
Write-Host ""

docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Containers stopped successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start again, run: .\start-containers.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "✗ Failed to stop containers" -ForegroundColor Red
}

Write-Host ""
pause
