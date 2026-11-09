import { z } from "zod";
import { pool } from "@/db";
import {
  requireMember,
  staffOnly,
  adminOnly,
  checkOrigin,
  isStaff,
} from "./access";
import { errorResponse, AppError } from "./errors";
import { rateLimit } from "./rate-limit";
import { readJson } from "./body";
import {
  searchBreweries,
  findBrewery,
  getTaxonomies,
  getSponsors,
} from "@/domain/search";
import {
  createBrewery,
  updateBrewery,
  saveReview,
  resolveClaim,
  restoreBrewery,
  listReviews,
  setUserAccess,
  setReviewVisibility,
  transaction,
  audit,
} from "@/domain/mutations";
import {
  contactSchema,
  suggestionSchema,
  claimSchema,
  uuid,
  mediaUrl,
} from "@/domain/validation";
import { facetGroups } from "@/domain/types";
import { uploadMedia } from "@/domain/media";
import { enqueueEmail } from "@/jobs/queue";

const json = (value: unknown, status = 200) => Response.json(value, { status });
export async function api(request: Request, segments: string[]) {
  try {
    checkOrigin(request);
    const [resource, id, action] = segments;
    const method = request.method;
    const url = new URL(request.url);
    if (resource === "health") {
      await pool.query("SELECT 1 FROM brewery LIMIT 1");
      const worker = await pool.query(
        "SELECT touched_at>now()-interval '2 minutes' AS healthy FROM worker_heartbeat WHERE id=1",
      );
      return json({
        status: "ok",
        worker: worker.rows[0]?.healthy ? "ok" : "unavailable",
      });
    }
    if (resource === "breweries" && method === "GET") {
      if (!id) return json(await searchBreweries(url.searchParams));
      const brewery = await findBrewery(id);
      if (!brewery) throw new AppError(404, "Brewery not found.");
      return json(
        action === "reviews" ? await listReviews(brewery.id) : brewery,
      );
    }
    if (resource === "taxonomies" && method === "GET")
      return json(await getTaxonomies());
    if (resource === "sponsors" && method === "GET")
      return json(await getSponsors());
    if (resource === "sponsors" && id && method === "POST") {
      uuid.parse(id);
      await rateLimit(request, `sponsor:${id}`, undefined, 120);
      const data = z
        .object({ event: z.enum(["impression", "click"]) })
        .parse(await readJson(request));
      await pool.query(
        "UPDATE sponsorship SET impressions=impressions+CASE WHEN $2='impression' THEN 1 ELSE 0 END,clicks=clicks+CASE WHEN $2='click' THEN 1 ELSE 0 END WHERE id=$1 AND enabled AND starts_at<=now() AND ends_at>now()",
        [id, data.event],
      );
      return json({ ok: true });
    }
    if (resource === "geocode" && method === "GET") {
      const query = z
        .string()
        .trim()
        .min(2)
        .max(200)
        .parse(url.searchParams.get("q"));
      await rateLimit(request, "geocode", undefined, 120);
      const key =
        process.env.MAPTILER_KEY || process.env.NEXT_PUBLIC_MAPTILER_KEY;
      if (!key)
        throw new AppError(
          503,
          "Location suggestions are unavailable. Search by city or address instead.",
        );
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${encodeURIComponent(key)}&country=us&limit=5`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!response.ok)
        throw new AppError(
          503,
          "Location suggestions are temporarily unavailable.",
        );
      const data = await response.json();
      return json({
        items: data.features.map(
          (f: { place_name: string; center: [number, number] }) => ({
            label: f.place_name,
            longitude: f.center[0],
            latitude: f.center[1],
          }),
        ),
      });
    }
    if (resource === "content" && method === "GET") {
      const { rows } = await pool.query(
        "SELECT * FROM content_page WHERE slug=$1",
        [id],
      );
      if (!rows[0]) throw new AppError(404, "Page not found.");
      return json(rows[0]);
    }
    if (resource === "contact" && method === "POST") {
      await rateLimit(request, "contact", undefined, 5);
      const data = contactSchema.parse(await readJson(request));
      await pool.query(
        "INSERT INTO contact_message(name,email,subject,message) VALUES($1,$2,$3,$4)",
        [data.name, data.email, data.subject, data.message],
      );
      if (process.env.STAFF_EMAIL)
        await enqueueEmail(
          process.env.STAFF_EMAIL,
          "New Drinkable contact message",
          "A new contact message is waiting in the staff inbox.",
        );
      return json({ ok: true }, 201);
    }
    if (resource === "suggestions" && id && method === "POST") {
      uuid.parse(id);
      await rateLimit(request, "suggestion", undefined, 5);
      const data = suggestionSchema.parse(await readJson(request));
      const b = await findBrewery(id);
      if (!b) throw new AppError(404, "Brewery not found.");
      await pool.query(
        "INSERT INTO suggestion(brewery_id,email,message,evidence) VALUES($1,$2,$3,$4)",
        [id, data.email, data.message, data.evidence],
      );
      return json({ ok: true }, 201);
    }
    const member = await requireMember(request.headers);
    if (method !== "GET")
      await rateLimit(request, resource, member.id, isStaff(member) ? 120 : 30);
    if (resource === "account") {
      if (method === "PATCH") {
        const data = z
          .object({
            name: z.string().trim().min(2).max(100),
            image: mediaUrl.optional(),
          })
          .parse(await readJson(request));
        if (data.image?.startsWith("/media/")) {
          const image = await pool.query(
            "SELECT 1 FROM media WHERE id=$1 AND user_id=$2 AND status='ready'",
            [data.image.split("/")[2], member.id],
          );
          if (!image.rowCount)
            throw new AppError(400, "Choose one of your completed uploads.");
        }
        await pool.query(
          "UPDATE app_user SET name=$2,image=COALESCE($3,image),updated_at=now() WHERE id=$1",
          [member.id, data.name, data.image ?? null],
        );
        return json({ ok: true });
      }
      if (method === "GET") {
        const [bookmarks, reviews, owned, claims, submissions] =
          await Promise.all([
            pool.query(
              "SELECT b.id,b.name,b.slug,b.profile FROM bookmark f JOIN brewery b ON b.id=f.brewery_id WHERE f.user_id=$1 AND b.status='published' ORDER BY f.created_at DESC",
              [member.id],
            ),
            pool.query(
              "SELECT r.*,b.name,b.slug FROM review r JOIN brewery b ON b.id=r.brewery_id WHERE r.user_id=$1 ORDER BY r.updated_at DESC",
              [member.id],
            ),
            pool.query(
              "SELECT b.* FROM brewery b JOIN ownership o ON o.brewery_id=b.id WHERE o.user_id=$1 ORDER BY b.name",
              [member.id],
            ),
            pool.query(
              "SELECT c.*,b.name FROM claim c JOIN brewery b ON b.id=c.brewery_id WHERE c.user_id=$1 ORDER BY c.created_at DESC",
              [member.id],
            ),
            pool.query(
              "SELECT id,name,slug,status FROM brewery WHERE submitted_by=$1 ORDER BY created_at DESC",
              [member.id],
            ),
          ]);
        return json({
          member,
          bookmarks: bookmarks.rows,
          reviews: reviews.rows,
          owned: owned.rows,
          claims: claims.rows,
          submissions: submissions.rows,
        });
      }
    }
    if (resource === "media") {
      if (method === "POST")
        return json(await uploadMedia(request, member), 202);
      if (id && method === "GET") {
        uuid.parse(id);
        const { rows } = await pool.query(
          "SELECT id,status,alt FROM media WHERE id=$1 AND user_id=$2",
          [id, member.id],
        );
        if (!rows[0]) throw new AppError(404, "Upload not found.");
        return json({ ...rows[0], url: `/media/${id}/image.webp` });
      }
    }
    if (resource === "breweries") {
      if (!id && method === "POST")
        return json(await createBrewery(member, await readJson(request)), 201);
      uuid.parse(id);
      if (method === "PATCH")
        return json(await updateBrewery(member, id, await readJson(request)));
    }
    if (resource === "bookmarks" && id) {
      uuid.parse(id);
      if (method === "PUT") {
        if (!(await findBrewery(id)))
          throw new AppError(404, "Brewery not found.");
        await pool.query(
          "INSERT INTO bookmark(user_id,brewery_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [member.id, id],
        );
        return json({ saved: true });
      }
      if (method === "DELETE") {
        await pool.query(
          "DELETE FROM bookmark WHERE user_id=$1 AND brewery_id=$2",
          [member.id, id],
        );
        return json({ saved: false });
      }
    }
    if (resource === "reviews" && id) {
      uuid.parse(id);
      if (method === "PUT")
        return json(await saveReview(member, id, await readJson(request)));
      if (method === "DELETE") {
        await transaction(async (c) => {
          const r = await c.query(
            "SELECT id FROM review WHERE brewery_id=$1 AND user_id=$2 FOR UPDATE",
            [id, member.id],
          );
          if (r.rows[0]) {
            await c.query("DELETE FROM review_report WHERE review_id=$1", [
              r.rows[0].id,
            ]);
            await c.query("DELETE FROM review WHERE id=$1", [r.rows[0].id]);
            await audit(c, member, "review.delete", r.rows[0].id);
          }
        });
        return json({ ok: true });
      }
    }
    if (resource === "reports" && id && method === "POST") {
      uuid.parse(id);
      const data = z
        .object({ reason: z.string().trim().min(10).max(2000) })
        .parse(await readJson(request));
      const review = await pool.query(
        "SELECT 1 FROM review WHERE id=$1 AND NOT hidden",
        [id],
      );
      if (!review.rowCount) throw new AppError(404, "Review not found.");
      await pool.query(
        "INSERT INTO review_report(review_id,user_id,reason) VALUES($1,$2,$3) ON CONFLICT(review_id,user_id) DO UPDATE SET reason=EXCLUDED.reason,resolved=false",
        [id, member.id, data.reason],
      );
      return json({ ok: true }, 201);
    }
    if (resource === "claims" && id && method === "POST") {
      uuid.parse(id);
      const data = claimSchema.parse(await readJson(request));
      if (!(await findBrewery(id)))
        throw new AppError(404, "Brewery not found.");
      const owners = await pool.query(
        "SELECT 1 FROM ownership WHERE brewery_id=$1",
        [id],
      );
      if (owners.rowCount)
        throw new AppError(
          409,
          "This brewery is already managed. Contact staff for help with ownership.",
        );
      await pool.query(
        "INSERT INTO claim(brewery_id,user_id,evidence) VALUES($1,$2,$3)",
        [id, member.id, data.evidence],
      );
      return json({ ok: true }, 201);
    }
    if (resource === "admin") {
      staffOnly(member);
      if (method === "GET") {
        const selects: Record<string, string> = {
          breweries:
            "SELECT b.id,b.name,b.slug,b.status,b.version,b.updated_at FROM brewery b ORDER BY b.updated_at DESC LIMIT 200",
          claims:
            "SELECT c.*,b.name AS brewery,u.email FROM claim c JOIN brewery b ON b.id=c.brewery_id JOIN app_user u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 200",
          reports:
            "SELECT f.*,r.message,r.hidden,r.brewery_id,b.name AS brewery FROM review_report f JOIN review r ON r.id=f.review_id JOIN brewery b ON b.id=r.brewery_id ORDER BY f.resolved,f.created_at DESC LIMIT 200",
          reviews:
            "SELECT r.*,u.name AS author,b.name AS brewery FROM review r JOIN app_user u ON u.id=r.user_id JOIN brewery b ON b.id=r.brewery_id ORDER BY r.updated_at DESC LIMIT 200",
          suggestions:
            "SELECT s.*,b.name AS brewery FROM suggestion s JOIN brewery b ON b.id=s.brewery_id ORDER BY s.resolved,s.created_at DESC LIMIT 200",
          contacts:
            "SELECT * FROM contact_message ORDER BY resolved,created_at DESC LIMIT 200",
          taxonomies: "SELECT * FROM taxonomy ORDER BY category,label",
          pages: "SELECT * FROM content_page ORDER BY slug",
          sponsorships:
            "SELECT s.*,b.name AS brewery FROM sponsorship s JOIN brewery b ON b.id=s.brewery_id ORDER BY s.starts_at DESC LIMIT 200",
          ownership:
            "SELECT o.*,u.email,b.name AS brewery FROM ownership o JOIN app_user u ON u.id=o.user_id JOIN brewery b ON b.id=o.brewery_id ORDER BY b.name",
          users:
            "SELECT id,name,email,email_verified,role,disabled FROM app_user ORDER BY created_at DESC LIMIT 200",
          audit:
            "SELECT a.*,u.name AS actor FROM audit a LEFT JOIN app_user u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 200",
        };
        if (id === "users") adminOnly(member);
        if (id === "brewery" && action) {
          uuid.parse(action);
          return json(await findBrewery(action, true));
        }
        if (id === "revisions" && action) {
          uuid.parse(action);
          return json(
            (
              await pool.query(
                "SELECT r.*,u.name AS actor FROM revision r JOIN app_user u ON u.id=r.actor_id WHERE brewery_id=$1 ORDER BY version DESC",
                [action],
              )
            ).rows,
          );
        }
        if (!selects[id]) throw new AppError(404, "Section not found.");
        const page = z.coerce
          .number()
          .int()
          .min(1)
          .max(10000)
          .parse(url.searchParams.get("page") || 1);
        const statement = selects[id].replace(/ LIMIT 200$/, "");
        return json(
          (
            await pool.query(`${statement} LIMIT $1 OFFSET $2`, [
              100,
              (page - 1) * 100,
            ])
          ).rows,
        );
      }
      const data = await readJson(request);
      if (id === "claims" && action && method === "PATCH")
        return json(
          await resolveClaim(
            member,
            uuid.parse(action),
            z.object({ approve: z.boolean() }).parse(data).approve,
          ),
        );
      if (id === "reviews" && action && method === "PATCH")
        return json(
          await setReviewVisibility(
            member,
            uuid.parse(action),
            z.object({ hidden: z.boolean() }).parse(data).hidden,
          ),
        );
      if (id === "restore" && action && method === "POST") {
        const d = z
          .object({ revisionId: uuid, version: z.number().int().positive() })
          .parse(data);
        return json(
          await restoreBrewery(
            member,
            uuid.parse(action),
            d.revisionId,
            d.version,
          ),
        );
      }
      if (id === "users" && action && method === "PATCH") {
        const d = z
          .object({
            role: z.enum(["member", "staff", "admin"]),
            disabled: z.boolean(),
          })
          .parse(data);
        return json(await setUserAccess(member, action, d.role, d.disabled));
      }
      return json(
        await transaction(async (client) => {
          if (
            ["suggestions", "contacts", "reports"].includes(id) &&
            method === "PATCH"
          ) {
            const d = z.object({ resolved: z.boolean() }).parse(data);
            uuid.parse(action);
            const table = {
              suggestions: "suggestion",
              contacts: "contact_message",
              reports: "review_report",
            }[id]!;
            await client.query(`UPDATE ${table} SET resolved=$2 WHERE id=$1`, [
              action,
              d.resolved,
            ]);
          } else if (id === "pages" && action && method === "PUT") {
            const d = z
              .object({
                title: z.string().trim().min(1).max(200),
                body: z.string().max(40000),
                version: z.number().int(),
              })
              .parse(data);
            const result = await client.query(
              "UPDATE content_page SET title=$2,body=$3,version=version+1,updated_at=now() WHERE slug=$1 AND version=$4 RETURNING slug",
              [action, d.title, d.body, d.version],
            );
            if (!result.rowCount)
              throw new AppError(
                409,
                "This page changed. Reload before saving.",
              );
          } else if (id === "taxonomies") {
            if (method === "POST") {
              const d = z
                .object({
                  category: z.enum(facetGroups),
                  slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
                  label: z.string().min(1).max(100),
                  description: z.string().max(2000),
                })
                .parse(data);
              await client.query(
                "INSERT INTO taxonomy(category,slug,label,description) VALUES($1,$2,$3,$4)",
                [d.category, d.slug, d.label, d.description],
              );
            } else if (method === "PATCH" && action) {
              uuid.parse(action);
              const d = z
                .object({
                  label: z.string().min(1).max(100),
                  description: z.string().max(2000),
                })
                .parse(data);
              await client.query(
                "UPDATE taxonomy SET label=$2,description=$3 WHERE id=$1",
                [action, d.label, d.description],
              );
            } else if (method === "DELETE" && action) {
              uuid.parse(action);
              await client.query(
                "SELECT id FROM taxonomy WHERE id=$1 FOR UPDATE",
                [action],
              );
              const used = await client.query(
                "SELECT 1 FROM brewery b JOIN taxonomy t ON b.profile->'facets'->t.category ? t.slug WHERE t.id=$1 LIMIT 1",
                [action],
              );
              if (used.rowCount)
                throw new AppError(
                  409,
                  "Remove this term from listings before deleting it.",
                );
              await client.query("DELETE FROM taxonomy WHERE id=$1", [action]);
            } else throw new AppError(405, "Method not allowed.");
          } else if (id === "sponsorships") {
            if (method === "POST") {
              const d = z
                .object({
                  breweryId: uuid,
                  startsAt: z.iso.datetime({ offset: true }),
                  endsAt: z.iso.datetime({ offset: true }),
                })
                .refine(
                  (d) => new Date(d.endsAt) > new Date(d.startsAt),
                  "End must follow start",
                )
                .parse(data);
              if (!(await findBrewery(d.breweryId)))
                throw new AppError(400, "Sponsor a published brewery.");
              await client.query(
                "INSERT INTO sponsorship(brewery_id,starts_at,ends_at) VALUES($1,$2,$3)",
                [d.breweryId, d.startsAt, d.endsAt],
              );
            } else if (method === "PATCH" && action) {
              uuid.parse(action);
              const d = z.object({ enabled: z.boolean() }).parse(data);
              await client.query(
                "UPDATE sponsorship SET enabled=$2 WHERE id=$1",
                [action, d.enabled],
              );
            } else throw new AppError(405, "Method not allowed.");
          } else if (id === "ownership" && method === "DELETE") {
            const d = z
              .object({ breweryId: uuid, userId: z.string().min(1) })
              .parse(data);
            await client.query(
              "DELETE FROM ownership WHERE brewery_id=$1 AND user_id=$2",
              [d.breweryId, d.userId],
            );
          } else throw new AppError(404, "Action not found.");
          await audit(
            client,
            member,
            `staff.${id}.${method.toLowerCase()}`,
            action || id,
          );
          return { ok: true };
        }),
      );
    }
    throw new AppError(404, "Endpoint not found.");
  } catch (error) {
    return errorResponse(error);
  }
}
