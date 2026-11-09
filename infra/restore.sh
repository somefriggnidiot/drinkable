#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then echo "Usage: sh infra/restore.sh /backups/TIMESTAMP" >&2; exit 1; fi
directory=$1
test -f "$directory/COMPLETE"
if [ "${CONFIRM_RESTORE:-}" != "replace-drinkable" ]; then echo "Stop web and worker, then set CONFIRM_RESTORE=replace-drinkable to restore into an empty replacement database." >&2; exit 1; fi
(cd "$directory" && sha256sum -c SHA256SUMS)
pg_restore --exit-on-error --dbname="$PGDATABASE" "$directory/database.dump"
media_root=${MEDIA_ROOT:-/media}
mkdir -p "$media_root"
tar -xzf "$directory/media.tar.gz" -C "$media_root"
echo "Restore completed. Start web and worker after checking database and media ownership."
