# Deployment, backup, and recovery

## Production

Use a Linux host with Docker/Compose, sufficient memory for the image build, a domain pointing to it, and TCP 80/443 plus UDP 443 available to Caddy. PostgreSQL and application ports remain internal.

1. Prepare `.env` from the example. Set `APP_URL=https://your-domain`, `SITE_DOMAIN`, `ACME_EMAIL`, a unique auth secret, and a URL-safe random database password of at least 20 characters. Configure real SMTP; Mailpit is not a production mail relay.
2. Supply MapTiler, Google, AdSense, and CMP settings for the integrations you enable. Register the Google callback against the exact HTTPS origin.
3. Review the editable FAQ/privacy/terms content and enter the launch breweries. Production starts empty. Bootstrap the initial administrator with the documented CLI.
4. Build and start:

```bash
docker compose -f compose.yaml -f compose.production.yaml --profile backup up --build -d
docker compose -f compose.yaml -f compose.production.yaml ps
docker compose logs --tail=100 web worker migrate
```

Production entrypoints reject default/weak secrets, non-HTTPS origins, and local Mailpit configuration. Public configuration is compiled into the image. Tag release images, for example `DRINKABLE_IMAGE=drinkable:release-20261108`, and retain the prior image.

## Staging and cutover

Use a separate checkout/environment, Compose project name, `.env`, domain, database, media, and HTTPS volumes for staging. Never share production authentication secrets or volumes with staging.

Validate sign-in and verification, password reset, Google callback, real tiles/geocoding, submissions/claims, owner edits, upload processing, moderation, scheduled sponsorships, consent and ad loading, and keyboard/mobile behavior there. AdSense delivery and OAuth consent cannot be verified using placeholder credentials.

For cutover, take and verify a backup, stop writes briefly, apply migrations once through the migration service, start the tagged application image, and verify `/api/health` plus a staff-controlled listing and image. Point the domain only after the stack is healthy. This repository does not change DNS or deploy externally automatically.

## Health and logs

`GET /api/health` checks database/schema access and reports worker heartbeat separately. The web health check fails when the database is unavailable. The worker health check fails if its heartbeat is stale. Logs are JSON on stdout and do not intentionally include passwords, cookies, or email bodies. Use `docker compose logs web worker` and inspect failed jobs in the private `pgboss` schema when investigating delivery/processing failures.

The worker retries email and media jobs with bounded retry policies. Failed uploads expose an explicit failed status and can be uploaded again. Maintenance clears expired verification/session/rate-limit records. Graceful shutdown stops the queue and closes database connections.

## Backups

The optional backup service writes a custom-format database dump, immutable media archive, and checksums to `./backups/TIMESTAMP`, with `COMPLETE` marking finished sets. It runs daily and retains 14 days by default. Only complete, checksum-verified sets should be restored. Protect the backup directory: it contains account and contact data.

```bash
docker compose --profile backup run --rm backup once
```

Copy completed sets off the server using your infrastructure’s backup/sync tooling; a backup on the same disk does not protect against host loss. For a release snapshot, stop web/worker writes during backup. Media is immutable and is not automatically deleted; the archive runs after the database snapshot so existing published references are included.

## Restore drill

Restore into a **new empty database and new media volume** first. Keep the old volumes intact. The backup container needs the restore script mounted, the chosen snapshot path, replacement database environment, and replacement media volume. The guard below is intentionally explicit.

```bash
CONFIRM_RESTORE=replace-drinkable sh /restore.sh /backups/TIMESTAMP
```

`infra/restore.sh` verifies checksums, restores with `pg_restore --exit-on-error`, and extracts media. Run it in a PostgreSQL/PostGIS tools container with `PGHOST`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` pointing at the replacement database. Mount `infra/restore.sh` at `/restore.sh`, the backups at `/backups:ro`, and the replacement media volume at `/media`. Set media ownership to UID/GID 1000 for the application container. Verify record counts, account access, and image URLs before switching the application to those volumes/database.

## Rollback

For application-only changes, restore the previous tagged image and restart web/worker. Migrations are checksum-verified and forward-only. If a release introduced an incompatible schema change, restore the matching pre-release backup into replacement volumes/database and run the matching prior image. Do not alter applied migration files or restore over a running application database.
