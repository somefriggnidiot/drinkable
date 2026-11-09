import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { facetGroups, type Brewery, type Taxonomy } from "./types";
import { openingStatus } from "./hours";
import { AppError } from "@/lib/errors";

export const querySchema = z
  .object({
    q: z.string().trim().max(150).default(""),
    location: z.string().max(250).default(""),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(1).max(500).default(10),
    open: z.enum(["0", "1"]).default("0"),
    sort: z.enum(["updated", "rating", "latest", "random"]).default("updated"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    seed: z.string().max(80).default("drinkable"),
    bounds: z
      .string()
      .regex(/^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/)
      .optional(),
  })
  .refine(
    (v) => (v.lat === undefined) === (v.lng === undefined),
    "Provide both location coordinates",
  );
export function parseSearch(params: URLSearchParams) {
  const query = querySchema.parse(Object.fromEntries(params));
  const facets = Object.fromEntries(
    facetGroups.map((group) => [
      group,
      params
        .getAll(group)
        .flatMap((v) => v.split(","))
        .filter(Boolean),
    ]),
  );
  for (const values of Object.values(facets))
    z.array(z.string().regex(/^[a-z0-9-]{1,80}$/))
      .max(40)
      .parse(values);
  return { ...query, facets };
}
export const breweryColumns = sql`b.id,b.slug,b.name,b.profile,b.status,b.version,b.created_at AS "createdAt",b.updated_at AS "updatedAt",
  (SELECT avg((r.ratings->>'overall')::numeric)::float FROM review r WHERE r.brewery_id=b.id AND NOT r.hidden) AS rating,
  (SELECT count(*)::int FROM review r WHERE r.brewery_id=b.id AND NOT r.hidden) AS "reviewCount"`;
export async function searchBreweries(params = new URLSearchParams()) {
  const query = parseSearch(params);
  const conditions = [sql`b.status='published'`];
  if (query.q)
    conditions.push(
      sql`(b.name ILIKE ${`%${query.q}%`} OR b.profile->>'address' ILIKE ${`%${query.q}%`} OR b.profile->>'description' ILIKE ${`%${query.q}%`})`,
    );
  if (query.lat !== undefined && query.lng !== undefined)
    conditions.push(
      sql`ST_DWithin(b.location::geography, ST_SetSRID(ST_MakePoint(${query.lng},${query.lat}),4326)::geography,${query.radius * 1609.344})`,
    );
  else if (query.location)
    conditions.push(
      sql`(b.profile->>'address' ILIKE ${`%${query.location}%`} OR b.profile->>'city' ILIKE ${`%${query.location}%`})`,
    );
  for (const group of facetGroups)
    if (query.facets[group].length)
      conditions.push(
        sql`b.profile->'facets'->${group} ?| ARRAY[${sql.join(
          query.facets[group].map((value) => sql`${value}`),
          sql`, `,
        )}]::text[]`,
      );
  if (query.bounds) {
    const [west, south, east, north] = z
      .tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ])
      .parse(query.bounds.split(",").map(Number));
    if (south > north) throw new AppError(400, "Invalid map bounds");
    conditions.push(
      west <= east
        ? sql`b.location && ST_MakeEnvelope(${west},${south},${east},${north},4326)`
        : sql`(b.location && ST_MakeEnvelope(${west},${south},180,${north},4326) OR b.location && ST_MakeEnvelope(-180,${south},${east},${north},4326))`,
    );
  }
  const order =
    query.sort === "rating"
      ? sql`rating DESC NULLS LAST,b.name,b.id`
      : query.sort === "latest"
        ? sql`b.created_at DESC,b.id`
        : query.sort === "random"
          ? sql`md5(b.id::text || ${query.seed})`
          : sql`b.updated_at DESC,b.id`;
  const result = await db.execute(
    sql`SELECT ${breweryColumns} FROM brewery b WHERE ${sql.join(conditions, sql` AND `)} ORDER BY ${order}`,
  );
  const all = (result.rows as unknown as Brewery[]).filter(
    (b) => query.open !== "1" || openingStatus(b.profile).state === "open",
  );
  const pageSize = 12;
  const page = Math.min(
    query.page,
    Math.max(1, Math.ceil(all.length / pageSize)),
  );
  return {
    items: all.slice((page - 1) * pageSize, page * pageSize),
    markers: all.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      latitude: b.profile.latitude,
      longitude: b.profile.longitude,
      category: b.profile.facets.category?.[0],
    })),
    total: all.length,
    page,
    pageSize,
  };
}
export type SearchResult = Awaited<ReturnType<typeof searchBreweries>>;
export async function findBrewery(
  slugOrId: string,
  includePrivate = false,
): Promise<Brewery | null> {
  const result = await db.execute(
    sql`SELECT ${breweryColumns} FROM brewery b WHERE (b.slug=${slugOrId} OR b.id::text=${slugOrId}) ${includePrivate ? sql`` : sql`AND b.status='published'`} LIMIT 1`,
  );
  return (result.rows[0] as unknown as Brewery) || null;
}
export async function getTaxonomies(): Promise<Taxonomy[]> {
  const result = await db.execute(
    sql`SELECT * FROM taxonomy ORDER BY category,label`,
  );
  return result.rows as unknown as Taxonomy[];
}
export async function getSponsors(): Promise<Brewery[]> {
  const result = await db.execute(
    sql`SELECT ${breweryColumns}, s.id AS "campaignId" FROM sponsorship s JOIN brewery b ON b.id=s.brewery_id WHERE s.enabled AND s.starts_at<=now() AND s.ends_at>now() AND b.status='published' ORDER BY s.starts_at DESC LIMIT 3`,
  );
  return result.rows as unknown as Brewery[];
}

export async function getBookmarkedBreweryIds(
  userId?: string,
): Promise<string[]> {
  if (!userId) return [];
  const result = await db.execute(
    sql`SELECT brewery_id FROM bookmark WHERE user_id=${userId}`,
  );
  return result.rows.map((row) => String(row.brewery_id));
}
