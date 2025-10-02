# Napredna skripta za čišćenje Node.js procesa
Write-Host "🧹 Čišćenje Node.js procesa..." -ForegroundColor Yellow

# Terminiranje svih Node.js procesa
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Pronađeno $($nodeProcesses.Count) Node.js procesa" -ForegroundColor Red
    $nodeProcesses | ForEach-Object {
        Write-Host "Terminiram PID: $($_.Id)" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "Nema aktivnih Node.js procesa" -ForegroundColor Green
}

# Oslobađanje portova
$ports = @(3000, 3001, 3002, 3003, 5432)
foreach ($port in $ports) {
    $process = netstat -ano | findstr ":$port "
    if ($process) {
        Write-Host "Port $port je zauzet, oslobađam..." -ForegroundColor Yellow
        $processId = ($process -split '\s+')[-1]
        if ($processId -and $processId -ne "0") {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "✅ Čišćenje završeno!" -ForegroundColor Green
