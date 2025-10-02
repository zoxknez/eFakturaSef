#!/usr/bin/env powershell

# Brza skripta za development start sa čišćenjem
Write-Host "🧹 Priprema development okruženja..." -ForegroundColor Cyan

# 1. Terminiranje svih Node.js procesa
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

Start-Sleep -Seconds 1
Write-Host "✅ Okruženje pripremljeno!" -ForegroundColor Green

# 3. Pokretanje development servera
Write-Host "🚀 Pokretam development servere..." -ForegroundColor Yellow
npm run dev
