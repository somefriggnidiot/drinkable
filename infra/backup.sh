#!/bin/sh
set -eu
backup_root=${BACKUP_ROOT:-/backups}
media_root=${MEDIA_ROOT:-/media}
backup_once() {
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  destination="$backup_root/$stamp"
  mkdir -p "$destination"
  chmod 700 "$destination"
  # Images are immutable and never automatically deleted. Copy after the snapshot so every published reference exists.
  pg_dump --format=custom --file="$destination/database.dump"
  tar -czf "$destination/media.tar.gz" -C "$media_root" .
  (cd "$destination" && sha256sum database.dump media.tar.gz > SHA256SUMS)
  touch "$destination/COMPLETE"
  find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime "+${BACKUP_RETENTION_DAYS:-14}" -exec rm -rf {} \;
  echo "Backup complete: $stamp"
}
if [ "${1:-}" = once ]; then backup_once; exit 0; fi
while :; do backup_once; sleep 86400; done
