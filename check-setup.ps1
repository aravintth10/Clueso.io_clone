# check-setup.ps1
# Automates environment checks for Clueso.io Full Stack

$ErrorActionPreference = "Continue"
$SuccessCount = 0
$TotalChecks = 0

function Write-Heading($text) {
    Write-Host "`n=== $text ===" -ForegroundColor Cyan
}

function Check-Command($cmd, $name) {
    $TotalChecks++
    $path = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($path) {
        Write-Host "[OK] $name found: $($path.Source)" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[FAIL] $name NOT found! Please install $cmd." -ForegroundColor Red
        return $false
    }
}

function Check-File($path, $name) {
    $TotalChecks++
    if (Test-Path $path) {
        Write-Host "[OK] $name found: $path" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[FAIL] $name NOT found at $path" -ForegroundColor Yellow
        return $false
    }
}

Write-Heading "Step 1: Checking Global Dependencies"
if (Check-Command "node" "Node.js") { $SuccessCount++ }
if (Check-Command "npm" "NPM") { $SuccessCount++ }
if (Check-Command "python" "Python") { $SuccessCount++ }
if (Check-Command "ffmpeg" "FFmpeg") { $SuccessCount++ }

Write-Heading "Step 2: Checking Component Structures"
# Node Layer
if (Check-File "Clueso_Node_layer\package.json" "Node layer structure") { $SuccessCount++ }
if (Check-File "Clueso_Node_layer\.env" "Node layer .env") { $SuccessCount++ }
if (Check-File "Clueso_Node_layer\node_modules" "Node layer dependencies") { $SuccessCount++ }

# Frontend Layer
if (Check-File "Clueso_Frontend_layer\package.json" "Frontend layer structure") { $SuccessCount++ }
if (Check-File "Clueso_Frontend_layer\.env" "Frontend layer .env") { $SuccessCount++ }
if (Check-File "Clueso_Frontend_layer\node_modules" "Frontend layer dependencies") { $SuccessCount++ }

# ProductAI Layer
if (Check-File "ProductAI\app\main.py" "Python AI structure") { $SuccessCount++ }
if (Check-File "ProductAI\.env" "Python AI .env") { $SuccessCount++ }
if (Check-File "ProductAI\venv" "Python AI virtual environment") { $SuccessCount++ }

# Recording Folders
$recordingsDir = Join-Path "Clueso_Node_layer" "recordings"
if (Check-File $recordingsDir "Consolidated recordings folder") { $SuccessCount++ }

Write-Heading "Summary"
$summaryColor = if ($SuccessCount -eq $TotalChecks) { "Green" } else { "Yellow" }
Write-Host "Passed $SuccessCount of $TotalChecks checks." -ForegroundColor $summaryColor

if ($SuccessCount -lt $TotalChecks) {
    Write-Host "`nAction Required: Please fix the [FAIL] items above before running '.\start-all-services.ps1'." -ForegroundColor White -BackgroundColor Red
}
else {
    Write-Host "`nSystem Ready! You can now run: .\start-all-services.ps1" -ForegroundColor Green -BackgroundColor Black
}
