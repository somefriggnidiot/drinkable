# Original website reference

Inspected November 8, 2026 (America/Chicago). Public pages were read without submitting forms or creating accounts.

The original runs WordPress, Elementor, MyListing, WooCommerce, and Vue 2. Its public CDN returned 403 responses during inspection. Screenshots were captured with asset requests routed to the corresponding public origin URLs; missing icon fonts in some older captures are reference defects, not desired output.

## Identity and measurements

| Element                 | Observed reference                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Wordmark                | `/wp-content/uploads/2023/08/Wordmark_DualColor.svg`; white, `#ffcc00`, `#fcd21d`   |
| Homepage image          | `/wp-content/uploads/2023/08/bar.jpeg`                                              |
| Body                    | Roboto, 14px / 20px                                                                 |
| Homepage heading        | Roboto regular, 50px / 50px desktop; 38px / 1.2 mobile                              |
| Homepage secondary line | Rotating brewery interests; approximately 30px desktop, 18px mobile                 |
| Hero                    | Minimum 100vh, image cover, centered; black overlay opacity .62                     |
| Header                  | 89px desktop, approximately 60px mobile; 1140px boxed desktop content               |
| Logo box                | 168 × 42px desktop; approximately 104 × 26px mobile                                 |
| Interior header         | `#202125`                                                                           |
| Buttons                 | Near-black `#111820`, white text, small corner radius                               |
| Body surfaces           | White panels on pale gray; restrained borders and shadows                           |
| Homepage footer         | `#8f887f`; text contrast corrected in rebuild                                       |
| Directory               | Desktop filters about 400px wide; two card columns in browse, one beside map        |
| Card                    | Cover image around 230px high, bottom caption, top opening badge, 47px action row   |
| Detail                  | Cover hero, centered About/Reviews tabs, action row, information and sidebar panels |

## Page and interaction inventory

- `/`: transparent header, rotating interest line, type/location/proximity search, brewery tab, footer.
- `/browse/`: keywords, opening status, sorting, location, grouped facet filters, result count, image cards, quick view, bookmarks, pagination, map switch.
- `/explore/`: shared filters and cards, markers and clusters, viewport searching, fullscreen, zoom, geolocation; mobile switches list/map and opens filter dialog.
- `/listing/[slug]/`: description, amenities, food, drinks, seating, takeaway options, opening hours, map, contact/social links, categories/tags, updated date, gallery, bookmark/share, claim/suggest actions.
- Reviews: Overall, Quality, Variety, Price, Service, Atmosphere; photos and message. Rebuild requires verified membership and one editable review per brewery.
- `/faq/`: taxonomy definitions with category tabs; editable introduction.
- `/contact-drinkable/`: name, email, subject, message.
- `/my-account/`: sign in, registration, password recovery. Rebuild uses email/password plus configurable Google sign-in.
- `/add-listing/`: rebuild removes package selection and leads to a moderated brewery submission.
- Claims require an account. Suggestions capture corrections and supporting evidence.

## Intentional differences

No events, checkout, paid packages, or Facebook login. MapLibre/MapTiler replaces Google Maps. Production starts empty. Development breweries are fictional. Authentication-protected owner/admin screens were not accessible during inspection; new screens extend the same typography, surfaces, and controls.

Do not reproduce blank mobile results, PHP notices, missing glyphs, broken consent placeholders, or inaccessible controls. Reference screenshots are in `screenshots/`.
