#!/usr/bin/env bash
# Opreste demo-ul: tunelurile si containerele.
# Datele (baza de date si pozele) RAMAN — volumele nu se sterg.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "==> Opresc tunelurile"
pkill -f 'cloudflared tunnel' 2>/dev/null && echo "    oprite" || echo "    niciunul activ"

echo "==> Opresc containerele"
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml down

echo
echo "Datele au ramas. La urmatoarea pornire vei primi adrese NOI"
echo "(quick-tunnel), deci frontendul se reconstruieste automat."
