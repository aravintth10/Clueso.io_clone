# Recording Flow Diagnostic Script

Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   CLUESO RECORDING FLOW DIAGNOSTIC                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 1. Check if directories exist
Write-Host "`n1. CHECKING DIRECTORIES" -ForegroundColor Yellow
Write-Host "   Uploads directory:" -NoNewline
if (Test-Path "w:\OrganizeProperly\Clueso_clone\clueso-clone\Clueso_Node_layer\uploads") {
    Write-Host " ✅ EXISTS" -ForegroundColor Green
    $uploadFiles = Get-ChildItem "w:\OrganizeProperly\Clueso_clone\clueso-clone\Clueso_Node_layer\uploads" -File
    Write-Host "   Files in uploads: $($uploadFiles.Count)" -ForegroundColor Cyan
} else {
    Write-Host " ❌ MISSING" -ForegroundColor Red
}

Write-Host "   Recordings directory:" -NoNewline
if (Test-Path "w:\OrganizeProperly\Clueso_clone\clueso-clone\Clueso_Node_layer\recordings") {
    Write-Host " ✅ EXISTS" -ForegroundColor Green
    $recordingFiles = Get-ChildItem "w:\OrganizeProperly\Clueso_clone\clueso-clone\Clueso_Node_layer\recordings" -File
    Write-Host "   Files in recordings: $($recordingFiles.Count)" -ForegroundColor Cyan
    
    if ($recordingFiles.Count -gt 0) {
        Write-Host "`n   Latest files:" -ForegroundColor Cyan
        $recordingFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
            Write-Host "   - $($_.Name) ($([math]::Round($_.Length/1KB, 2)) KB) - $($_.LastWriteTime)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host " ❌ MISSING" -ForegroundColor Red
}

# 2. Test Node.js endpoints
Write-Host "`n2. TESTING NODE.JS ENDPOINTS" -ForegroundColor Yellow

try {
    $infoResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/info" -Method GET -ErrorAction Stop
    Write-Host "   /api/v1/info:" -NoNewline
    if ($infoResponse.StatusCode -eq 200) {
        Write-Host " ✅ OK" -ForegroundColor Green
    }
} catch {
    Write-Host "   /api/v1/info: ❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Test chunk upload endpoint
Write-Host "`n3. TESTING CHUNK UPLOAD ENDPOINT" -ForegroundColor Yellow

try {
    # Create a test blob
    $testData = "test video chunk data"
    $boundary = [System.Guid]::NewGuid().ToString()
    $bodyLines = @(
        "--$boundary",
        'Content-Disposition: form-data; name="sessionId"',
        '',
        'test_diagnostic_session',
        "--$boundary",
        'Content-Disposition: form-data; name="sequence"',
        '',
        '0',
        "--$boundary",
        'Content-Disposition: form-data; name="chunk"; filename="test.webm"',
        'Content-Type: video/webm',
        '',
        $testData,
        "--$boundary--"
    )
    
    $body = $bodyLines -join "`r`n"
    
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/recording/video-chunk" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "   /api/recording/video-chunk:" -NoNewline
    if ($response.StatusCode -eq 200) {
        Write-Host " ✅ OK" -ForegroundColor Green
        $content = $response.Content | ConvertFrom-Json
        Write-Host "   Response: $($content | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   /api/recording/video-chunk: ❌ FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

# 4. Check for video files
Write-Host "`n4. CHECKING FOR VIDEO FILES" -ForegroundColor Yellow

$sessionId = "session_1766402300573_x3u8b5h"
$videoPath = "w:\OrganizeProperly\Clueso_clone\clueso-clone\Clueso_Node_layer\recordings\recording_${sessionId}_video.webm"
$audioPath = "w:\OrganizeProperly\Clueso_clone\clueso-clone\Clueso_Node_layer\recordings\recording_${sessionId}_audio.webm"

Write-Host "   Video file:" -NoNewline
if (Test-Path $videoPath) {
    $size = (Get-Item $videoPath).Length
    Write-Host " ✅ EXISTS ($([math]::Round($size/1MB, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host " ❌ MISSING" -ForegroundColor Red
}

Write-Host "   Audio file:" -NoNewline
if (Test-Path $audioPath) {
    $size = (Get-Item $audioPath).Length
    Write-Host " ✅ EXISTS ($([math]::Round($size/1MB, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host " ❌ MISSING" -ForegroundColor Red
}

# 5. Test session data endpoint
Write-Host "`n5. TESTING SESSION DATA ENDPOINT" -ForegroundColor Yellow

try {
    $sessionResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/frontend/session/$sessionId/data" -Method GET -ErrorAction Stop
    Write-Host "   /api/v1/frontend/session/$sessionId/data:" -NoNewline
    if ($sessionResponse.StatusCode -eq 200) {
        Write-Host " ✅ OK" -ForegroundColor Green
        $sessionData = $sessionResponse.Content | ConvertFrom-Json
        Write-Host "`n   Session Data:" -ForegroundColor Cyan
        Write-Host "   - Has video: $($sessionData.data.video -ne $null)" -ForegroundColor Gray
        Write-Host "   - Has audio: $($sessionData.data.audio -ne $null)" -ForegroundColor Gray
        Write-Host "   - Instructions count: $($sessionData.data.instructions.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host " ❌ FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    DIAGNOSIS COMPLETE                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "RECOMMENDATIONS:" -ForegroundColor Yellow
Write-Host "1. Check browser console for chunk upload errors" -ForegroundColor White
Write-Host "2. Verify extension is loaded and permissions granted" -ForegroundColor White
Write-Host "3. Check Node.js logs for chunk reception" -ForegroundColor White
Write-Host "4. Ensure CORS is enabled on Node.js server`n" -ForegroundColor White
