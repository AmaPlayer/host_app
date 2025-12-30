# Start AmaPlayer Containers
# Run this script from PowerShell in the containerization folder

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AmaPlayer Container Startup Script   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Docker is running
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "[OK] Docker installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker not found. Please make sure Docker Desktop is running." -ForegroundColor Red
    Write-Host "  - Open Docker Desktop application" -ForegroundColor Yellow
    Write-Host "  - Wait for it to fully start (whale icon in system tray)" -ForegroundColor Yellow
    Write-Host "  - Then run this script again" -ForegroundColor Yellow
    pause
    exit 1
}

# Test if Docker daemon is running
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker daemon is not running" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and wait for it to fully initialize" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""

# Step 2: Check for .env.docker file
Write-Host "Step 2: Checking environment configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env.docker")) {
    Write-Host "[ERROR] .env.docker file not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creating .env.docker from template..." -ForegroundColor Yellow

    if (Test-Path ".env.docker.example") {
        Copy-Item ".env.docker.example" ".env.docker"
        Write-Host "[OK] Created .env.docker file" -ForegroundColor Green
        Write-Host ""
        Write-Host "IMPORTANT: You need to edit .env.docker with your Firebase credentials!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Opening .env.docker in Notepad..." -ForegroundColor Yellow
        Start-Process notepad.exe ".env.docker"
        Write-Host ""
        Write-Host "Please:" -ForegroundColor Yellow
        Write-Host "  1. Fill in your Firebase configuration" -ForegroundColor White
        Write-Host "  2. Save the file" -ForegroundColor White
        Write-Host "  3. Close Notepad" -ForegroundColor White
        Write-Host "  4. Press any key here to continue" -ForegroundColor White
        pause
    } else {
        Write-Host "[ERROR] .env.docker.example not found" -ForegroundColor Red
        Write-Host "Please make sure you are in the containerization folder" -ForegroundColor Yellow
        pause
        exit 1
    }
} else {
    Write-Host "[OK] .env.docker file exists" -ForegroundColor Green
}

Write-Host ""

# Step 3: Check if containers are already running
Write-Host "Step 3: Checking for existing containers..." -ForegroundColor Yellow
$runningContainers = docker ps --filter "name=amaplayer" --format "{{.Names}}"
if ($runningContainers) {
    Write-Host "[WARNING] Found running containers:" -ForegroundColor Yellow
    $runningContainers | ForEach-Object { Write-Host "   - $_" -ForegroundColor White }
    Write-Host ""
    $stopThem = Read-Host "Do you want to stop them and rebuild? (y/n)"
    if ($stopThem -eq "y" -or $stopThem -eq "Y") {
        Write-Host "Stopping existing containers..." -ForegroundColor Yellow
        docker-compose down
        Write-Host "[OK] Stopped" -ForegroundColor Green
    }
}

Write-Host ""

# Step 4: Build containers
Write-Host "Step 4: Building containers..." -ForegroundColor Yellow
Write-Host "This will take 5-10 minutes on first run (downloading images + building)" -ForegroundColor Cyan
Write-Host ""

docker-compose build

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Build completed successfully!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""

# Step 5: Start containers
Write-Host "Step 5: Starting containers..." -ForegroundColor Yellow
Write-Host ""

# Start in detached mode
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Containers started!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to start containers" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""

# Step 6: Wait for containers to be healthy
Write-Host "Step 6: Waiting for containers to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Show container status
Write-Host ""
docker-compose ps

Write-Host ""

# Step 7: Display access information
Write-Host "========================================" -ForegroundColor Green
Write-Host "   CONTAINERS ARE RUNNING!             " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Admin:     http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  View logs:        docker-compose logs -f" -ForegroundColor White
Write-Host "  Stop containers:  docker-compose down" -ForegroundColor White
Write-Host "  Restart:          docker-compose restart" -ForegroundColor White
Write-Host "  Check status:     docker-compose ps" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to view live logs (Ctrl+C to exit logs)..." -ForegroundColor Yellow
pause

# Show logs
docker-compose logs -f
