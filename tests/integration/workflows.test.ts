import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import type { Member } from "../../src/domain/types";
import { blankProfile } from "../../src/domain/defaults";
const connection = process.env.TEST_DATABASE_URL;
if (!connection || !new URL(connection).pathname.endsWith("_test"))
  throw new Error(
    "Set TEST_DATABASE_URL to a dedicated database ending in _test and migrate it first.",
  );
process.env.DATABASE_URL = connection;
process.env.BETTER_AUTH_SECRET = "test-only-secret-at-least-32-characters";
const { pool } = await import("../../src/db/index");
const {
  createBrewery,
  updateBrewery,
  resolveClaim,
  saveReview,
  setReviewVisibility,
  setUserAccess,
  restoreBrewery,
} = await import("../../src/domain/mutations");
const { searchBreweries, findBrewery } =
  await import("../../src/domain/search");
const member = (role: Member["role"] = "member"): Member => ({
  id: randomUUID(),
  name: `Test ${role}`,
  email: `${randomUUID()}@example.test`,
  emailVerified: true,
  role,
  disabled: false,
});
const admin = member("admin"),
  staff = member("staff"),
  owner = member(),
  other = member();
let id: string;
const profile = {
  ...blankProfile(),
  address: "123 Main Street, Kansas City, MO",
  city: "Kansas City",
  region: "MO",
  facets: { amenities: ["family-friendly", "free-wifi"], food: ["restaurant"] },
};
beforeAll(async () => {
  await pool.query("TRUNCATE app_user,brewery CASCADE");
  for (const m of [admin, staff, owner, other])
    await pool.query(
      "INSERT INTO app_user(id,name,email,email_verified,role) VALUES($1,$2,$3,true,$4)",
      [m.id, m.name, m.email, m.role],
    );
});
afterAll(async () => {
  await pool.end();
});
describe("real PostgreSQL/PostGIS workflows", () => {
  it("keeps a member submission private until staff approve it", async () => {
    const created = await createBrewery(owner, {
      name: "Integration Brewery",
      slug: `test-${randomUUID()}`,
      profile,
    });
    id = created.id;
    expect(await findBrewery(id)).toBeNull();
    const pending = (await findBrewery(id, true))!;
    await updateBrewery(staff, id, {
      name: pending.name,
      slug: pending.slug,
      profile,
      status: "published",
      version: pending.version,
    });
    expect((await findBrewery(id))?.status).toBe("published");
  });
  it("approves ownership and rejects competing pending claims", async () => {
    const first = await pool.query(
      "INSERT INTO claim(brewery_id,user_id,evidence) VALUES($1,$2,'Official business contact and ownership evidence') RETURNING id",
      [id, owner.id],
    );
    const second = await pool.query(
      "INSERT INTO claim(brewery_id,user_id,evidence) VALUES($1,$2,'Competing business contact and ownership evidence') RETURNING id",
      [id, other.id],
    );
    await resolveClaim(staff, first.rows[0].id, true);
    expect(
      (
        await pool.query("SELECT status FROM claim WHERE id=$1", [
          second.rows[0].id,
        ])
      ).rows[0].status,
    ).toBe("rejected");
    await expect(
      resolveClaim(staff, second.rows[0].id, true),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("rejects unauthorized edits and stale versions", async () => {
    const brewery = (await findBrewery(id))!;
    const input = {
      name: brewery.name,
      slug: brewery.slug,
      profile,
      version: brewery.version,
    };
    await expect(updateBrewery(other, id, input)).rejects.toMatchObject({
      status: 403,
    });
    await updateBrewery(owner, id, { ...input, name: "Owner Updated Brewery" });
    await expect(updateBrewery(owner, id, input)).rejects.toMatchObject({
      status: 409,
    });
    expect((await findBrewery(id))?.name).toBe("Owner Updated Brewery");
  });
  it("uses OR within a facet group and AND across groups with geospatial filtering", async () => {
    const params = new URLSearchParams({
      q: "Owner Updated",
      amenities: "family-friendly,pet-friendly",
      food: "restaurant",
      lat: "39.0997",
      lng: "-94.5786",
      radius: "10",
    });
    expect((await searchBreweries(params)).items.some((b) => b.id === id)).toBe(
      true,
    );
    params.set("food", "food-trucks-regular");
    expect((await searchBreweries(params)).total).toBe(0);
    params.delete("food");
    params.set("lat", "33.4");
    expect((await searchBreweries(params)).total).toBe(0);
  });
  it("keeps one review per member and preserves staff hiding across edits", async () => {
    const data = {
      ratings: {
        overall: 4,
        quality: 4,
        variety: 4,
        price: 4,
        service: 4,
        atmosphere: 4,
      },
      message: "A thoughtful review of my brewery visit.",
      photos: [],
    };
    const first = await saveReview(other, id, data);
    await saveReview(other, id, {
      ...data,
      message: "An updated review of my brewery visit.",
    });
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM review WHERE brewery_id=$1 AND user_id=$2",
          [id, other.id],
        )
      ).rows[0].n,
    ).toBe(1);
    await setReviewVisibility(staff, first.id, true);
    await saveReview(other, id, data);
    expect((await findBrewery(id))?.reviewCount).toBe(0);
    await setReviewVisibility(staff, first.id, false);
    expect((await findBrewery(id))?.rating).toBe(4);
  });
  it("restores a previous revision without reusing version numbers", async () => {
    const current = (await findBrewery(id))!;
    const revisions = await pool.query(
      "SELECT * FROM revision WHERE brewery_id=$1 ORDER BY version DESC",
      [id],
    );
    await restoreBrewery(staff, id, revisions.rows[0].id, current.version);
    const restored = (await findBrewery(id))!;
    expect(restored.version).toBe(current.version + 1);
    expect(restored.name).toBe("Integration Brewery");
  });
  it("prevents staff from escalating access or removing the last administrator", async () => {
    await expect(
      setUserAccess(staff, other.id, "admin", false),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      setUserAccess(admin, admin.id, "member", false),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("returns stable random ordering and markers beyond the current page", async () => {
    const a = await searchBreweries(
      new URLSearchParams({ sort: "random", seed: "stable" }),
    );
    const b = await searchBreweries(
      new URLSearchParams({ sort: "random", seed: "stable" }),
    );
    expect(a.markers).toEqual(b.markers);
    expect(a.markers.length).toBe(a.total);
  });
});
