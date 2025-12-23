# start-all-services.ps1
# Orchestrates the startup of all Clueso.io services in separate terminal windows

Write-Host "🚀 Launching Clueso.io Integrated Services..." -ForegroundColor Cyan

# 1. Node.js Backend (Port 3000)
Write-Host "`n[1/3] Starting Node.js Backend (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Clueso_Node_layer; npm run dev" -WindowStyle Normal

# 2. Next.js Frontend (Port 3001)
Write-Host "[2/3] Starting Next.js Frontend (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Clueso_Frontend_layer; npx next dev -p 3001" -WindowStyle Normal

# 3. Python AI Service (Port 8000)
Write-Host "[3/3] Starting Python AI Service (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ProductAI; .\venv\Scripts\activate; uvicorn app.main:app --reload --port 8000" -WindowStyle Normal

Write-Host "`n✅ All services initiated in separate windows." -ForegroundColor Green
Write-Host "---------------------------------------------------"
Write-Host "Backend:  http://localhost:3000"
Write-Host "Frontend: http://localhost:3001"
Write-Host "AI API:   http://localhost:8000"
Write-Host "---------------------------------------------------"
Write-Host "Press any key to close this launcher..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
