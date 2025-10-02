#!/usr/bin/env powershell

# Alternativna development skripta bez concurrently
Write-Host "🚀 Pokretanje SEF eFakture development servera..." -ForegroundColor Green

# 1. Čišćenje
& "$PSScriptRoot\dev-cleanup.ps1"

# 2. Proveri Docker
Write-Host "🐳 Proveravam Docker servise..." -ForegroundColor Cyan
$dockerCheck = docker ps --filter "name=sef-postgres" --filter "status=running" --quiet
if (-not $dockerCheck) {
    Write-Host "⚠️  PostgreSQL kontejner nije pokrenut, pokretam..." -ForegroundColor Yellow
    docker-compose up -d postgres redis
    Start-Sleep -Seconds 5
}

# 3. Pokreni backend u background
Write-Host "🎯 Pokretam backend server..." -ForegroundColor Blue
$backendJob = Start-Job -ScriptBlock {
    Set-Location "d:\ProjektiApp\sefsrb\backend"
    npm run dev
}

Start-Sleep -Seconds 3

# 4. Pokreni frontend u foreground
Write-Host "🎨 Pokretam frontend server..." -ForegroundColor Magenta
Set-Location "d:\ProjektiApp\sefsrb\frontend"
npm run dev

# Cleanup kada se završi
Write-Host "🧹 Čišćenje job-ova..." -ForegroundColor Gray
Stop-Job $backendJob -ErrorAction SilentlyContinue
Remove-Job $backendJob -ErrorAction SilentlyContinue
