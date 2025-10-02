# SIGURNA Database setup skripta
Write-Host "🗄️ SIGURNI Database Setup..." -ForegroundColor Green

# 1. Proverava Docker
$dockerCheck = docker ps --filter "name=sef-postgres" --filter "status=running" --quiet
if (-not $dockerCheck) {
    Write-Host "❌ PostgreSQL kontejner nije pokrenut!" -ForegroundColor Red
    Write-Host "Pokreni: docker-compose up -d postgres redis" -ForegroundColor Yellow
    exit 1
}

Set-Location "d:\ProjektiApp\sefsrb\backend"

Write-Host "🔧 Generiram Prisma client..." -ForegroundColor Cyan
npx prisma generate

# 2. SIGURNA provera baze - NE BRIŠE podatke
Write-Host "🔍 Proveravam postojeću bazu..." -ForegroundColor Yellow
$tables = docker exec sef-postgres-1 psql -U postgres -d sef_efakture -c "\dt" 2>$null
if ($LASTEXITCODE -eq 0 -and $tables -match "No relations found") {
    Write-Host "🆕 Prazna baza - kreiram tabele..." -ForegroundColor Green
    npx prisma db push
} else {
    Write-Host "📋 Baza već ima tabele - preskačem kreiranje" -ForegroundColor Yellow
    Write-Host "ℹ️  Koristi 'npx prisma db push --force-reset' samo ako hoćeš da obrišeš sve" -ForegroundColor Gray
}

Write-Host "🌱 Seed-ujem bazu sa demo podacima..." -ForegroundColor Cyan
npm run db:seed 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Seed preskocen (verovatno vec postoje podaci)" -ForegroundColor Yellow
}

Write-Host "Database setup zavrsen!" -ForegroundColor Green
Write-Host "Demo korisnici:" -ForegroundColor Yellow
Write-Host "  Admin: admin@democompany.rs / demo123" -ForegroundColor White
Write-Host "  Racunovodja: racunovodja@democompany.rs / demo123" -ForegroundColor White
