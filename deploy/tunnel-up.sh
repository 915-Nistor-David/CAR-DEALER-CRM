#!/usr/bin/env bash
# Porneste CarFlow prin Cloudflare Tunnel — demo public fara server propriu.
#
#   bash deploy/tunnel-up.sh
#
# De ce e mai complicat decat un singur tunel: pozele sunt servite de API la
# /vehicles/{id}/{fisier}.jpg, iar aplicatia are ruta /vehicles/:id. Pe o singura
# adresa cele doua sunt ambigue, deci sunt necesare DOUA tuneluri.
#
# Adresele quick-tunnel sunt ALEATORII si se schimba la fiecare pornire. Adresa
# API-ului se coace in frontend la construire, deci scriptul reconstruieste
# imaginea `web` de fiecare data. Porneste-l inainte de prezentare si nu-l opri.

set -euo pipefail
cd "$(dirname "$0")/.."

CF="${CLOUDFLARED:-$HOME/.local/bin/cloudflared}"
[ -x "$CF" ] || { echo "Lipseste cloudflared la $CF"; exit 1; }
LOGS=$(mktemp -d)

cleanup_tunnels() { pkill -f 'cloudflared tunnel' 2>/dev/null || true; }

echo "==> Opresc tunelurile vechi"
cleanup_tunnels
sleep 2

# Ambele tuneluri arata spre acelasi Caddy (127.0.0.1:18080). Caddy separa cele
# doua site-uri dupa numele de gazda din cerere, exact ca pe server.
echo "==> Pornesc doua tuneluri"
nohup "$CF" tunnel --url http://localhost:18080 --no-autoupdate > "$LOGS/app.log" 2>&1 &
nohup "$CF" tunnel --url http://localhost:18080 --no-autoupdate > "$LOGS/api.log" 2>&1 &

grab_url() {
  for _ in $(seq 1 40); do
    u=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$1" 2>/dev/null | head -1)
    [ -n "$u" ] && { echo "$u"; return 0; }
    sleep 1
  done
  return 1
}

APP_URL=$(grab_url "$LOGS/app.log") || { echo "Tunelul aplicatiei n-a pornit; vezi $LOGS/app.log"; exit 1; }
API_URL=$(grab_url "$LOGS/api.log") || { echo "Tunelul API n-a pornit; vezi $LOGS/api.log"; exit 1; }
APP_HOST=${APP_URL#https://}
API_HOST=${API_URL#https://}

echo "    aplicatie : $APP_URL"
echo "    api       : $API_URL"

echo "==> Scriu .env"
# Cheile se genereaza o singura data si se pastreaza intre reporniri, ca sa nu
# invalidam sesiunile si linkurile de poze la fiecare demo (Jwt:Key e si samanta
# semnaturii pozelor).
if [ -f .env ] && grep -q '^JWT_KEY=.\+' .env; then
  JWT_KEY=$(grep '^JWT_KEY=' .env | cut -d= -f2-)
  POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
  echo "    pastrez cheile existente"
else
  JWT_KEY=$(openssl rand -hex 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 24)
  echo "    generez chei noi"
fi

cat > .env <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_KEY=$JWT_KEY
PUBLIC_APP_HOST=$APP_HOST
PUBLIC_API_HOST=$API_HOST
PUBLIC_APP_ORIGIN=$APP_URL
PUBLIC_API_ORIGIN=$API_URL
ACME_EMAIL=nefolosit@example.com
EOF
chmod 600 .env

mkdir -p data/photos
docker run --rm -v "$PWD/data/photos:/t" alpine:3 chown -R 1654:1654 /t 2>/dev/null || true

CO="docker compose -f docker-compose.yml -f docker-compose.tunnel.yml"

echo "==> Reconstruiesc frontendul (adresa API se coace in bundle)"
$CO build web

echo "==> Pornesc stiva"
$CO up -d

echo "==> Astept API-ul (pe baza goala aplica intai toate migrarile)"
for i in $(seq 1 45); do
  c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$API_URL/healthz" || true)
  [ "$c" = "200" ] && { echo "    gata dupa ~$((i*2))s"; break; }
  sleep 2
done

echo
echo "======================================================"
echo "  APLICATIA : $APP_URL"
echo "  API       : $API_URL/healthz"
echo
echo "  Prima data: deschide $APP_URL/register si fa-ti contul,"
echo "  apoi DECOMENTEAZA blocul @register din deploy/Caddyfile.tunnel"
echo "  si ruleaza: $CO restart web"
echo "  (adresa e publica — oricine o afla isi poate face cont)"
echo
echo "  Logurile tunelurilor: $LOGS"
echo "  Oprire: bash deploy/tunnel-down.sh"
echo "======================================================"
