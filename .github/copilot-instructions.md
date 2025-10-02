# SEF eFakture Application - TypeScript Full Stack

## Project Overview
Full-stack TypeScript aplikacija za integraciju sa srpskim SEF (Sistem Elektronskih Faktura) API-jem.

## Architecture
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Queue System**: Bull Queue + Redis
- **Authentication**: JWT + Passport.js

## Key Features
- SEF API integracija (demo i produkcija)
- UBL 2.1 validacija i kreiranje
- Webhook callback handling
- Izlazne i ulazne fakture
- CRF reklamacije
- Elektronska evidencija PDV-a
- Uvozne carinske deklaracije
- Multi-role sistem (Admin, Računovođa, Revizor, Operater)

## Development Guidelines
- Koristi TypeScript striktno tipiziran kod
- Prati Serbian government API specifikacije
- Implementiraj idempotentne operacije
- Koristi proper error handling sa retry logikom
- Sve callback operacije moraju biti sigurne i verifikovane

## API Integration
- Base URLs: `efaktura.mfin.gov.rs` (prod), `demoefaktura.mfin.gov.rs` (demo)
- Swagger dokumentacija dostupna na API endpointima
- Koristi eksponencijalni backoff za retry logiku
- Implementiraj "noćna pauza" handling

## Checklist Progress
- [x] ✅ Verify copilot-instructions.md created
- [x] ✅ Clarify Project Requirements - Full-stack TypeScript SEF eFakture app
- [x] ✅ Scaffold the Project - Created monorepo structure with frontend/backend/shared
- [x] ✅ Customize the Project - Added TypeScript configs, Prisma schema, basic structure
- [ ] Install Required Extensions
- [x] ✅ Compile the Project - Dependencies installed successfully
- [x] ✅ Create and Run Task - Created install task 
- [x] ✅ Launch the Project
- [ ] Ensure Documentation is Complete