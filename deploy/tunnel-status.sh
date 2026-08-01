#!/usr/bin/env bash
# Arata adresele curente si starea demo-ului.
#   bash deploy/tunnel-status.sh
set -uo pipefail
cd "$(dirname "$0")/.."

CO="docker compose -f docker-compose.yml -f docker-compose.tunnel.yml"

if [ ! -f .env ]; then echo "Nu ruleaza nimic (lipseste .env)."; exit 0; fi
set -a; . ./.env; set +a

echo "=== ADRESE ==="
echo "  Aplicatie : ${PUBLIC_APP_ORIGIN:-?}"
echo "  API       : ${PUBLIC_API_ORIGIN:-?}"
echo
echo "=== TUNELURI ==="
n=$(pgrep -fc 'cloudflared tunnel' 2>/dev/null || echo 0)
if [ "$n" -ge 2 ]; then echo "  $n active (e nevoie de 2)"
elif [ "$n" -eq 0 ]; then echo "  OPRITE — ruleaza deploy/tunnel-up.sh"
else echo "  doar $n activ; ar trebui 2 — reporneste cu deploy/tunnel-up.sh"; fi
echo
echo "=== CONTAINERE ==="
$CO ps --format 'table {{.Service}}\t{{.Status}}' 2>/dev/null | sed 's/^/  /'
echo
echo "=== RASPUNDE? ==="
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${PUBLIC_API_ORIGIN:-http://invalid}/healthz" || echo 000)
[ "$c" = "200" ] && echo "  API OK (200)" || echo "  API NU raspunde (cod $c)"
c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${PUBLIC_APP_ORIGIN:-http://invalid}/" || echo 000)
[ "$c" = "200" ] && echo "  Aplicatie OK (200)" || echo "  Aplicatia NU raspunde (cod $c)"
echo
echo "=== DATE (raman si dupa oprire) ==="
echo "  volume: $(docker volume ls --filter name=carflow --format '{{.Name}}' | tr '\n' ' ')"
echo "  poze  : $(find data/photos -type f 2>/dev/null | wc -l) fisier(e)"
u=$($CO exec -T db psql -U carflow -d carflow_db -tAc 'SELECT count(*) FROM "Users";' 2>/dev/null | tr -d '[:space:]')
v=$($CO exec -T db psql -U carflow -d carflow_db -tAc 'SELECT count(*) FROM "Vehicles";' 2>/dev/null | tr -d '[:space:]')
echo "  in baza: ${u:-?} utilizatori, ${v:-?} masini"
