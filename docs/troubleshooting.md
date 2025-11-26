# 🐛 Rešavanje Problema (Troubleshooting)

> Vodič za dijagnostikovanje i rešavanje najčešćih problema u SEF eFakture aplikaciji.

---

## 📑 Sadržaj

- [Problemi sa Prijavom](#problemi-sa-prijavom)
- [Problemi sa Fakturama](#problemi-sa-fakturama)
- [SEF Greške](#sef-greške)
- [Problemi sa Performansama](#problemi-sa-performansama)
- [Problemi sa Izvozom](#problemi-sa-izvozom)
- [Ostali Problemi](#ostali-problemi)

---

## Problemi sa Prijavom

### ❌ "Pogrešan email ili lozinka"

**Mogući uzroci:**
1. Pogrešno uneta lozinka (proverite Caps Lock)
2. Pogrešna email adresa
3. Nalog ne postoji

**Rešenje:**
1. Proverite da li je Caps Lock isključen
2. Proverite da li ste uneli tačnu email adresu
3. Kliknite "Zaboravili ste lozinku?" za reset

---

### ❌ "Nalog je zaključan"

**Uzrok:** Previše neuspešnih pokušaja prijave (5+)

**Rešenje:**
1. Sačekajte 15 minuta
2. Pokušajte ponovo
3. Ako i dalje ne radi, kontaktirajte administratora

---

### ❌ "Sesija je istekla"

**Uzrok:** Niste bili aktivni duže od 30 minuta

**Rešenje:**
1. Prijavite se ponovo
2. Ako želite duže sesije, kontaktirajte administratora

---

### ❌ Ne dobijam email za reset lozinke

**Moguća rešenja:**
1. Proverite **Spam/Junk** folder
2. Proverite da li ste uneli tačnu email adresu
3. Dodajte `noreply@example.com` u kontakte
4. Sačekajte nekoliko minuta (može biti kašnjenje)
5. Pokušajte ponovo za 5 minuta

---

## Problemi sa Fakturama

### ❌ "Validacija nije uspela"

**Najčešći uzroci i rešenja:**

| Greška | Uzrok | Rešenje |
|--------|-------|---------|
| "PIB nije validan" | Pogrešan PIB kupca | Proverite 9 cifara, bez crtica |
| "Obavezan datum" | Niste uneli datum | Unesite datum fakture |
| "Iznos mora biti pozitivan" | Negativna vrednost | Unesite pozitivan broj |
| "Obavezna stavka" | Nema stavki | Dodajte minimum jednu stavku |

---

### ❌ "Faktura je odbijena od kupca"

**Koraci za rešavanje:**

1. Otvorite fakturu i pogledajte **razlog odbijanja**
2. Najčešći razlozi:
   - Pogrešan iznos
   - Pogrešan PIB
   - Nedostaje poziv na broj
   - Pogrešan datum
3. Kreirajte novu fakturu sa ispravnim podacima

---

### ❌ "Ne mogu da dodam stavku"

**Proverite:**
1. Da li je proizvod aktivan u katalogu?
2. Da li ima definisanu cenu?
3. Da li ima PDV stopu?

**Rešenje:** Uredite proizvod u katalogu i popunite sva obavezna polja.

---

### ❌ Stavke se ne sabiraju ispravno

**Uzrok:** Zaokruživanje decimalnih vrednosti

**Rešenje:** Sistem koristi 2 decimale za prikaz, ali interno računa sa više decimala. Razlike od 0.01 RSD su normalne.

---

## SEF Greške

### ❌ "SEF servis nije dostupan"

**Dijagnoza:**
1. Proverite internet konekciju
2. Proverite [SEF status stranicu](https://efaktura.mfin.gov.rs/status)
3. Proverite da li je API ključ validan

**Privremeno rešenje:**
1. Sačuvajte fakturu kao Draft
2. Pošaljite kada SEF bude dostupan

---

### ❌ "Nevalidan API ključ"

**Rešenje:**
1. Prijavite se na SEF portal
2. Idite u podešavanja API pristupa
3. Proverite da li je ključ aktivan
4. Ako je istekao, generišite novi
5. Ažurirajte ključ u aplikaciji: **Podešavanja → SEF Integracija**

---

### ❌ "Sertifikat je istekao"

**Rešenje:**
1. Prijavite se na SEF portal
2. Generišite nove kredencijale
3. Ažurirajte u aplikaciji

---

### ❌ "Timeout - SEF ne odgovara"

**Uzrok:** SEF server je preopterećen ili u održavanju

**Rešenje:**
1. Sačekajte 5-10 minuta
2. Pokušajte ponovo
3. Izbegavajte slanje u špicevima (početak/kraj meseca)

---

### ❌ "Duplikat fakture"

**Uzrok:** Faktura sa istim brojem već postoji na SEF-u

**Rešenje:**
1. Proverite da li je faktura već poslata
2. Ako jeste, pronađite je u listi faktura
3. Ako nije, promenite broj fakture i pošaljite ponovo

---

## Problemi sa Performansama

### 🐌 Aplikacija je spora

**Dijagnoza i rešenje:**

1. **Osvežite stranicu**
   - Pritisnite `F5` ili `Ctrl + R`

2. **Obrišite keš pregledača**
   - Chrome: `Ctrl + Shift + Delete` → "Cached images and files"
   - Firefox: `Ctrl + Shift + Delete` → "Cache"

3. **Proverite internet brzinu**
   - Otvorite [speedtest.net](https://speedtest.net)
   - Potrebno minimum 5 Mbps

4. **Zatvorite nepotrebne tabove**
   - Svaki tab troši memoriju

5. **Probajte drugi preglednik**
   - Chrome ili Firefox su preporučeni

---

### 🐌 Učitavanje liste traje predugo

**Rešenja:**
1. Koristite filtere da smanjite broj prikazanih stavki
2. Odaberite manji vremenski period
3. Izvezite u Excel za analizu velikih podataka

---

### 🐌 Pretraga je spora

**Rešenje:**
1. Budite specifičniji (koristite PIB umesto naziva)
2. Koristite filtere pre pretrage
3. Ako imate >10.000 partnera, kontaktirajte podršku za optimizaciju

---

## Problemi sa Izvozom

### ❌ Excel fajl se ne otvara

**Moguća rešenja:**
1. Proverite da li imate Excel ili LibreOffice instaliran
2. Probajte desni klik → "Open with" → Excel
3. Preuzmite ponovo fajl
4. Probajte izvoz u CSV format

---

### ❌ PDF je prazan ili nečitljiv

**Rešenja:**
1. Ažurirajte PDF čitač (Adobe Reader)
2. Preuzmite ponovo
3. Probajte drugi PDF čitač (Foxit, Chrome built-in)

---

### ❌ Ćirilica se ne prikazuje ispravno

**Rešenje za Excel:**
1. Otvorite Excel
2. Data → From Text/CSV
3. Odaberite fajl
4. U "File origin" odaberite **65001: Unicode (UTF-8)**
5. Kliknite Load

---

## Ostali Problemi

### ❌ Notifikacije ne stižu

**Proverite:**
1. **Email notifikacije:**
   - Da li je email adresa tačna?
   - Proverite spam folder
   - Proverite podešavanja notifikacija u aplikaciji

2. **Browser notifikacije:**
   - Da li ste dozvolili notifikacije?
   - Chrome: Settings → Privacy → Site Settings → Notifications

---

### ❌ Štampanje ne radi ispravno

**Rešenja:**
1. Koristite "Print to PDF" pa štampajte PDF
2. Proverite margins u print preview
3. Odaberite "Fit to page" opciju
4. Proverite orijentaciju (portrait vs landscape)

---

### ❌ Dva korisnika ne vide iste podatke

**Mogući uzroci:**
1. Keš pregledača - neka oba korisnika osvežu stranicu
2. Različite dozvole - proverite role korisnika
3. Filteri - proverite da li su aktivni filteri

---

## 🆘 Dijagnostički Podaci

Kada kontaktirate podršku, pripremite sledeće informacije:

```
1. URL stranice gde se problem javlja
2. Tačan tekst greške (screenshot ako je moguće)
3. Koraci za reprodukciju problema
4. Preglednik i verzija (Help → About)
5. Operativni sistem
6. Vreme kada se problem javio
```

### Kako da napravim screenshot?

- **Windows**: `Windows + Shift + S`
- **Mac**: `Cmd + Shift + 4`

### Kako da vidim verziju pregledača?

- **Chrome**: Menu (⋮) → Help → About Google Chrome
- **Firefox**: Menu (☰) → Help → About Firefox
- **Edge**: Menu (...) → Help and feedback → About Microsoft Edge

---

## 📞 Kontakt Podrška

Ako niste rešili problem, kontaktirajte nas:

| Kanal | Informacije |
|-------|-------------|
| 📧 Email | podrska@example.com |
| 📞 Telefon | +381 11 123 4567 |
| 🕐 Radno vreme | Pon-Pet, 09:00-17:00 |
| ⏱️ Vreme odgovora | Do 24 sata (radnim danima) |

**Prioritetna podrška** za kritične probleme (ne možete slati fakture):
- 📞 Hitna linija: +381 11 765 4321

---

<div align="center">

*Poslednje ažuriranje: Novembar 2025*

</div>
