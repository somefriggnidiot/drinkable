import type { PoolClient } from "pg";
import { pool } from "@/db";
import { AppError } from "@/lib/errors";
import { isStaff, staffOnly, adminOnly } from "@/lib/access";
import { brewerySchema, reviewSchema } from "./validation";
import type { Member, Profile } from "./types";
import { z } from "zod";

export async function transaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function audit(
  client: PoolClient,
  member: Member,
  action: string,
  target: string,
  detail: unknown = {},
) {
  await client.query(
    "INSERT INTO audit(actor_id,action,target,detail) VALUES($1,$2,$3,$4)",
    [member.id, action, target, JSON.stringify(detail)],
  );
}
async function validateProfile(
  client: PoolClient,
  profile: Profile,
  member: Member,
  previous?: Profile,
) {
  for (const [category, slugs] of Object.entries(profile.facets)) {
    if (!slugs?.length) continue;
    const result = await client.query(
      "SELECT slug FROM taxonomy WHERE category=$1 AND slug=ANY($2::text[]) FOR KEY SHARE",
      [category, slugs],
    );
    if (new Set(result.rows.map((r) => r.slug)).size !== new Set(slugs).size)
      throw new AppError(
        400,
        "One of the selected categories is no longer available. Refresh and try again.",
      );
  }
  const old = new Set(
    previous ? [previous.cover, previous.logo, ...previous.gallery] : [],
  );
  const urls = [profile.cover, profile.logo, ...profile.gallery].filter(
    (url) => url.startsWith("/media/") && !old.has(url),
  );
  for (const url of urls) {
    const id = url.split("/")[2];
    const result = await client.query(
      "SELECT user_id,status FROM media WHERE id=$1",
      [id],
    );
    if (
      !result.rows[0] ||
      result.rows[0].status !== "ready" ||
      (!isStaff(member) && result.rows[0].user_id !== member.id)
    )
      throw new AppError(400, "Choose one of your completed image uploads.");
  }
}
export async function createBrewery(member: Member, input: unknown) {
  const data = brewerySchema.parse(input);
  return transaction(async (client) => {
    await validateProfile(client, data.profile, member);
    const result = await client.query(
      `INSERT INTO brewery(name,slug,profile,location,submitted_by,status)
      VALUES($1,$2,$3,ST_SetSRID(ST_MakePoint($4,$5),4326),$6,$7) RETURNING id`,
      [
        data.name,
        data.slug,
        JSON.stringify(data.profile),
        data.profile.longitude,
        data.profile.latitude,
        member.id,
        isStaff(member) ? "published" : "pending",
      ],
    );
    const id = result.rows[0].id as string;
    await audit(client, member, "brewery.submit", id);
    return {
      id,
      slug: data.slug,
      status: isStaff(member) ? "published" : "pending",
    };
  });
}
export async function updateBrewery(
  member: Member,
  id: string,
  input: unknown,
) {
  const data = brewerySchema
    .extend({
      version: z.number().int().min(1),
      status: z
        .enum(["pending", "published", "rejected", "archived"])
        .optional(),
    })
    .parse(input);
  return transaction(async (client) => {
    const result = await client.query(
      "SELECT * FROM brewery WHERE id=$1 FOR UPDATE",
      [id],
    );
    const before = result.rows[0];
    if (!before) throw new AppError(404, "Brewery not found.");
    const ownership = await client.query(
      "SELECT 1 FROM ownership WHERE brewery_id=$1 AND user_id=$2",
      [id, member.id],
    );
    if (!isStaff(member) && !ownership.rowCount)
      throw new AppError(403, "You do not manage this brewery.");
    if (before.version !== data.version)
      throw new AppError(
        409,
        "This listing changed since you opened it. Reload before saving to avoid overwriting another edit.",
      );
    if (data.status && data.status !== before.status && !isStaff(member))
      throw new AppError(403, "Only staff can change publication status.");
    await validateProfile(client, data.profile, member, before.profile);
    await client.query(
      "INSERT INTO revision(brewery_id,actor_id,version,snapshot) VALUES($1,$2,$3,$4)",
      [
        id,
        member.id,
        before.version,
        JSON.stringify({
          name: before.name,
          slug: before.slug,
          profile: before.profile,
          status: before.status,
        }),
      ],
    );
    await client.query(
      `UPDATE brewery SET name=$2,slug=$3,profile=$4,location=ST_SetSRID(ST_MakePoint($5,$6),4326),status=$7,version=version+1,updated_at=now() WHERE id=$1`,
      [
        id,
        data.name,
        data.slug,
        JSON.stringify(data.profile),
        data.profile.longitude,
        data.profile.latitude,
        data.status || before.status,
      ],
    );
    await audit(client, member, "brewery.update", id, {
      fromVersion: before.version,
    });
    return { id, slug: data.slug, version: before.version + 1 };
  });
}
export async function restoreBrewery(
  member: Member,
  id: string,
  revisionId: string,
  version: number,
) {
  staffOnly(member);
  const { rows } = await pool.query(
    "SELECT snapshot FROM revision WHERE id=$1 AND brewery_id=$2",
    [revisionId, id],
  );
  if (!rows[0]) throw new AppError(404, "Revision not found.");
  return updateBrewery(member, id, { ...rows[0].snapshot, version });
}
export async function resolveClaim(
  member: Member,
  id: string,
  approve: boolean,
) {
  staffOnly(member);
  return transaction(async (client) => {
    const initial = await client.query(
      "SELECT brewery_id FROM claim WHERE id=$1",
      [id],
    );
    if (!initial.rows[0]) throw new AppError(404, "Claim not found.");
    // Lock the brewery before claims to serialize competing approvals without a deadlock.
    await client.query("SELECT id FROM brewery WHERE id=$1 FOR UPDATE", [
      initial.rows[0].brewery_id,
    ]);
    const { rows } = await client.query(
      "SELECT * FROM claim WHERE id=$1 FOR UPDATE",
      [id],
    );
    const claim = rows[0];
    if (claim.status !== "pending")
      throw new AppError(409, "This claim has already been resolved.");
    if (approve) {
      const existing = await client.query(
        "SELECT 1 FROM ownership WHERE brewery_id=$1",
        [claim.brewery_id],
      );
      if (existing.rowCount)
        throw new AppError(
          409,
          "This brewery already has an owner. Review its ownership before approving another claim.",
        );
      await client.query(
        "INSERT INTO ownership(brewery_id,user_id) VALUES($1,$2)",
        [claim.brewery_id, claim.user_id],
      );
      await client.query(
        "UPDATE claim SET status='rejected',resolved_by=$2 WHERE brewery_id=$1 AND id<>$3 AND status='pending'",
        [claim.brewery_id, member.id, id],
      );
    }
    await client.query(
      "UPDATE claim SET status=$2,resolved_by=$3 WHERE id=$1",
      [id, approve ? "approved" : "rejected", member.id],
    );
    await audit(client, member, approve ? "claim.approve" : "claim.reject", id);
    return { ok: true };
  });
}
export async function saveReview(
  member: Member,
  breweryId: string,
  input: unknown,
) {
  const data = reviewSchema.parse(input);
  return transaction(async (client) => {
    const brewery = await client.query(
      "SELECT 1 FROM brewery WHERE id=$1 AND status='published'",
      [breweryId],
    );
    if (!brewery.rowCount) throw new AppError(404, "Brewery not found.");
    for (const url of data.photos) {
      if (!url.startsWith("/media/"))
        throw new AppError(400, "Upload your review photos first.");
      const media = await client.query(
        "SELECT 1 FROM media WHERE id=$1 AND user_id=$2 AND status='ready'",
        [url.split("/")[2], member.id],
      );
      if (!media.rowCount)
        throw new AppError(400, "Choose one of your completed uploads.");
    }
    const { rows } = await client.query(
      `INSERT INTO review(brewery_id,user_id,ratings,message,photos) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(brewery_id,user_id) DO UPDATE SET ratings=EXCLUDED.ratings,message=EXCLUDED.message,photos=EXCLUDED.photos,updated_at=now()
      RETURNING id,hidden`,
      [
        breweryId,
        member.id,
        JSON.stringify(data.ratings),
        data.message,
        data.photos,
      ],
    );
    await audit(client, member, "review.save", rows[0].id);
    return rows[0] as { id: string; hidden: boolean };
  });
}
export async function setUserAccess(
  member: Member,
  userId: string,
  role: Member["role"],
  disabled: boolean,
) {
  adminOnly(member);
  return transaction(async (client) => {
    // A single advisory lock protects the last-admin invariant across different user rows.
    await client.query("SELECT pg_advisory_xact_lock(479113)");
    const { rows } = await client.query(
      "SELECT * FROM app_user WHERE id=$1 FOR UPDATE",
      [userId],
    );
    if (!rows[0]) throw new AppError(404, "Account not found.");
    if (rows[0].role === "admin" && (role !== "admin" || disabled)) {
      const admins = await client.query(
        "SELECT 1 FROM app_user WHERE role='admin' AND NOT disabled AND id<>$1",
        [userId],
      );
      if (!admins.rowCount)
        throw new AppError(409, "Keep at least one active administrator.");
    }
    await client.query(
      "UPDATE app_user SET role=$2,disabled=$3,updated_at=now() WHERE id=$1",
      [userId, role, disabled],
    );
    if (disabled)
      await client.query("DELETE FROM auth_session WHERE user_id=$1", [userId]);
    await audit(client, member, "user.access", userId, { role, disabled });
    return { ok: true };
  });
}
export async function setReviewVisibility(
  member: Member,
  id: string,
  hidden: boolean,
) {
  staffOnly(member);
  return transaction(async (client) => {
    const result = await client.query(
      "UPDATE review SET hidden=$2 WHERE id=$1 RETURNING id",
      [id, hidden],
    );
    if (!result.rowCount) throw new AppError(404, "Review not found.");
    await client.query(
      "UPDATE review_report SET resolved=true WHERE review_id=$1",
      [id],
    );
    await audit(client, member, hidden ? "review.hide" : "review.restore", id);
    return { ok: true };
  });
}
export async function listReviews(breweryId: string, memberId?: string) {
  const { rows } = await pool.query(
    `SELECT r.id,r.brewery_id AS "breweryId",r.user_id AS "userId",u.name AS author,r.ratings,r.message,r.photos,r.hidden,
    r.created_at AS "createdAt",r.updated_at AS "updatedAt" FROM review r JOIN app_user u ON u.id=r.user_id WHERE r.brewery_id=$1 AND (NOT r.hidden OR r.user_id=$2) ORDER BY r.created_at DESC`,
    [breweryId, memberId || null],
  );
  return rows;
}
export type BreweryInput = z.infer<typeof brewerySchema>;
