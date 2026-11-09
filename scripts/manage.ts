import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pool } from "../src/db/index";
import {
  defaultTaxonomies,
  slugify,
  taxonomyDescriptions,
  blankProfile,
} from "../src/domain/defaults";
import { auth } from "../src/lib/auth";
import { jobs } from "../src/jobs/queue";

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(479112)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migration(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const file of (await readdir(resolve("migrations")))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const source = await readFile(resolve("migrations", file), "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      const exists = await client.query(
        "SELECT checksum FROM schema_migration WHERE name=$1",
        [file],
      );
      if (exists.rows[0]) {
        if (exists.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${file}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(source);
        await client.query(
          "INSERT INTO schema_migration(name,checksum) VALUES($1,$2)",
          [file, checksum],
        );
        await client.query("COMMIT");
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    for (const [category, labels] of Object.entries(defaultTaxonomies))
      for (const label of labels) {
        const slug = slugify(label);
        await client.query(
          "INSERT INTO taxonomy(category,slug,label,description) VALUES($1,$2,$3,$4) ON CONFLICT(category,slug) DO NOTHING",
          [category, slug, label, taxonomyDescriptions[slug] || ""],
        );
      }
    const pages = [
      [
        "faq",
        "Frequently Asked Questions",
        "Drinkable City helps you find breweries, brewpubs, and taprooms around Kansas City and nearby regions. Filter by the things that matter to you, then check the brewery’s own website for current details.\n\nHave a correction? Use Suggest An Edit on the brewery page. Business owners can claim a listing to manage it after verification.",
      ],
      [
        "privacy-policy",
        "Privacy Policy",
        "Drinkable City stores the account information you provide, your reviews, bookmarks, uploaded photos, and messages to staff. We use essential session cookies to keep you signed in.\n\nGoogle sign-in is optional. Maps and location suggestions use MapTiler. Your browser asks permission before sharing your precise location.\n\nAdvertising is provided through Google AdSense when configured and permitted by your consent choices. Sponsored brewery placements are labeled separately. Change optional-cookie preferences through Cookie settings in the footer.\n\nBrewery listings and published reviews are public. Contact messages and ownership evidence are available to staff. Uploaded public photos are processed to remove embedded metadata.\n\nFor access, correction, or deletion requests, contact support@drinkable.city. Staff can help you manage your records and account.",
      ],
      [
        "terms",
        "Terms of Use",
        "Use Drinkable City to discover breweries and share honest experiences. Listing information may change; confirm opening hours and offerings with the brewery before visiting.\n\nYou retain ownership of your submitted content and permit Drinkable City to display it as part of the directory. Upload only photos and information you have permission to share. Do not post abuse, deceptive reviews, private personal information, or unlawful material. Staff may remove content that violates these terms.\n\nVerified members may leave one editable review per brewery. Brewery ownership claims are reviewed by staff. Approved owners may update assigned listings immediately; revisions are retained for staff review and recovery.\n\nSponsored placements and advertisements are identified. Sponsorship does not change the organic rating of a brewery.\n\nQuestions or corrections can be sent through the contact page.",
      ],
    ];
    for (const [slug, title, body] of pages)
      await client.query(
        "INSERT INTO content_page(slug,title,body) VALUES($1,$2,$3) ON CONFLICT(slug) DO NOTHING",
        [slug, title, body],
      );
  } finally {
    await client.query("SELECT pg_advisory_unlock(479112)");
    client.release();
  }
}
async function createUser(
  email: string,
  name: string,
  password: string,
  role = "member",
) {
  const existing = await pool.query(
    "SELECT id FROM app_user WHERE lower(email)=lower($1)",
    [email],
  );
  let id = existing.rows[0]?.id as string | undefined;
  if (!id) {
    const result = await auth.api.signUpEmail({
      body: { email, name, password },
    });
    id = result.user.id;
  }
  await pool.query(
    "UPDATE app_user SET email_verified=true,role=$2,disabled=false WHERE id=$1",
    [id, role],
  );
  return id;
}
async function seed() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development fixtures cannot be seeded in production.");
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 10)
    throw new Error(
      "Set DEMO_PASSWORD to at least 10 characters before explicitly seeding development fixtures.",
    );
  await migrate();
  const ownerId = await createUser(
    "owner@example.test",
    "Demo brewery owner",
    password,
  );
  await createUser("member@example.test", "Demo member", password);
  await createUser("staff@example.test", "Demo staff", password, "staff");
  await createUser(
    "admin@example.test",
    "Demo administrator",
    password,
    "admin",
  );
  const names = [
    "River Market Brewing",
    "Crossroads Brew House",
    "Westside Taproom",
    "Prairie Lantern Brewery",
    "Northland Beer Works",
    "Maple Street Brewing",
    "Walnut Grove Brewpub",
    "Union Station Taproom",
    "Blue River Brewing",
    "Meadowlark Beer Company",
    "Summit Ridge Brewery",
    "Old Mill Brew House",
    "Cedar Creek Taproom",
    "Brookside Brewing",
    "Stonebridge Beer Works",
    "Heartland Brewery",
  ];
  for (const [index, name] of names.entries()) {
    const profile = {
      ...blankProfile(),
      description: `${name} is a fictional development listing for testing Drinkable City. Discover a neighborhood gathering place with craft beer and friendly company.\n\nThis record is sample data and does not represent a real business.`,
      address: `${100 + index * 37} Main Street, Kansas City, MO`,
      city: "Kansas City",
      region: "MO",
      postalCode: "64108",
      latitude: 39.02 + (index % 4) * 0.035,
      longitude: -94.66 + Math.floor(index / 4) * 0.045,
      cover: "/brand/bar.jpeg",
      hours: {
        "0": [{ open: "12:00", close: "20:00" }],
        "1": [],
        "2": [{ open: "14:00", close: "22:00" }],
        "3": [{ open: "14:00", close: "22:00" }],
        "4": [{ open: "14:00", close: "22:00" }],
        "5": [{ open: "12:00", close: "23:00" }],
        "6": [{ open: "12:00", close: "23:00" }],
      },
      facets: {
        category: [
          index % 3 === 0 ? "brewpub" : index % 3 === 1 ? "brewery" : "taproom",
        ],
        amenities:
          index % 2 === 0
            ? ["family-friendly", "free-wifi"]
            : ["pet-friendly", "games-tabletop"],
        food:
          index % 3 === 0
            ? ["restaurant", "full-dining-menu"]
            : ["outside-food-welcome"],
        drinks: ["seltzers", "ciders"],
        seating: ["main-bar", "tables", "outdoor-seating-uncovered"],
        takeaway: ["crowlers"],
        tags: ["locally-owned"],
      },
    };
    const { rows } = await pool.query(
      "INSERT INTO brewery(name,slug,profile,location,status) VALUES($1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326),'published') ON CONFLICT(slug) DO UPDATE SET slug=EXCLUDED.slug RETURNING id",
      [
        name,
        slugify(name),
        JSON.stringify(profile),
        profile.longitude,
        profile.latitude,
      ],
    );
    if (index === 0)
      await pool.query(
        "INSERT INTO ownership(brewery_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [rows[0].id, ownerId],
      );
  }
  console.log(
    "Development fixtures ready. Accounts: member@example.test, owner@example.test, staff@example.test, admin@example.test. Password is the supplied DEMO_PASSWORD.",
  );
}
const command = process.argv[2];
try {
  if (command === "migrate") await migrate();
  else if (command === "seed") await seed();
  else if (command === "admin") {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 10)
      throw new Error(
        "Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 10 characters).",
      );
    await migrate();
    await createUser(email, "Administrator", password, "admin");
    console.log(
      "Administrator account is ready. Existing account passwords are unchanged.",
    );
  } else throw new Error("Usage: manage migrate | seed | admin");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (command !== "migrate") {
    try {
      await (await jobs()).stop();
    } catch {}
  }
  await pool.end();
}
