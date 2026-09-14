# TSOS One-Click Setup
# Run: .\setup.ps1

$ErrorActionPreference = "Stop"
$root = "D:\work\TSOS\app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TSOS - Full Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---------- Check prerequisites ----------
Write-Host "[1/8] Checking prerequisites..." -ForegroundColor Yellow

try { node -v | Out-Null } catch {
    Write-Host "Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

try { psql --version | Out-Null } catch {
    Write-Host "PostgreSQL not found. Install from https://postgresql.org" -ForegroundColor Red
    exit 1
}

Write-Host "  Node.js: $(node -v)" -ForegroundColor Green
Write-Host "  npm: $(npm -v)" -ForegroundColor Green
Write-Host ""

# ---------- Setup PostgreSQL database ----------
Write-Host "[2/8] Setting up PostgreSQL database..." -ForegroundColor Yellow

$dbExists = psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tsos_dev'" 2>$null
if ($dbExists -ne "1") {
    psql -U postgres -c "CREATE DATABASE tsos_dev;"
    Write-Host "  Database 'tsos_dev' created" -ForegroundColor Green
} else {
    Write-Host "  Database 'tsos_dev' already exists" -ForegroundColor Green
}
Write-Host ""

# ---------- Install backend dependencies ----------
Write-Host "[3/8] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location "$root\backend"
npm install
Pop-Location
Write-Host "  Backend dependencies installed" -ForegroundColor Green
Write-Host ""

# ---------- Install frontend dependencies ----------
Write-Host "[4/8] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$root\frontend"
npm install
Pop-Location
Write-Host "  Frontend dependencies installed" -ForegroundColor Green
Write-Host ""

# ---------- Install electron dependencies ----------
Write-Host "[5/8] Installing Electron dependencies..." -ForegroundColor Yellow
Push-Location "$root\electron"
npm install
Pop-Location
Write-Host "  Electron dependencies installed" -ForegroundColor Green
Write-Host ""

# ---------- Start backend (runs migrations + seeds) ----------
Write-Host "[6/8] Starting backend server (runs migrations)..." -ForegroundColor Yellow
Start-Process -WorkingDirectory "$root\backend" -FilePath "powershell" -ArgumentList "-Command", "npx tsx src/index.ts" -WindowStyle Normal
Write-Host "  Backend starting on http://localhost:3001" -ForegroundColor Green
Write-Host "  Waiting 8s for server to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 8
Write-Host ""

# ---------- Start frontend ----------
Write-Host "[7/8] Starting frontend dev server..." -ForegroundColor Yellow
Start-Process -WorkingDirectory "$root\frontend" -FilePath "powershell" -ArgumentList "-Command", "npm run dev" -WindowStyle Normal
Write-Host "  Frontend starting on http://localhost:5173" -ForegroundColor Green
Write-Host ""

# ---------- Build native apps ----------
Write-Host "[8/8] Building native apps..." -ForegroundColor Yellow

# Build frontend for Capacitor
Push-Location "$root\frontend"
Write-Host "  Building frontend for mobile..." -ForegroundColor DarkGray
npm run build 2>$null
npx cap sync 2>$null
Pop-Location

# Capacitor Android
$capAndroid = "$root\frontend\android"
if (Test-Path $capAndroid) {
    Write-Host "  Capacitor Android project ready" -ForegroundColor Green
}

# Electron Windows
$electronDist = "$root\electron\dist-electron"
if (Test-Path $electronDist) {
    Write-Host "  Electron build ready" -ForegroundColor Green
}
Write-Host ""

# ---------- Open in Explorer ----------
Write-Host "Opening project folders..." -ForegroundColor Yellow
Start-Process explorer "$root\backend\src"
Start-Process explorer "$root\frontend\src"
Start-Process explorer "$root\electron"
if (Test-Path $capAndroid) { Start-Process explorer $capAndroid }
Write-Host ""

# ---------- Done ----------
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend API:    http://localhost:3001" -ForegroundColor White
Write-Host "  Frontend:       http://localhost:5173" -ForegroundColor White
Write-Host "  Login:          admin@tsos.dev / password123" -ForegroundColor White
Write-Host "  PIN:            1234" -ForegroundColor White
Write-Host ""
Write-Host "  Open Android:   cd app/frontend && npx cap open android" -ForegroundColor DarkGray
Write-Host "  Open Electron:  cd app/electron && npm start" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
