#!/usr/bin/env bash
# Backup zilnic: baza de date + pozele.
#
# Instalare pe server:
#   sudo cp deploy/backup.sh /srv/carflow/backup.sh
#   sudo chmod 700 /srv/carflow/backup.sh
#   sudo crontab -e
#   15 3 * * * /srv/carflow/backup.sh >> /var/log/carflow-backup.log 2>&1
#
# Fisierele contin nume si numere de telefon ale clientilor. Directorul de
# backup trebuie sa fie root, chmod 700.

set -euo pipefail

ROOT=/srv/carflow
DEST="$ROOT/backups"
STAMP=$(date -u +%Y%m%d-%H%M)

cd "$ROOT"
mkdir -p "$DEST"

# `exec -T`, nu `run`: `run` ar porni un AL DOILEA container Postgres peste
# acelasi volum. Iar pg_dump rulat din interiorul containerului garanteaza ca
# versiunea clientului se potriveste cu a serverului.
# -Fc = format custom: deja comprimat si permite restore selectiv pe tabel.
docker compose exec -T db pg_dump -U carflow -d carflow_db -Fc > "$DEST/db-$STAMP.dump"

tar czf "$DEST/photos-$STAMP.tar.gz" -C "$ROOT/data" photos

# Retentie scurta, deliberat: backup-uri nelimitate cu date personale ale
# clientilor pe o masina de staging se justifica greu ulterior.
find "$DEST" -name 'db-*.dump' -mtime +14 -delete
find "$DEST" -name 'photos-*.tar.gz' -mtime +14 -delete

echo "$(date -u +%FT%TZ) backup ok: db-$STAMP.dump + photos-$STAMP.tar.gz"

# --------------------------------------------------------------------------
# Drill de restore — de rulat MANUAL o data, inainte de prima prezentare.
# Un backup pe care nu l-ai restaurat niciodata e o speranta, nu un backup.
#
#   docker compose exec -T db createdb -U carflow carflow_restore_test
#   docker compose exec -T db pg_restore -U carflow -d carflow_restore_test \
#     --no-owner < backups/db-<stamp>.dump
#   docker compose exec -T db psql -U carflow -d carflow_restore_test \
#     -c 'select count(*) from "Vehicles";'
#   docker compose exec -T db dropdb -U carflow carflow_restore_test
# --------------------------------------------------------------------------
