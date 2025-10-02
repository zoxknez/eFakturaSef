# Sigurna skripta za pokretanje development servera
Write-Host "🚀 Pokretam SEF eFakture development servere..." -ForegroundColor Cyan

# 1. Čišćenje procesa
Write-Host "🧹 Čišćenje postojećih procesa..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Oslobađanje portova
3000,3001,3002,3003 | ForEach-Object {
    $connections = netstat -ano | findstr ":$_ "
    if ($connections) {
        $connections | ForEach-Object {
            $processId = ($_ -split '\s+')[-1]
            if ($processId -and $processId -ne "0") {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Start-Sleep -Seconds 2

# 3. Pokretanje backend servera u novom PowerShell prozoru
Write-Host "🖥️ Pokretam Backend server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd 'D:\ProjektiApp\sefsrb\backend'; npm run dev; pause" -WindowStyle Normal

Start-Sleep -Seconds 3

# 4. Pokretanje frontend servera u novom PowerShell prozoru
Write-Host "🌐 Pokretam Frontend server..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "cd 'D:\ProjektiApp\sefsrb\frontend'; npm run dev; pause" -WindowStyle Normal

Write-Host "✅ Serveri pokrenuti u odvojenim prozorima!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3003" -ForegroundColor Cyan
Write-Host ""
Write-Host "Za zatvaranje servera, zatvorite PowerShell prozore ili koristite Ctrl+C" -ForegroundColor Gray
