# Architecture and contracts

The Next.js application and TypeScript worker share PostgreSQL/PostGIS, domain validation, and immutable filesystem media. All runtime services are defined in Compose. No WordPress or old-site runtime dependency remains.

## Boundaries

- `src/domain`: brewery/search/opening-hour rules, revisions, ownership, reviews, media, validation.
- `src/lib`: authentication, permission checks, request limits, response errors, shared client requests.
- `src/db`: the PostgreSQL pool and Drizzle authentication mapping. Directory queries use Drizzle SQL; transactions use the same pg pool with bound parameters.
- `src/jobs`: pg-boss email/media workers, retries, cleanup, heartbeat.
- `src/components` and `src/app`: responsive CSS Modules, server-rendered public/account pages, client interactions, API handlers.
- `migrations`: ordered, checksum-verified SQL migrations. Startup initialization supplies taxonomies and policy/help pages, never breweries or accounts.

One location is one brewery. `profile` is a validated JSONB document for address/contact details, weekly/date-specific hours, media references, social links, and grouped facet slugs. Coordinates also have an indexed PostGIS geometry/geography representation. Taxonomy deletion is blocked while a current listing uses the term.

## Search

GET `/api/breweries` accepts `q`, `location`, paired `lat`/`lng`, `radius` in miles, `open=1`, `sort=updated|rating|latest|random`, `page`, stable random `seed`, and map `bounds=west,south,east,north`.

Facet parameters are `category`, `amenities`, `food`, `drinks`, `seating`, `takeaway`, and `tags`. Repeat a parameter or provide comma-separated slugs. Values within one group use OR; groups combine with AND. All inputs are validated and bound to SQL parameters. The response contains `items`, `markers`, `total`, `page`, and `pageSize`. Markers include every matching brewery, not just the displayed page. Opening-status filtering uses the brewery time zone. Current implementation evaluates hours and pagination after the indexed database filters; consider moving that work closer to SQL if the directory grows to a substantially larger national dataset.

Query state is shared by native GET forms, browser navigation, and list/map URLs. Default view is Last Updated. Unknown hours remain unknown. Date exceptions replace the whole calendar date, including overnight carry-over; closing time is exclusive.

## Mutation endpoints

All application mutations require same-origin requests. Sensitive writes require a verified, enabled member. Errors return `{error: string}` with a meaningful status. Domain transactions enforce permissions and conflict rules even when multiple requests race.

| Endpoint                               | Contract                                                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/*`                          | Better Auth registration, sessions, verification, Google, reset/change password                                                              |
| `POST /api/breweries`                  | Validated name, slug, profile; member submission pending, staff creation published                                                           |
| `PATCH /api/breweries/:id`             | Name, slug, profile, expected version; staff may set publication status                                                                      |
| `PUT/DELETE /api/bookmarks/:breweryId` | Idempotent saved-brewery membership                                                                                                          |
| `PUT/DELETE /api/reviews/:breweryId`   | One member review; six half-star ratings from .5–5, message, up to five owned photos                                                         |
| `POST /api/reports/:reviewId`          | Abuse reason; duplicate reports update rather than multiply                                                                                  |
| `POST /api/claims/:breweryId`          | Ownership evidence; pending until staff resolution                                                                                           |
| `POST /api/suggestions/:breweryId`     | Public email, correction, verification evidence                                                                                              |
| `POST /api/contact`                    | Public name/email/subject/message; honeypot and rate limit                                                                                   |
| `POST /api/media`                      | Verified-member multipart image, maximum 10 MB, still JPEG/PNG/WebP, bounded decoding                                                        |
| `GET /api/media/:id`                   | Uploader-only processing status and final image URL                                                                                          |
| `GET /media/:id/image.webp`            | Public, immutable processed image; source files are never served                                                                             |
| `GET /api/geocode?q=...`               | Rate-limited MapTiler location suggestions, explicit unavailable response without configuration                                              |
| `/api/admin/*`                         | Staff queues, listing revisions/restore, moderation, content, taxonomy, sponsorship, ownership; account access changes require administrator |

Media processing re-encodes images, removes metadata, generates a thumbnail, and deletes the source. Hidden reviews stay hidden when edited. A listing update snapshots the prior version and increments its version under a row lock. Claims lock the brewery before approving ownership and reject competing pending claims. Ownership revocation is checked immediately. The last active administrator cannot be removed.

## Advertising

AdSense slots render only when publisher/slot settings and CookieYes are configured and the CMP reports advertising consent. The local fallback preferences panel never authorizes network ads. Unconfigured slots render no placeholder. Sponsorships are separate, scheduled staff-managed placements, always labeled, and do not modify organic sorting. No billing or payment data is stored.

## Credentials and configuration

`NEXT_PUBLIC_*` settings are compiled into the browser bundle and supplied as Docker build arguments. Never put secrets in these settings. Google client secret, SMTP credentials, auth secret, and server geocoding key remain runtime-only. Google uses `/api/auth/callback/google`; verification and reset messages go through the queue. External services require real credentials for live verification.
