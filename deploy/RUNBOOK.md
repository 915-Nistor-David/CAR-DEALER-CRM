# CarFlow — cum pornesc și opresc demo-ul

Ghid practic pentru demo-ul prin Cloudflare Tunnel (aplicația rulează pe laptopul
tău, dar are o adresă publică HTTPS pe care o poate deschide oricine).

---

## Unde rulează, de fapt

Trei lucruri, în trei locuri diferite. Merită înțeles o dată, ca să nu te
încurce mai târziu:

| Ce | Unde |
|---|---|
| **Codul pe care îl editezi** | `D:\CarDealerCRM` (Windows, ca de obicei) |
| **Demo-ul care rulează** | `~/carflow-test` în WSL Ubuntu — o copie separată |
| **Datele** (conturi, mașini, poze) | volume Docker + `~/carflow-test/data/photos` |

Demo-ul rulează dintr-o copie în Linux pentru că containerele au nevoie de un
sistem de fișiere Linux ca să gestioneze corect permisiunile pozelor. Prin
`/mnt/d` ar fi și lent, și cu probleme de drepturi.

Copia urmărește repo-ul tău local, deci **nu e nevoie de push pe GitHub** ca să
ajungă modificările în demo.

---

## Comenzile

Deschide **Ubuntu** din meniul Start (sau scrie `wsl` în PowerShell), apoi:

```bash
cd ~/carflow-test
```

### Vezi starea și adresa curentă

```bash
bash deploy/tunnel-status.sh
```

Cea mai folositoare. Îți arată adresele, dacă tunelurile trăiesc, dacă
aplicația răspunde, și câte conturi/mașini/poze ai în baza de date.

### Pornește

```bash
bash deploy/tunnel-up.sh
```

Durează ~2 minute. Aduce automat ultimele modificări din `D:\CarDealerCRM`
(cele **comise**), reconstruiește frontendul și pornește tot. La final îți
afișează adresele.

### Oprește

```bash
bash deploy/tunnel-down.sh
```

Oprește tunelurile și containerele. **Datele rămân.**

### Dacă ceva nu merge

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml logs --tail 50 api
```

Din PowerShell, fără să deschizi terminal separat, oricare comandă merge așa:

```bash
wsl -d Ubuntu -- bash -c "cd ~/carflow-test && bash deploy/tunnel-status.sh"
```

---

## Ce se pierde și ce nu

**Nu se pierd** la oprire, repornire de calculator, sau `tunnel-down.sh`:
conturile, mașinile, costurile, pozele. Trăiesc în volume Docker, separate de
containere.

**Se pierde adresa.** Tunelurile gratuite primesc nume aleatorii la fiecare
pornire. Link-ul trimis ieri nu mai merge azi.

**Singura comandă care șterge datele** este `docker compose down -v`. Acel `-v`
șterge volumele. Nu o folosi decât dacă chiar vrei să iei totul de la zero.

---

## Înainte de o prezentare

1. **Verifică setările de somn ale laptopului.** Dacă adoarme, tunelul moare și
   link-ul devine mort în mijlocul demonstrației. E cel mai probabil mod de
   eșec.
2. Pornește cu `tunnel-up.sh`, ia adresa, **și nu mai atinge nimic**.
3. Trimite link-ul.
4. Deschide-l tu întâi pe telefon, **pe date mobile**, nu pe Wi-Fi-ul de acasă —
   așa verifici că merge cu adevărat din exterior.
5. Încarcă o poză de pe telefon, ca probă. **Dacă ai acces la un iPhone,
   testează pe el:** iPhone-ul fotografiază HEIC, iar aplicația acceptă doar
   JPG/PNG/WEBP. De obicei Safari convertește automat, dar depinde de setarea
   *Cameră → Formate*. Dacă un vânzător primește „format neacceptat" în timpul
   ședinței, s-a terminat ședința.

Două lucruri de spus oamenilor dinainte:

- Sesiunea ține 24 de ore, dar link-urile pozelor doar 8. Un telefon lăsat
  deschis peste noapte arată sesiune validă și poze rupte — se rezolvă cu un
  refresh, nu e defect.
- Conturile lor le faci **tu**, din aplicație la `/utilizatori`. Înregistrarea
  publică e închisă intenționat (adresa e publică pe internet).

---

## Situații

**„Nu merge link-ul"** → `bash deploy/tunnel-status.sh`. Dacă tunelurile sunt
oprite, repornește. Adresa va fi alta.

**„Am schimbat cod și nu se vede"** → fă commit în `D:\CarDealerCRM`, apoi
`bash deploy/tunnel-up.sh` (aduce și reconstruiește). Modificările necomise nu
ajung în demo.

**„Vreau să redeschid înregistrarea"** → comentează cele două linii `@register`
din `deploy/Caddyfile.tunnel`, apoi:
```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml restart web
```

**„Vreau să văd ce e în baza de date"**
```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml exec db psql -U carflow -d carflow_db
```

**„Aplicația dă 502 imediat după pornire"** → normal. Pe o bază goală, backendul
aplică toate migrările înainte să înceapă să răspundă. Așteaptă ~10 secunde.
`tunnel-up.sh` face deja asta automat.

---

## Mai târziu: serverul adevărat

Demo-ul prin tunel e pentru ședință. Pentru ceva pe care dealerul chiar se
bazează, urmează VPS-ul — pornit permanent, adresă stabilă, backup-uri.

Planul complet e la `C:\Users\david\.claude\plans\sorted-swimming-sutton.md`.
Fișierele necesare există deja și sunt testate: `docker-compose.yml`,
`deploy/Caddyfile`, cele două `Dockerfile`, `deploy/backup.sh`,
`deploy/verify.sh`. Rămân Fazele 3-5 (serverul propriu-zis), ~o zi de lucru.
