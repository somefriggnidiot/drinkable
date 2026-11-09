# Implementation verification

Verified November 8, 2026 (America/Chicago). Development fixtures are fictional and were created explicitly; the production migration does not import or create breweries or accounts.

## Executed checks

| Check                                                                                                 | Result                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Next.js build, TypeScript compilation, standalone packaging, bundled worker/management CLI | Passed                                                                                                                                                            |
| ESLint, Prettier, whitespace checks                                                                   | Passed                                                                                                                                                            |
| Unit tests                                                                                            | 11 passed: time zones, overnight intervals, exceptions, DST, unknown hours, input/link validation                                                                 |
| PostgreSQL/PostGIS integration tests                                                                  | 8 passed: moderation, competing claims, owner access, edit conflicts, revision restoration, review uniqueness, filtering/spatial search, administrator protection |
| Chromium browser suite                                                                                | 13 passed, including all four requested viewport widths                                                                                                           |
| Automated public accessibility checks                                                                 | No WCAG A/AA violations reported by axe on home, directory, brewery detail, FAQ, and account pages                                                                |
| Responsive rendering                                                                                  | 36 captures: nine public page types at 390, 768, 1024, and 1440px; no horizontal page overflow or browser exceptions                                              |
| Compose configuration                                                                                 | Development and production overrides both validate                                                                                                                |
| Native backup/restore drill                                                                           | Database dump and media checksums verified; restored into a new empty database and separate media directory                                                       |
| Standalone environment-file exclusion                                                                 | No `.env*` files in the packaged application root                                                                                                                 |

The browser suite exercises search and URL persistence, mobile filters, quick view and Escape dismissal, map fallback, cookie preferences, sign-in, persisted bookmarks, review creation/editing/reporting, staff hiding/restoring reviews, owner editing, staff content editing, contact submission, origin/permission checks, listing approval, ownership approval, and image processing. Registration, verification, sign-out, password recovery, and reset were exercised through an isolated captured SMTP inbox. Original upload files returned 404 while generated WebP images were served successfully.

The temporary native worker stopped during an earlier run. Its missing heartbeat was visible in `/api/health`; after starting the compiled worker, the queued image and email completed. Browser startup now requires both web and worker readiness. The final complete browser run passed all 13 tests in 24.6 seconds.

The backup snapshot restored 17 breweries, six users, one review, and one ready image. All three media files matched byte-for-byte checksums. Later browser tests created additional disposable records; these are not production data.

## Visual and interaction review

The original brand assets, Roboto, icon font, charcoal navigation, 62% hero overlay, white search panels, image cards, and grouped detail panels remain the design foundation. The original assets and measured reference are documented in [the reference inventory](../reference/README.md). The final review corrected a malformed background declaration that prevented the homepage photograph from using centered cover cropping, saved-bookmark state in directory cards, and contrast beneath the homepage navigation while content loads.

The design-law review preserved the requested original typography, palette, surfaces, cards, and layout wherever those intentionally override generic design advice. Checks covered the first-screen composition, icon consistency, text contrast, input labels, aligned action rows, page gutters, responsive wrapping, clipping/overflow, image cropping, visible content without entrance animations, restrained hover states, reduced motion, modal focus/Escape behavior, mobile filter controls, and explicit loading/empty/error states. Pointer interaction, keyboard dismissal, and automated accessibility checks supplement the screenshot review. This is not a claim of exhaustive assistive-technology certification or pixel identity across different directory content and cartography.

Representative final screenshots are in `screenshots/`. Recreate all 36 captures against a running development fixture stack:

```bash
pnpm exec playwright install --with-deps chromium
node scripts/visual-review.mjs
```

The script writes screenshots and measurements to `test-results/visual/`. `TEST_BASE_URL`, `VISUAL_OUTPUT`, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` are optional. Reduced motion freezes rotating homepage text. The script waits for streamed page content and fonts before capturing. Compare the original and rebuilt screenshots with their viewport dimensions in mind; directory fixture content is intentionally different.

## React diagnostics

The final source audit scanned 82 files and returned 32 advisory warnings, no errors, and no security-category findings. Remaining findings concern large forms/admin components, repeated lookup/formatting opportunities, positional keys for editable time intervals, numeric input ergonomics, and conservative accessibility/framework heuristics.

The `useSearchParams` warnings refer to routes that read request headers and render dynamically; the production build confirms they do not fail static prerendering. Native dialog backdrop handling and mobile navigation event delegation retain real buttons/links and keyboard dismissal. Google sign-in deliberately keeps its busy state during a successful redirect and clears it on failure. URL configuration and submitted coordinates are also validated at server boundaries. No rules were disabled to change the reported result. These advisory findings remain maintenance work and do not constitute a clean diagnostic score.

## Checks still required before release

A Docker CLI and Compose were available, but the Docker daemon did not respond in this environment. The actual application, worker, migrations, processed media, mail, and restore drill therefore ran against isolated native PostgreSQL 14/PostGIS 3.2 and Node.js 24 processes. The supplied Compose stack targets PostgreSQL 17/PostGIS 3.5. Building and starting that complete stack from a clean checkout, validating container restart/persistence behavior, and repeating the restore drill inside its containers remain release checks. The CI workflow includes image-build validation; it was not executed here.

Real MapTiler tiles/geocoding, Google OAuth callbacks, production SMTP, AdSense delivery, and CookieYes consent integration require operator credentials and provider configuration. Their unavailable/unconfigured states were verified locally; live-provider behavior remains a staging check. Advertising consent, blocked-ad behavior, and layout should be repeated with the actual configured services.

No external staging deployment, DNS change, or production cutover was performed. [Operations](../operations.md) documents isolated staging, deployment, backups, off-server copies, cutover, and rollback.
