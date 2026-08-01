#!/usr/bin/env bash
# Verificarea de dupa deploy. Se ruleaza din radacina proiectului, pe server:
#   bash deploy/verify.sh
#
# Citeste hostname-urile din .env. Toate verificarile sunt NEDISTRUCTIVE — nu
# creeaza conturi si nu scrie date. Pasii care cer date (inregistrare, masina,
# poza) se fac manual, din browser, la prima rulare (vezi Faza 4 din plan).

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
[ -f .env ] || { echo "Lipseste .env in $(pwd)"; exit 1; }
set -a; . ./.env; set +a

APP="${PUBLIC_APP_HOST:?}"
API="${PUBLIC_API_HOST:?}"
fails=0

pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; fails=$((fails+1)); }
chk()  { if [ "$1" = "$2" ]; then pass "$3 ($1)"; else fail "$3 — asteptat $2, primit $1"; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$1"; }

# Pe o baza goala API-ul aplica toate migrarile INAINTE sa asculte, iar
# serviciul `api` nu are healthcheck — deci `Up` din `docker compose ps` NU
# inseamna `gata`. Fara asteptarea asta, primele verificari dau 502.
echo "=== Astept API-ul ==="
ready=0
for i in $(seq 1 45); do
  [ "$(code "https://$API/healthz")" = "200" ] && { echo "  gata dupa ~$((i*2))s"; ready=1; break; }
  sleep 2
done
[ "$ready" = 1 ] || { fail "API-ul nu a raspuns in 90s — vezi 'docker compose logs api'"; exit 1; }

echo
echo "=== Containere ==="
docker compose ps --format 'table {{.Service}}\t{{.Status}}' | sed 's/^/  /'
chk "$(docker compose ps api --format '{{.Name}}' | wc -l)" "1" "exact un container api (nu exista lock distribuit pe remindere)"
chk "$(docker compose ps db api --format '{{.Ports}}' | grep -cE '(0\.0\.0\.0|\[::\]):')" "0" "db si api fara porturi publicate"

echo
echo "=== TLS si rutare ==="
chk "$(code "https://$API/healthz")" "200" "healthz (certificat valid, fara -k)"
chk "$(code "https://$API/api/vehicles")" "401" "/api/vehicles neautentificat"
chk "$(code "http://$APP/")" "308" "http -> https (portul 80 e si canalul ACME)"

echo
echo "=== SPA ==="
chk "$(code "https://$APP/vehicles/8")" "200" "deep-link /vehicles/8 (try_files)"
chk "$(code "https://$APP/agenda")" "200" "deep-link /agenda"
asset=$(curl -s --max-time 15 "https://$APP/" | grep -o '/assets/[^"]*\.js' | head -1)
[ -n "$asset" ] && chk "$(code "https://$APP$asset")" "200" "asset real" || fail "n-am gasit niciun /assets/*.js in index.html"
chk "$(code "https://$APP/assets/inexistent-xyz.js")" "404" "asset lipsa da 404, NU index.html"

echo
echo "=== CORS (aici se vede incrucisarea gresita APP/API) ==="
ok=$(curl -s -o /dev/null -D - --max-time 15 -H "Origin: https://$APP" "https://$API/api/vehicles" | grep -ci 'access-control-allow-origin')
chk "$ok" "1" "originea aplicatiei e permisa"
bad=$(curl -s -o /dev/null -D - --max-time 15 -H "Origin: https://atacator.example" "https://$API/api/vehicles" | grep -ci 'access-control-allow-origin')
chk "$bad" "0" "originea straina e respinsa"

echo
echo "=== Semnatura pozelor ==="
chk "$(code "https://$API/vehicles/1/inexistent.jpg")" "403" "fara semnatura -> 403 (middleware inaintea UseStaticFiles)"

echo
echo "=== Log de pornire ==="
docker compose logs api 2>&1 | grep -E "Migrari aplicate|Now listening" | tail -2 | sed 's/^/  /'
if docker compose logs api 2>&1 | grep -q "Eroare la trecerea de remindere"; then
  fail "serviciul de remindere a aruncat — va arunca din nou la fiecare 30 de minute"
else
  pass "niciun 'Eroare la trecerea de remindere'"
fi

echo
echo "=================================================="
if [ "$fails" = 0 ]; then echo "TOATE VERIFICARILE AUTOMATE AU TRECUT"; else echo "$fails VERIFICARI AU ESUAT"; fi
cat <<'EOF'

Raman de facut MANUAL, de pe un telefon real pe date mobile:
  - login (dovada finala a cablajului CORS + VITE_API_URL)
  - creare masina -> apare in "Cumparata" (cele 11 etape s-au creat la register)
  - upload poza din galerie, pe iPhone SI pe Android
    (iPhone fotografiaza HEIC; PhotosController accepta doar jpg/png/webp)
  - `docker compose restart`, apoi reincarci: poza e in continuare acolo
  - dupa inregistrarea Owner-ului: decomenteaza blocul @register din
    deploy/Caddyfile, `docker compose restart web`, si confirma 403 pe
    POST /api/auth/register
EOF
exit "$fails"
