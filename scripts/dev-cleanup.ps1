# Izolovan development start skripta
Write-Host "🧹 Čišćenje development okruženja..." -ForegroundColor Cyan

# 1. Graceful shutdown postojećih procesa
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Graceful shutdown Node.js procesa..." -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        try {
            $proc.CloseMainWindow() | Out-Null
            if (!$proc.WaitForExit(3000)) {
                $proc.Kill()
            }
        } catch {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
}

# 2. Očisti portove bez uticaja na Docker
Write-Host "Oslobađanje portova..." -ForegroundColor Yellow
$portsToCheck = @(3002, 3003)
foreach ($port in $portsToCheck) {
    $connections = netstat -ano | Select-String ":$port "
    if ($connections) {
        foreach ($conn in $connections) {
            $parts = $conn.ToString() -split '\s+'
            $processId = $parts[-1]
            if ($processId -and $processId -ne "0" -and $processId -ne "4") {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process -and $process.Name -eq "node") {
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }
}

Write-Host "✅ Okruženje pripremljeno!" -ForegroundColor Green
