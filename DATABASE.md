# SEF eFakture Development Setup

## Quick Start Database

Pokrenite PostgreSQL i Redis sa Docker Compose:

```bash
docker-compose up -d postgres redis
```

Sačekajte da se servisi pokrenu, zatim:

```bash
# Generiši Prisma client
cd backend
npm run db:generate

# Pokreni migracije
npm run migrate:dev

# Seed-uj bazu sa demo podacima
npm run db:seed
```

## Demo korisnici

Nakon seed-a možete da se ulogujete sa:
- **Admin**: admin@democompany.rs / demo123
- **Računovođa**: racunovodja@democompany.rs / demo123

## Prisma Studio

Za lakše upravljanje bazom:
```bash
npx prisma studio
```

Ili pokrenite preko Docker-a:
```bash
docker-compose up prisma-studio
```
Prisma Studio će biti dostupan na http://localhost:5555

## Environment Variables

Kopirajte `.env.example` u `.env` i podesite vrednosti:
```bash
cp backend/.env.example backend/.env
```