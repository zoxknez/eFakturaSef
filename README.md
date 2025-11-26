# SEF eFakture - Sistem za Elektronske Fakture

<div align="center">

![SEF eFakture](https://img.shields.io/badge/SEF-eFakture-blue?style=for-the-badge&logo=invoice&logoColor=white)

**Moderna aplikacija za elektronsko fakturisanje usklađena sa srpskim Sistemom Elektronskih Faktura (SEF)**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[📖 Dokumentacija](#-dokumentacija) • [🚀 Brzi Početak](#-brzi-početak) • [🎯 Funkcionalnosti](#-funkcionalnosti) • [📞 Podrška](#-podrška)

</div>

---

## 📖 O Projektu

**SEF eFakture** je kompletno rešenje za elektronsko fakturisanje dizajnirano za srpska preduzeća. Aplikacija omogućava kreiranje, slanje i praćenje elektronskih faktura u skladu sa zakonskim propisima Republike Srbije.

### Zašto SEF eFakture?

- ✅ **Usklađenost sa zakonom** - Potpuna integracija sa SEF sistemom Ministarstva Finansija
- 🎨 **Moderan dizajn** - Intuitivno korisničko iskustvo, lako za početnike
- 🔒 **Sigurnost** - Enkripcija podataka i bezbedan prenos
- 📱 **Responzivan** - Radi na svim uređajima (desktop, tablet, mobilni)
- 🇷🇸 **Na srpskom** - Kompletno prilagođeno srpskom tržištu
- ⌨️ **Prečice na tastaturi** - Brz rad za napredne korisnike

---

## 🎯 Funkcionalnosti

### 📝 Fakturisanje
| Funkcija | Opis |
|----------|------|
| Kreiranje faktura | Čarobnjak korak-po-korak za lako kreiranje |
| Ulazne fakture | Automatski preuzimanje i pregled |
| Knjižna odobrenja | Korekcije i storniranja |
| UBL 2.1 format | Potpuna kompatibilnost sa SEF standardom |
| PDF izvoz | Generisanje PDF faktura za štampu |

### 👥 Upravljanje
| Funkcija | Opis |
|----------|------|
| Partneri | Evidencija kupaca i dobavljača sa PIB validacijom |
| Proizvodi | Katalog proizvoda i usluga sa cenama |
| Plaćanja | Praćenje naplate i dugovanja |
| Dashboard | Ključne metrike na jednom mestu |

### 📊 Računovodstvo
| Funkcija | Opis |
|----------|------|
| Kontni plan | Prilagodljiv kontni okvir |
| Dnevnik knjiženja | Automatsko i ručno knjiženje |
| PDV evidencija | KPR i KIR knjige |
| PP-PDV | Generisanje poreske prijave |
| Izvodi | Uvoz i usaglašavanje bankovnih izvoda |

### 🔗 Integracije
- SEF API (demo i produkcija)
- NBS kursna lista
- Email notifikacije
- Webhook podrška

---

## 🚀 Brzi Početak

### Preduslov

```
✅ Node.js v18 ili noviji
✅ PostgreSQL v14 ili noviji  
✅ Redis (za queue sistem)
✅ Git
```

### Instalacija (3 jednostavna koraka)

```bash
# 1. Klonirajte i instalirajte
git clone https://github.com/zoxknez/eFakturaSef.git
cd eFakturaSef
npm install

# 2. Konfigurišite okruženje
cp env.example .env
# Uredite .env fajl sa vašim podacima

# 3. Pokrenite migracije i aplikaciju
cd backend && npx prisma migrate dev && cd ..
npm run dev
```

### 🐳 Docker (Preporučeno za početnike)

```bash
# Jednom komandom pokrenite sve
docker-compose -f docker-compose.local.yml up -d

# Aplikacija je dostupna na:
# 🌐 Frontend: http://localhost:5173
# 🔌 Backend:  http://localhost:3001
# 📊 Database: localhost:5432
```

---

## ⚙️ Konfiguracija

### Osnovne promenljive (.env fajl)

```env
# 📦 Baza podataka
DATABASE_URL="postgresql://user:password@localhost:5432/sef_efakture"

# 🔴 Redis
REDIS_URL="redis://localhost:6379"

# 🔐 Sigurnost (OBAVEZNO promenite!)
JWT_SECRET="generišite-siguran-ključ-minimum-32-karaktera"
JWT_REFRESH_SECRET="drugi-siguran-ključ-za-refresh-token"

# 🏛️ SEF API
SEF_API_KEY="vaš-sef-api-ključ"
SEF_ENVIRONMENT="demo"  # demo ili production

# 🌐 Frontend
VITE_API_URL="http://localhost:3001/api"

# 📧 Email (opcionalno)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="lozinka"
```

### SEF API Podešavanje

1. Registrujte se na [SEF Portal](https://efaktura.mfin.gov.rs)
2. Zatražite API pristup za vaše preduzeće
3. Preuzmite API ključ i sertifikate
4. Unesite podatke u `.env` fajl

---

## ⌨️ Prečice na Tastaturi

| Prečica | Akcija |
|---------|--------|
| `Ctrl + K` | 🔍 Globalna pretraga |
| `Ctrl + Shift + N` | 📝 Nova faktura |
| `Ctrl + Shift + P` | 👤 Novi partner |
| `Ctrl + Shift + D` | 📊 Dashboard |
| `Ctrl + /` | ❓ Pomoć (lista prečica) |
| `Escape` | ✖️ Zatvori modal/dijalog |

---

## 📁 Struktura Projekta

```
sefsrb/
├── 📂 frontend/          # React aplikacija (Vite + TypeScript)
│   ├── src/
│   │   ├── components/   # UI komponente (Button, Modal, Table...)
│   │   ├── pages/        # Stranice aplikacije
│   │   ├── hooks/        # Custom React hooks
│   │   ├── contexts/     # React Context provideri
│   │   ├── services/     # API komunikacija
│   │   └── store/        # Zustand state management
│   └── ...
│
├── 📂 backend/           # Express.js API server
│   ├── src/
│   │   ├── controllers/  # HTTP request handleri
│   │   ├── services/     # Biznis logika
│   │   ├── routes/       # API rute
│   │   ├── middleware/   # Auth, validation, logging
│   │   └── queue/        # Background jobs (Bull)
│   ├── prisma/           # Database schema i migracije
│   └── ...
│
├── 📂 shared/            # Deljeni kod između frontend i backend
│   └── src/
│       ├── types.ts      # TypeScript tipovi
│       ├── validation.ts # Zod šeme za validaciju
│       └── utils.ts      # Pomoćne funkcije
│
├── 📂 docs/              # Dokumentacija
│   ├── user-manual.md    # Korisnički priručnik
│   ├── api-reference.md  # API dokumentacija
│   ├── faq.md            # Česta pitanja
│   └── troubleshooting.md # Rešavanje problema
│
└── 📂 docker/            # Docker konfiguracije
    ├── nginx/            # Nginx reverse proxy
    └── postgres/         # PostgreSQL inicijalizacija
```

---

## 📚 Dokumentacija

| Dokument | Opis |
|----------|------|
| [📖 Korisnički priručnik](docs/user-manual.md) | Detaljan vodič za krajnje korisnike |
| [🔧 API Referenca](docs/api-reference.md) | Dokumentacija svih API endpointa |
| [❓ Česta pitanja (FAQ)](docs/faq.md) | Odgovori na uobičajena pitanja |
| [🐛 Rešavanje problema](docs/troubleshooting.md) | Pomoć pri tehničkim problemima |
| [🏗️ Arhitektura](docs/architecture.md) | Tehnički detalji sistema |

---

## 🔐 Sigurnost

Aplikacija implementira višeslojnu sigurnost:

| Mera | Opis |
|------|------|
| 🔑 JWT Auth | Autentifikacija sa access i refresh tokenima |
| 🔒 Bcrypt | Enkripcija lozinki (12 rundi hashovanja) |
| 🛡️ Rate Limit | Zaštita od brute-force napada |
| 📝 Audit Log | Praćenje svih korisničkih akcija |
| ✅ Validacija | Kompleksnost lozinke (8+ karaktera, broj, veliko slovo) |
| 🔐 HTTPS | Obavezno u produkciji |
| 🚫 CORS | Kontrola pristupa sa drugih domena |

### Prijava sigurnosnih problema

Ako pronađete sigurnosni problem, molimo vas da ga prijavite odgovorno putem email-a na security@example.com

---

## 🧪 Testiranje

```bash
# Pokretanje svih testova
npm test

# Testovi sa pokrivenošću koda
npm run test:coverage

# E2E testovi (Playwright)
npm run test:e2e

# Lint provera
npm run lint
```

---

## 📈 Performanse

Aplikacija je optimizovana za brz rad:

- ⚡ **Lazy loading** - Komponente se učitavaju po potrebi
- 🗄️ **Redis caching** - Keširanje čestih upita
- 📦 **Code splitting** - Manji bundle size
- 🔄 **Optimistic updates** - Instant UI feedback
- 📊 **Virtualizacija** - Efikasan prikaz velikih lista

---

## 🤝 Doprinos

Doprinosi su dobrodošli! Pratite ove korake:

1. **Fork** - Napravite svoju kopiju repozitorijuma
2. **Branch** - `git checkout -b feature/nova-funkcionalnost`
3. **Commit** - `git commit -m 'Dodaj novu funkcionalnost'`
4. **Push** - `git push origin feature/nova-funkcionalnost`
5. **Pull Request** - Otvorite PR sa opisom promena

### Coding standardi

- TypeScript strict mode
- ESLint + Prettier formatiranje
- Conventional Commits
- Minimum 80% test coverage za nove funkcije

---

## 📞 Podrška

Potrebna vam je pomoć?

| Kanal | Link |
|-------|------|
| 📧 Email | podrska@example.com |
| 💬 GitHub Issues | [Prijavite problem](https://github.com/zoxknez/eFakturaSef/issues) |
| 📖 Wiki | [Dokumentacija](https://github.com/zoxknez/eFakturaSef/wiki) |
| 💡 Discussions | [Pitanja i ideje](https://github.com/zoxknez/eFakturaSef/discussions) |

---

## 📄 Licenca

Ovaj projekat je licenciran pod **MIT licencom** - pogledajte [LICENSE](LICENSE) fajl za detalje.

---

## 🙏 Zahvalnice

Posebna zahvalnost:

- [Ministarstvo Finansija RS](https://www.mfin.gov.rs/) - SEF API dokumentacija
- [Poreska Uprava RS](https://www.purs.gov.rs/) - PDV propisi
- Open source zajednica za sjajne alate koje koristimo

### Tehnologije

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com/)

---

<div align="center">

Napravljeno sa ❤️ u Srbiji

**[⬆ Nazad na vrh](#sef-efakture---sistem-za-elektronske-fakture)**

</div>
