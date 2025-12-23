# test-endpoints.ps1
# PowerShell script to test all Clueso.io endpoints

Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CLUESO.IO ENDPOINT VERIFICATION TEST SUITE         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$passed = 0
$failed = 0
$skipped = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Body = $null
    )

    Write-Host "`n🧪 Testing: $Name" -ForegroundColor Cyan

    try {
        $params = @{
            Uri = $Url
            Method = $Method
            TimeoutSec = 5
            ErrorAction = "Stop"
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }

        $response = Invoke-WebRequest @params
        
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host "✅ PASSED: $Name (Status: $($response.StatusCode))" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "❌ FAILED: $Name (Status: $($response.StatusCode))" -ForegroundColor Red
            $script:failed++
        }
    } catch {
        Write-Host "❌ FAILED: $Name" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
    }
}

function Skip-Endpoint {
    param(
        [string]$Name,
        [string]$Reason
    )

    Write-Host "`n⏭️  SKIPPED: $Name - $Reason" -ForegroundColor Yellow
    $script:skipped++
}

# ============================================
# NODE.JS BACKEND TESTS (Port 3001)
# ============================================

Write-Host "`n`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   NODE.JS BACKEND TESTS (Port 3001)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

Test-Endpoint -Name "GET /api/v1/info" -Url "http://localhost:3001/api/v1/info"

Test-Endpoint -Name "GET /api/v1/frontend/demo-data" -Url "http://localhost:3001/api/v1/frontend/demo-data"

Test-Endpoint -Name "GET /api/v1/frontend/session/test/status" -Url "http://localhost:3001/api/v1/frontend/session/test_session_123/status"

Test-Endpoint -Name "GET /api/v1/frontend/session/test/data" -Url "http://localhost:3001/api/v1/frontend/session/test_session_123/data"

Test-Endpoint -Name "POST /api/v1/frontend/send-instructions" `
    -Url "http://localhost:3001/api/v1/frontend/send-instructions" `
    -Method "POST" `
    -Body @{
        sessionId = "test_session_123"
        instructions = @{
            id = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
            text = "Test instruction"
            timestamp = (Get-Date).ToString("o")
        }
    }

Test-Endpoint -Name "POST /api/v1/frontend/store-dom-events" `
    -Url "http://localhost:3001/api/v1/frontend/store-dom-events" `
    -Method "POST" `
    -Body @{
        sessionId = "test_session_123"
        events = @(
            @{
                type = "click"
                timestamp = 1000
            }
        )
    }

Skip-Endpoint -Name "POST /api/recording/video-chunk" -Reason "Requires multipart/form-data with binary file"
Skip-Endpoint -Name "POST /api/recording/audio-chunk" -Reason "Requires multipart/form-data with binary file"
Skip-Endpoint -Name "POST /api/recording/process-recording" -Reason "Requires multipart/form-data with files"

# ============================================
# PYTHON AI BACKEND TESTS (Port 8000)
# ============================================

Write-Host "`n`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   PYTHON AI BACKEND TESTS (Port 8000)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

Test-Endpoint -Name "GET /openapi.json" -Url "http://localhost:8000/openapi.json"

Test-Endpoint -Name "GET /docs" -Url "http://localhost:8000/docs"

Skip-Endpoint -Name "POST /audio-full-process" -Reason "Requires GEMINI_API_KEY and DEEPGRAM_API_KEY"
Skip-Endpoint -Name "POST /process-recording" -Reason "Requires AI API keys"

# ============================================
# NEXT.JS FRONTEND TESTS (Port 3000)
# ============================================

Write-Host "`n`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   NEXT.JS FRONTEND TESTS (Port 3000)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

Test-Endpoint -Name "GET /" -Url "http://localhost:3000"

Test-Endpoint -Name "GET /recording/[sessionId]" -Url "http://localhost:3000/recording/test_session_123"

Test-Endpoint -Name "GET /test" -Url "http://localhost:3000/test"

# ============================================
# SUMMARY
# ============================================

Write-Host "`n`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    TEST SUMMARY                       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor Red
Write-Host "⏭️  Skipped: $skipped" -ForegroundColor Yellow

Write-Host "`n═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    Write-Host "⚠️  Some tests failed. Check the output above for details.`n" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "🎉 All tests passed!`n" -ForegroundColor Green
    exit 0
}
