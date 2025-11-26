# ❓ Česta Pitanja (FAQ)

> Odgovori na najčešća pitanja korisnika SEF eFakture aplikacije.

---

## 📑 Sadržaj

- [Opšta Pitanja](#opšta-pitanja)
- [Registracija i Prijava](#registracija-i-prijava)
- [Fakture](#fakture)
- [SEF Integracija](#sef-integracija)
- [PDV i Računovodstvo](#pdv-i-računovodstvo)
- [Tehnička Pitanja](#tehnička-pitanja)

---

## Opšta Pitanja

### Šta je SEF?

**SEF** (Sistem Elektronskih Faktura) je sistem Ministarstva Finansija Republike Srbije za razmenu elektronskih faktura između privrednih subjekata. Od 2023. godine je obavezan za sve transakcije sa javnim sektorom, a od 2024. za sve B2B transakcije.

### Da li je ova aplikacija besplatna?

Aplikacija ima besplatni osnovni paket sa ograničenim brojem faktura mesečno. Za veći obim poslovanja dostupni su plaćeni paketi.

### Ko može da koristi aplikaciju?

Aplikaciju mogu koristiti:
- Preduzetnici
- Mikro, mala i srednja preduzeća
- Velika preduzeća
- Udruženja i fondacije

### Na kojim jezicima je dostupna?

Trenutno je aplikacija dostupna na srpskom jeziku (latinica i ćirilica).

---

## Registracija i Prijava

### Kako da se registrujem?

1. Otvorite aplikaciju
2. Kliknite "Registracija"
3. Unesite podatke o firmi (PIB, naziv)
4. Unesite vaše korisničke podatke
5. Potvrdite email adresu
6. Čekajte odobrenje administratora

### Zaboravio/la sam lozinku. Šta da radim?

1. Na login stranici kliknite **"Zaboravili ste lozinku?"**
2. Unesite email adresu povezanu sa nalogom
3. Proverite inbox (i spam/junk folder)
4. Kliknite link u emailu (važi 24 sata)
5. Unesite novu lozinku

### Koliko puta mogu pogrešno uneti lozinku?

Nakon **5 neuspešnih pokušaja**, nalog se privremeno zaključava na 15 minuta. Ovo je sigurnosna mera protiv neovlašćenog pristupa.

### Kako da promenim lozinku?

1. Prijavite se na nalog
2. Idite u **Podešavanja** → **Moj nalog**
3. Kliknite **"Promeni lozinku"**
4. Unesite trenutnu i novu lozinku
5. Sačuvajte promene

### Koji su zahtevi za lozinku?

Lozinka mora imati:
- ✅ Minimum 8 karaktera
- ✅ Barem jedno veliko slovo (A-Z)
- ✅ Barem jedno malo slovo (a-z)
- ✅ Barem jedan broj (0-9)
- ✅ Preporučeno: specijalni karakter (!@#$%^&*)

---

## Fakture

### Kako da kreiram fakturu?

1. Kliknite **"Nova faktura"** ili pritisnite `Ctrl+Shift+N`
2. Odaberite kupca
3. Dodajte stavke (proizvode/usluge)
4. Proverite podatke
5. Kliknite **"Pošalji na SEF"**

Detaljno uputstvo: [Kreiranje Fakture](user-manual.md#kreiranje-fakture)

### Mogu li da izmenim poslatu fakturu?

**Ne**, faktura koja je poslata na SEF ne može se menjati. Ako ste napravili grešku:
1. Stornirajte pogrešnu fakturu
2. Kreirajte novu fakturu sa ispravnim podacima

### Šta znače različiti statusi fakture?

| Status | Značenje |
|--------|----------|
| **Draft** | Nacrt, još nije poslata |
| **Poslata** | Poslata na SEF, čeka odgovor |
| **Prihvaćena** | Kupac je prihvatio fakturu |
| **Odbijena** | Kupac je odbio fakturu |
| **Stornirana** | Faktura je poništena |

### Kako da storniram fakturu?

1. Otvorite fakturu koju želite da stornirate
2. Kliknite **"Storniraj"** (dugme sa ikonom ✕)
3. Unesite razlog storniranja
4. Potvrdite akciju

> ⚠️ **Pažnja**: Storniranje je trajno i ne može se poništiti!

### Koliko dugo se čuvaju fakture?

Po zakonu, fakture se moraju čuvati **10 godina**. Naš sistem automatski arhivira sve fakture i ne briše ih.

### Mogu li da preuzmem fakturu kao PDF?

Da! Na stranici fakture:
1. Kliknite ikonu **📥 Download**
2. Odaberite **PDF** format
3. Fajl će se preuzeti na vaš računar

---

## SEF Integracija

### Šta je API ključ i gde da ga nabavim?

API ključ je jedinstveni kod koji povezuje vašu aplikaciju sa SEF sistemom:

1. Prijavite se na [SEF Portal](https://efaktura.mfin.gov.rs)
2. Idite na **Podešavanja** → **API pristup**
3. Genereite novi ključ
4. Kopirajte ključ i unesite ga u našu aplikaciju

### Koja je razlika između Demo i Produkcije?

| Okruženje | Namena | SEF Portal |
|-----------|--------|------------|
| **Demo** | Testiranje, učenje | demoefaktura.mfin.gov.rs |
| **Produkcija** | Prave fakture | efaktura.mfin.gov.rs |

> 💡 **Preporuka**: Uvek prvo testirajte na Demo okruženju!

### SEF nije dostupan. Šta da radim?

1. Proverite internet konekciju
2. Proverite [status SEF sistema](https://efaktura.mfin.gov.rs/status)
3. Ako je SEF u održavanju, sačekajte
4. Fakture možete kreirati kao Draft i poslati kasnije

### Dobijam grešku "Nevalidan sertifikat". Kako da rešim?

1. Proverite da li je API ključ ispravan
2. Proverite da li je istekao (SEF ključevi važe godinu dana)
3. Generišite novi ključ na SEF portalu
4. Ažurirajte ključ u aplikaciji

---

## PDV i Računovodstvo

### Kako funkcioniše automatski obračun PDV-a?

Sistem automatski:
1. Primenjuje PDV stopu iz kataloga proizvoda
2. Računa osnovicu i PDV za svaku stavku
3. Sumira ukupne iznose
4. Evidentira u PDV knjige

### Koje PDV stope su podržane?

| Stopa | Primena |
|-------|---------|
| **20%** | Opšta stopa (većina roba i usluga) |
| **10%** | Snižena (hrana, lekovi, knjige...) |
| **0%** | Izvoz, oslobođeno |

### Kako da generišem PP-PDV obrazac?

1. Idite na **PDV** → **PP-PDV**
2. Odaberite poreski period
3. Sistem automatski povlači podatke iz faktura
4. Pregledajte i korigujte ako treba
5. Kliknite **"Generiši PDF"**

### Da li mogu da ispravim PDV knjige?

Da, ali samo za tekući poreski period. Za prethodne periode morate podneti izmenjenu poresku prijavu.

---

## Tehnička Pitanja

### Koji pregledači su podržani?

| Preglednik | Podržano |
|------------|----------|
| Google Chrome | ✅ (preporučeno) |
| Mozilla Firefox | ✅ |
| Microsoft Edge | ✅ |
| Safari | ✅ |
| Internet Explorer | ❌ |

### Aplikacija je spora. Šta da radim?

1. **Osvežite stranicu** (`F5` ili `Ctrl+R`)
2. **Obrišite keš pregledača** (`Ctrl+Shift+Delete`)
3. **Proverite internet** konekciju
4. **Zatvorite nepotrebne tabove**
5. Ako problem perzistira, kontaktirajte podršku

### Mogu li da koristim aplikaciju na telefonu?

Da! Aplikacija je prilagođena za mobilne uređaje. Preporučujemo korišćenje u landscape modu za tabele.

### Da li su moji podaci bezbedni?

Da, primenjujemo više nivoa zaštite:
- 🔐 SSL/TLS enkripcija saobraćaja
- 🔒 Enkripcija osetljivih podataka u bazi
- 🛡️ Redovne sigurnosne provere
- 📝 Audit log svih akcija
- 💾 Dnevni backup podataka

### Gde se čuvaju moji podaci?

Svi podaci se čuvaju na serverima u Srbiji, u skladu sa Zakonom o zaštiti podataka o ličnosti.

### Kako da izvezem sve svoje podatke?

1. Idite na **Podešavanja** → **Izvoz podataka**
2. Odaberite šta želite da izvezete
3. Odaberite format (Excel, CSV, JSON)
4. Kliknite **"Izvezi"**

---

## Još Pitanja?

Niste našli odgovor? Kontaktirajte nas:

- 📧 **Email**: podrska@example.com
- 💬 **Chat**: Kliknite na ikonicu u donjem desnom uglu
- 📞 **Telefon**: +381 11 123 4567

---

<div align="center">

*Poslednje ažuriranje: Novembar 2025*

</div>
