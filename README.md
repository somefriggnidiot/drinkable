# Drinkable City

A TypeScript/Next.js brewery directory matching Drinkable.City’s original visual identity, with PostgreSQL/PostGIS, member reviews, owner tools, staff administration, and Docker Compose deployment.

## Run with Docker

Requires Docker Engine and Compose **2.24.4 or newer**. Host Node.js and PostgreSQL are not required.

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET to a random value of at least 32 characters.
docker compose up --build -d
```

Open **http://localhost:3000**. Development email is captured at **http://localhost:8025**. The database is private to the Compose network. Migrations run before web/worker startup. Production data starts with zero breweries and no accounts.

For source changes with hot reload:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up --build -d
```

### Optional development fixtures

The explicit seed creates 16 fictional breweries and member, owner, staff, and administrator accounts. These are not migrated businesses. Set a local test password; never seed a production database.

```bash
read -s -p 'Development account password: ' DEMO_PASSWORD
export DEMO_PASSWORD
docker compose exec -e NODE_ENV=development -e DEMO_PASSWORD web node dist/scripts/manage.js seed
unset DEMO_PASSWORD
```

Accounts are `member@example.test`, `owner@example.test`, `staff@example.test`, and `admin@example.test`. The owner manages River Market Brewing. In the hot-reload container, replace `node dist/scripts/manage.js` with `pnpm exec tsx scripts/manage.ts`.

### Create the first administrator

```bash
read -p 'Administrator email: ' ADMIN_EMAIL
read -s -p 'Administrator password: ' ADMIN_PASSWORD
export ADMIN_EMAIL ADMIN_PASSWORD
docker compose exec -e ADMIN_EMAIL -e ADMIN_PASSWORD web node dist/scripts/manage.js admin
unset ADMIN_EMAIL ADMIN_PASSWORD
```

The command verifies and promotes the account. If the account already exists, its password is unchanged. Administrator access is at **/admin/**. Staff can moderate content; only administrators manage account access.

## Configuration

| Setting                                                    | Purpose                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `APP_URL`                                                  | Public origin used for authentication, callbacks, and mutation protection                         |
| `POSTGRES_PASSWORD`                                        | Database password; use URL-safe characters because Compose constructs a connection URL            |
| `BETTER_AUTH_SECRET`                                       | Unique random session/authentication secret                                                       |
| `MEDIA_ROOT`                                               | Persistent media directory, `/app/data/media` in Compose                                          |
| `SMTP_*`, `MAIL_FROM`, `STAFF_EMAIL`                       | Transactional mail and staff notifications                                                        |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                 | Optional Google sign-in; callback is `APP_URL/api/auth/callback/google`                           |
| `NEXT_PUBLIC_MAPTILER_KEY`, `MAPTILER_KEY`                 | Browser tiles and server-side geocoding; restrict the browser key to your domains                 |
| `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_*_SLOT` | Publisher and home/results/detail slots                                                           |
| `NEXT_PUBLIC_COOKIEYES_ID`                                 | Your CookieYes CMP configuration; use the certified integration appropriate to your AdSense setup |
| `SITE_DOMAIN`, `ACME_EMAIL`                                | Production HTTPS proxy configuration                                                              |

Rebuild the image when a `NEXT_PUBLIC_*` value changes. Maps degrade to a clear unavailable state without a key; search by city/address still works. Google sign-in is omitted when unconfigured. Unconfigured advertising never renders blank ad blocks. Email verification requires the worker and a functioning SMTP destination.

## Local tools and verification

Node.js 24 and the pinned pnpm version are required outside Docker.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm test:integration` requires an explicitly supplied `TEST_DATABASE_URL` pointing to a disposable migrated database whose name ends in `_test`. The test suite clears its domain records before running. Never use production or development data for integration tests.

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
pnpm test:integration
```

Run the application with explicit development fixtures before browser testing. Supply the same `DEMO_PASSWORD` to the tests. Tests use Chromium; install it with `pnpm exec playwright install --with-deps chromium`. You may instead set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed browser.

```bash
pnpm test:e2e
pnpm format:check
```

See [architecture and API contracts](docs/architecture.md), [original design evidence](docs/reference/README.md), [production operations](docs/operations.md), and [verification results and remaining release checks](docs/verification/README.md).
