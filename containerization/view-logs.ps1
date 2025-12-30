# View Container Logs
# Run this script to see live logs from all containers

Write-Host "Viewing logs from all containers..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to exit" -ForegroundColor Yellow
Write-Host ""

docker-compose logs -f
