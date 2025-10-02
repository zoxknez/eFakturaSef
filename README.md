# SEF eFakture Application

Kompleksna, full-stack TypeScript aplikacija za integraciju sa srpskim SEF (Sistem Elektronskih Faktura) API-jem.

## 🚀 Karakteristike

### 🎯 Glavni Funkcionalni Moduli
- **Komandna tabla** - KPI dashboard sa real-time podacima
- **Izlazne fakture** - Kreiranje, slanje i praćenje faktora ka kupcima
- **Ulazne fakture** - Prijem, pregled i odlučivanje o fakturama
- **SEF API integracija** - Direktna povezanost sa demo i produkcijskim okruženjima
- **UBL 2.1 validacija** - Potpuna XML validacija i kreiranje
- **Webhook handling** - Automatsko procesiranje SEF callback-a
- **CRF reklamacije** - Linkovanje sa Centralnim registrom faktura
- **Elektronska evidencija PDV-a** - Kreiranje i praćenje evidencija
- **Uvozne carinske deklaracije** - Preuzimanje i linking sa fakturama

### 🔐 Uloge i Dozvole
- **Admin** - Kompletno upravljanje sistemom i podešavanjima
- **Računovođa** - Prodaja/nabavke, evidencije, CRF operacije
- **Revizor** - Read-only pristup + audit trail
- **Operater** - Bulk obrada, import/export operacije

### 🎨 UX/UI Karakteristike
- **Responsive design** - Potpuno prilagođeno svim uređajima
- **Tamna/svetla tema** - Podržane obe opcije
- **Latinica/Ćirilica** - Dvosmerno pismo sa toggle opcijom
- **Pristupačnost** - Tastaturne prečice, visok kontrast, ARIA

## 🏗️ Tehnička Arhitektura

### Frontend
- **React 18** sa TypeScript
- **Tailwind CSS** za stilizovanje
- **shadcn/ui** komponente
- **React Query** za state management
- **React Hook Form** za forme
- **Vite** build tool

### Backend
- **Node.js** sa Express i TypeScript
- **Prisma ORM** sa PostgreSQL
- **Bull Queue** sa Redis za job processing
- **JWT + Passport.js** autentikacija
- **Winston** logging
- **Rate limiting** i security middleware

### Infrastruktura
- **PostgreSQL** glavna baza podataka
- **Redis** za queue sistem i cache
- **Docker** containerization
- **Git** version control

## 📁 Struktura Projekta

```
sefsrb/
├── frontend/           # React TypeScript aplikacija
│   ├── src/
│   │   ├── components/ # Reusable UI komponente
│   │   ├── pages/      # Page komponente
│   │   ├── hooks/      # Custom React hooks
│   │   ├── utils/      # Utility funkcije
│   │   └── types/      # TypeScript tipovi
│   ├── public/         # Statički fajlovi
│   └── package.json
├── backend/            # Node.js API server
│   ├── src/
│   │   ├── routes/     # API rute
│   │   ├── middleware/ # Express middleware
│   │   ├── services/   # Business logika
│   │   ├── utils/      # Utility funkcije
│   │   └── types/      # TypeScript tipovi
│   ├── prisma/         # Database schema i migracije
│   └── package.json
├── shared/             # Zajednički tipovi i utils
│   ├── src/
│   │   ├── types.ts    # Zajednički TypeScript tipovi
│   │   ├── utils.ts    # Zajednički utility functions
│   │   └── validation.ts # Zod schema validacija
│   └── package.json
└── package.json        # Root package.json (workspaces)
```

## 🚀 Quick Start

### Preduslovi
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Git

### Instalacija

1. **Kloniraj repo**
```bash
git clone <repo-url>
cd sefsrb
```

2. **Instaliraj dependencies**
```bash
npm run install:all
```

3. **Podesi environment varijable**
```bash
# Backend
cp backend/.env.example backend/.env
# Edituj backend/.env sa tvojim podešavanjima

# Frontend
cp frontend/.env.example frontend/.env
# Edituj frontend/.env
```

4. **Setup baze podataka**
```bash
cd backend
npm run migrate:dev
npm run db:seed
```

5. **Pokreni aplikaciju**
```bash
# Root direktorijum - pokreće i frontend i backend
npm run dev

# Ili pojedinačno:
npm run dev:frontend  # Frontend na http://localhost:3000
npm run dev:backend   # Backend na http://localhost:3003

# Ako je port 3003 zauzet (Windows), možeš ga osloboditi:
npm run kill-port
```

## 🔧 Environment Configuration

### Backend (.env)
```env
NODE_ENV=development
PORT=3003
DATABASE_URL=postgresql://user:password@localhost:5432/sef_efakture
JWT_SECRET=your-super-secret-key
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379

# SEF API
SEF_DEMO_API_KEY=your-demo-api-key
SEF_PROD_API_KEY=your-prod-api-key
WEBHOOK_SECRET=your-webhook-secret
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=SEF eFakture
VITE_SEF_DEMO_URL=https://demoefaktura.mfin.gov.rs
VITE_SEF_PROD_URL=https://efaktura.mfin.gov.rs
```

## 📊 SEF API Integracija

### Okruženja
- **Demo**: `demoefaktura.mfin.gov.rs`
- **Produkcija**: `efaktura.mfin.gov.rs`

### Ključne funkcionalnosti
- Upload i slanje UBL 2.1 faktura
- Webhook callback handling za status promene
- Idempotentne operacije sa retry logikom
- "Noćna pauza" handling (01:00-06:00)
- Exponential backoff za failed requests

### UBL 2.1 Validacija
- Lokalna XSD validacija
- Online UBL validator integracija
- Serbian business rules validation
- Automatska total calculation verification

## 🛠️ Development

### Dostupni Skriptovi

**Root level:**
```bash
npm run dev              # Pokreće frontend i backend
npm run build            # Build svih workspaces
npm run test             # Test svih workspaces
npm run lint             # Lint svih workspaces
npm run type-check       # TypeScript checking
```

**Frontend:**
```bash
npm run dev              # Development server (Vite)
npm run build            # Production build
npm run preview          # Preview production build
npm run test             # Vitest tests
```

**Backend:**
```bash
npm run dev              # Development server (nodemon)
npm run build            # TypeScript build
npm run start            # Production server
npm run migrate:dev      # Prisma migrations
npm run db:generate      # Generate Prisma client
```

### Testing

```bash
# Unit tests
npm run test

# Frontend tests sa UI
cd frontend && npm run test:ui

# Backend integration tests
cd backend && npm run test:integration
```

### Database

```bash
# Docker baza i migracije (root):
npm run db:up           # pokreće docker compose (Postgres/Redis)
npm run db:migrate     # pokreće Prisma migrate dev (backend workspace)
npm run db:seed        # seed podataka (backend workspace)

# Nove migracije (backend):
cd backend && npx prisma migrate dev --name your-migration-name

# Reset baze (backend):
cd backend && npx prisma migrate reset

# Prisma Studio (backend):
cd backend && npx prisma studio
```

## 🔒 Sigurnost

### Implementirane Mere
- JWT token autentikacija
- Rate limiting (100 req/15min po IP-u)
- Helmet.js security headers
- CORS konfiguracija
- Input validation (Zod schemas)
- SQL injection protection (Prisma ORM)
- Encrypted API key storage
- Webhook signature verification

### Audit Trail
- Kompletno logovanje svih akcija
- User activity tracking
- API call monitoring
- Error logging sa winston

## 📈 Monitoring i Logging

### Logging
- Strukturisani JSON logovi
- Error i combined log fajlovi
- Console output u development
- Winston transport konfiguracija

### Health Checks
- `/health` endpoint
- Database connection check
- Redis connection check
- SEF API availability check

## 🚀 Production Deployment

### Railway (Backend)
- Kreiraj Railway projekat i Postgres plugin; kopiraj DATABASE_URL u backend service env.
- Backend service vars:
	- PORT=3003
	- NODE_ENV=production
	- DATABASE_URL=postgresql://...
	- JWT_SECRET=…
	- FRONTEND_URL=https://tvoj-frontend.vercel.app
	- SEF_WEBHOOK_SECRET=…
	- REDIS_URL=redis://… (opciono)
- Start command: `npm run start` (skripta radi `prisma migrate deploy` + startuje server)
- Health check: GET /health

### Vercel (Frontend)
- `vercel.json` je podešen za static build iz `frontend` i SPA fallback.
- Postavi `VITE_API_URL` ka Railway backend URL-u.

### Docker
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Environment Setup
1. PostgreSQL cluster setup
2. Redis cluster za queue
3. Load balancer konfiguracija
4. SSL sertifikati
5. Backup strategija

## 📚 Dokumentacija

### API Dokumentacija
- Swagger/OpenAPI specifikacija
- Postman kolekcija
- Integration guides

### SEF Resources
- [SEF Public API](https://efaktura.mfin.gov.rs)
- [Demo environment](https://demoefaktura.mfin.gov.rs)
- [UBL 2.1 Validator](https://efaktura.gov.rs)
- [CRF Portal](https://crf.trezor.gov.rs)

## 🤝 Contributing

1. Fork repo
2. Kreiraj feature branch (`git checkout -b feature/amazing-feature`)
3. Commit promene (`git commit -m 'Add amazing feature'`)
4. Push na branch (`git push origin feature/amazing-feature`)
5. Otvori Pull Request

## 📝 License

MIT License - videti [LICENSE](LICENSE) fajl.

## 📞 Support

Za support i pitanja:
- 📧 Email: support@example.com
- 📞 Telefon: +381 11 123 4567
- 💬 Slack: #sef-support

---

**Napomena**: Ova aplikacija je dizajnirana specificno za srpsko tržište i SEF regulativu. Sve funkcionalnosti su u skladu sa zakonskim zahtevima Republike Srbije za elektronsko fakturisanje.
