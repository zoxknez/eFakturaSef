# 📖 Korisnički Priručnik - SEF eFakture

> Dobrodošli u SEF eFakture! Ovaj priručnik će vam pomoći da brzo savladate korišćenje aplikacije.

---

## 📑 Sadržaj

1. [Uvod](#uvod)
2. [Prva Prijava](#prva-prijava)
3. [Navigacija](#navigacija)
4. [Kreiranje Fakture](#kreiranje-fakture)
5. [Upravljanje Partnerima](#upravljanje-partnerima)
6. [Katalog Proizvoda](#katalog-proizvoda)
7. [PDV Evidencija](#pdv-evidencija)
8. [Izveštaji](#izveštaji)
9. [Podešavanja](#podešavanja)
10. [Česta Pitanja](#česta-pitanja)

---

## Uvod

### Šta je SEF eFakture?

SEF eFakture je aplikacija za elektronsko fakturisanje koja vam omogućava da:

- ✅ Kreirate i šaljete elektronske fakture
- ✅ Primate i pregledatee ulazne fakture
- ✅ Vodite PDV evidenciju
- ✅ Pratite plaćanja i dugovanja
- ✅ Generišete izveštaje

### Sistemski Zahtevi

| Preglednik | Minimalna verzija |
|------------|-------------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

> 💡 **Savet**: Za najbolje iskustvo koristite najnoviju verziju Chrome ili Firefox preglednika.

---

## Prva Prijava

### Korak 1: Otvaranje Aplikacije

1. Otvorite web preglednik
2. Unesite adresu aplikacije (npr. `https://efakture.vasafirma.rs`)
3. Sačekajte da se učita stranica za prijavu

### Korak 2: Unos Kredencijala

![Login stranica](images/login-screen.png)

1. **Email**: Unesite vašu email adresu
2. **Lozinka**: Unesite vašu lozinku
3. Kliknite **"Prijavite se"**

> ⚠️ **Važno**: Lozinka mora imati minimum 8 karaktera, jedno veliko slovo i jedan broj.

### Korak 3: Promena Lozinke (prvi put)

Pri prvoj prijavi sistem će vas zatražiti da promenite lozinku:

1. Unesite trenutnu lozinku
2. Unesite novu lozinku
3. Potvrdite novu lozinku
4. Kliknite **"Sačuvaj"**

---

## Navigacija

### Glavni Meni

Glavni meni se nalazi sa leve strane ekrana:

| Ikonica | Stavka | Opis |
|---------|--------|------|
| 📊 | Dashboard | Pregled ključnih metrika |
| 📝 | Fakture | Kreiranje i pregled faktura |
| 👥 | Partneri | Upravljanje kupcima i dobavljačima |
| 📦 | Proizvodi | Katalog proizvoda i usluga |
| 💰 | Plaćanja | Evidencija plaćanja |
| 📈 | PDV | PDV evidencija i obrasci |
| ⚙️ | Podešavanja | Konfiguracija sistema |

### Prečice na Tastaturi

Za brži rad koristite prečice:

| Prečica | Akcija |
|---------|--------|
| `Ctrl + K` | Otvori globalnu pretragu |
| `Ctrl + Shift + N` | Nova faktura |
| `Ctrl + Shift + P` | Novi partner |
| `Escape` | Zatvori trenutni dijalog |
| `Ctrl + /` | Prikaži sve prečice |

> 💡 **Savet**: Pritisnite `Ctrl + /` bilo kada da vidite sve dostupne prečice!

---

## Kreiranje Fakture

### Brzi Vodič (5 koraka)

#### Korak 1: Pokrenite Kreiranje

1. Kliknite na **"Nova Faktura"** u meniju ili pritisnite `Ctrl + Shift + N`
2. Otvoriće se čarobnjak za kreiranje fakture

#### Korak 2: Odaberite Kupca

1. Počnite kucati naziv ili PIB kupca
2. Odaberite kupca iz liste
3. Ili kliknite **"+ Novi kupac"** da dodate novog

> 💡 **Šta je PIB?**: Poreski Identifikacioni Broj - jedinstveni broj preduzeća u Srbiji (9 cifara)

#### Korak 3: Dodajte Stavke

1. Kliknite **"+ Dodaj stavku"**
2. Odaberite proizvod/uslugu iz kataloga
3. Unesite količinu
4. Cena i PDV se automatski izračunavaju

| Polje | Opis | Primer |
|-------|------|--------|
| Proizvod | Naziv iz kataloga | "Konsultantske usluge" |
| Količina | Broj jedinica | 10 |
| Jedinica mere | JM | "sat", "kom", "kg" |
| Cena | Cena bez PDV | 5.000,00 RSD |
| PDV stopa | Stopa poreza | 20% |

#### Korak 4: Proverite Podatke

Pregledajte sve unesene podatke:

- ✅ Podaci o kupcu
- ✅ Stavke fakture
- ✅ Iznosi (osnovica, PDV, ukupno)
- ✅ Datum i valuta

#### Korak 5: Pošaljite Fakturu

1. Kliknite **"Pošalji na SEF"**
2. Sačekajte potvrdu
3. Faktura je uspešno poslata! 🎉

### Statusi Fakture

| Status | Značenje | Boja |
|--------|----------|------|
| Draft | Nacrt, nije poslata | ⚪ Siva |
| Poslata | Čeka potvrdu | 🔵 Plava |
| Prihvaćena | Kupac prihvatio | 🟢 Zelena |
| Odbijena | Kupac odbio | 🔴 Crvena |
| Stornirana | Poništena | ⚫ Crna |

---

## Upravljanje Partnerima

### Dodavanje Novog Partnera

1. Idite na **Partneri** → **+ Novi partner**
2. Popunite obavezna polja:

| Polje | Obavezno | Opis |
|-------|----------|------|
| Naziv | ✅ | Pun naziv firme |
| PIB | ✅ | 9 cifara (validira se automatski) |
| Matični broj | ❌ | 8 cifara |
| Adresa | ✅ | Sedište firme |
| Email | ❌ | Za slanje faktura |
| Telefon | ❌ | Kontakt telefon |

3. Kliknite **"Sačuvaj"**

> 💡 **Auto-popunjavanje**: Unesite PIB i kliknite 🔍 da automatski povučete podatke iz APR-a!

### Vrste Partnera

- **Kupac** - Prima vaše fakture
- **Dobavljač** - Šalje vama fakture
- **Oba** - I kupac i dobavljač

---

## Katalog Proizvoda

### Zašto je Katalog Važan?

Katalog vam omogućava:
- Brže kreiranje faktura
- Konzistentne cene
- Automatski PDV

### Dodavanje Proizvoda

1. **Proizvodi** → **+ Novi proizvod**
2. Popunite:

| Polje | Opis |
|-------|------|
| Naziv | Ime proizvoda/usluge |
| Šifra | Vaša interna šifra |
| Jedinica mere | kom, sat, kg, m² |
| Cena | Cena bez PDV-a |
| PDV stopa | 0%, 10%, ili 20% |
| Opis | Dodatne informacije |

3. **Sačuvaj**

---

## PDV Evidencija

### Knjiga Primljenih Računa (KPR)

Automatski se popunjava iz ulaznih faktura:

- Datum prijema
- Broj fakture dobavljača
- Iznos osnovice
- Iznos PDV-a

### Knjiga Izdatih Računa (KIR)

Automatski se popunjava iz vaših faktura:

- Datum izdavanja
- Broj vaše fakture
- Iznos osnovice
- Iznos PDV-a

### PP-PDV Obrazac

Za generisanje poreske prijave:

1. Idite na **PDV** → **PP-PDV**
2. Odaberite period (mesec/kvartal)
3. Kliknite **"Generiši"**
4. Pregledajte i preuzmite PDF

---

## Izveštaji

### Dostupni Izveštaji

| Izveštaj | Opis |
|----------|------|
| Promet | Pregled prihoda po periodima |
| Dugovanja | Lista nenaplaćenih faktura |
| Potraživanja | Šta vama duguju |
| PDV | Sumarni PDV izveštaj |
| Cash flow | Projekcija tokova novca |

### Izvoz Podataka

Svi izveštaji se mogu izvesti u:
- 📊 **Excel** (.xlsx) - za dalju analizu
- 📄 **PDF** - za štampu i arhivu
- 📝 **CSV** - za uvoz u druge sisteme

---

## Podešavanja

### Podaci o Firmi

Ažurirajte podatke vaše firme:

- Naziv i PIB
- Adresa
- Kontakt podaci
- Logo (za fakture)
- Tekući računi

### Korisnici

Upravljanje korisničkim nalozima:

| Uloga | Prava |
|-------|-------|
| Admin | Sve |
| Računovođa | Fakture, PDV, Izveštaji |
| Operater | Samo kreiranje faktura |
| Revizor | Samo pregled (read-only) |

### SEF Integracija

Podešavanje SEF API-ja:

1. Unesite API ključ
2. Odaberite okruženje (Demo/Produkcija)
3. Testirajte konekciju
4. Sačuvajte

---

## Česta Pitanja

### ❓ Zaboravio/la sam lozinku?

1. Na stranici za prijavu kliknite **"Zaboravili ste lozinku?"**
2. Unesite email adresu
3. Proverite inbox (i spam folder)
4. Kliknite na link u emailu
5. Unesite novu lozinku

### ❓ Faktura je odbijena, šta da radim?

1. Proverite razlog odbijanja
2. Ispravite grešku (najčešće pogrešan PIB ili iznos)
3. Kreirajte novu fakturu sa ispravnim podacima

### ❓ Kako da storniram fakturu?

1. Otvorite fakturu
2. Kliknite **"Storniraj"**
3. Unesite razlog
4. Potvrdite akciju

> ⚠️ Stornirana faktura se ne može vratiti!

### ❓ Gde mogu da vidim SEF status?

Na Dashboard-u u gornjem desnom uglu se prikazuje SEF status:
- 🟢 Povezano - Sve radi
- 🟡 Spora veza - Moguća kašnjenja
- 🔴 Nije povezano - Proverite internet

---

## Pomoć i Podrška

### Kontakt

- 📧 **Email**: podrska@example.com
- 📞 **Telefon**: +381 11 123 4567
- 🕐 **Radno vreme**: Pon-Pet, 09:00-17:00

### Video Tutorijali

Pogledajte naše video vodiče:
- [Kreiranje prve fakture](https://youtube.com/watch?v=example1)
- [Podešavanje SEF-a](https://youtube.com/watch?v=example2)
- [PDV prijava](https://youtube.com/watch?v=example3)

---

<div align="center">

**Hvala što koristite SEF eFakture!** 🙏

*Poslednje ažuriranje: Novembar 2025*

</div>
