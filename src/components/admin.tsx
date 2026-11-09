"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, errorMessage } from "@/lib/client";
import { facetGroups, facetLabels } from "@/domain/types";
import { Dialog } from "./dialog";
import styles from "./ui.module.css";
import { adminSections } from "@/domain/admin";
type RecordRow = Record<string, unknown>;
function text(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
export function Admin({
  section,
  rows,
  admin,
  page = 1,
}: {
  section: string;
  rows: RecordRow[];
  admin: boolean;
  page?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<RecordRow | null>(null);
  async function change(path: string, method: string, data: unknown) {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch(path, { method, body: JSON.stringify(data) });
      setEditing(null);
      setMessage("Changes saved.");
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (section === "taxonomies")
      await change(
        `/api/admin/taxonomies${editing?.id ? `/${editing.id}` : ""}`,
        editing?.id ? "PATCH" : "POST",
        data,
      );
    else if (section === "pages")
      await change(`/api/admin/pages/${editing?.slug}`, "PUT", {
        ...data,
        version: editing?.version,
      });
    else if (section === "sponsorships")
      await change("/api/admin/sponsorships", "POST", {
        breweryId: data.breweryId,
        startsAt: new Date(String(data.startsAt)).toISOString(),
        endsAt: new Date(String(data.endsAt)).toISOString(),
      });
    else if (section === "users")
      await change(`/api/admin/users/${editing?.id}`, "PATCH", {
        role: data.role,
        disabled: data.disabled === "on",
      });
  }
  const headings: Record<string, string> = {
    breweries: "Brewery listings",
    claims: "Ownership claims",
    reports: "Review reports",
    reviews: "All reviews",
    suggestions: "Suggested edits",
    contacts: "Contact inbox",
    taxonomies: "Directory categories",
    pages: "Informational pages",
    sponsorships: "Sponsored placements",
    ownership: "Brewery owners",
    users: "Accounts and permissions",
    audit: "Audit history",
  };
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.sectionTitle}>
        <h1>{headings[section] || "Staff administration"}</h1>
        <Link href="/my-account/dashboard/">My account</Link>
      </div>
      <div className={styles.adminLayout}>
        <nav aria-label="Staff administration" className={styles.adminNav}>
          {adminSections
            .filter((s) => admin || s !== "users")
            .map((s) => (
              <Link
                href={`/admin/?section=${s}`}
                aria-current={section === s ? "page" : undefined}
                key={s}
              >
                {s}
              </Link>
            ))}
        </nav>
        <section>
          <div className={styles.actions} style={{ marginBottom: 20 }}>
            {section === "breweries" && (
              <Link href="/admin/breweries/new/" className={styles.primary}>
                Add brewery
              </Link>
            )}
            {["taxonomies", "sponsorships"].includes(section) && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => setEditing({})}
              >
                Add {section === "taxonomies" ? "category term" : "sponsorship"}
              </button>
            )}
          </div>
          {message && (
            <p role="status" className={styles.notice}>
              {message}
            </p>
          )}
          <div className={styles.adminRecords}>
            {!rows.length && (
              <div className={styles.panel}>No records in this section.</div>
            )}
            {rows.map((row, index) => {
              const id = String(row.id || row.slug || index);
              const title = String(
                row.name ||
                  row.brewery ||
                  row.title ||
                  row.label ||
                  row.email ||
                  row.action ||
                  "Record",
              );
              return (
                <article className={styles.adminRecord} key={id}>
                  <h2>{title}</h2>
                  <dl>
                    {Object.entries(row)
                      .filter(
                        ([key]) =>
                          ![
                            "id",
                            "profile",
                            "snapshot",
                            "ratings",
                            "photos",
                            "user_id",
                            "brewery_id",
                            "review_id",
                            "actor_id",
                            "resolved_by",
                          ].includes(key),
                      )
                      .map(([key, value]) => (
                        <div key={key} style={{ display: "contents" }}>
                          <dt>{key.replaceAll("_", " ")}</dt>
                          <dd>{text(value)}</dd>
                        </div>
                      ))}
                  </dl>
                  <div className={styles.actions}>
                    {section === "breweries" && (
                      <Link
                        className={styles.secondary}
                        href={`/admin/breweries/${id}/`}
                      >
                        Edit listing
                      </Link>
                    )}
                    {section === "claims" && row.status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            change(`/api/admin/claims/${id}`, "PATCH", {
                              approve: true,
                            })
                          }
                        >
                          Approve claim
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            change(`/api/admin/claims/${id}`, "PATCH", {
                              approve: false,
                            })
                          }
                        >
                          Reject claim
                        </button>
                      </>
                    )}
                    {(section === "reports" || section === "reviews") && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          change(
                            `/api/admin/reviews/${section === "reports" ? row.review_id : id}`,
                            "PATCH",
                            { hidden: !row.hidden },
                          )
                        }
                      >
                        {row.hidden ? "Restore review" : "Hide review"}
                      </button>
                    )}
                    {["reports", "suggestions", "contacts"].includes(
                      section,
                    ) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          change(`/api/admin/${section}/${id}`, "PATCH", {
                            resolved: !row.resolved,
                          })
                        }
                      >
                        {row.resolved ? "Reopen" : "Mark resolved"}
                      </button>
                    )}
                    {section === "suggestions" && (
                      <Link
                        className={styles.secondary}
                        href={`/admin/breweries/${row.brewery_id}/`}
                      >
                        Edit brewery
                      </Link>
                    )}
                    {["taxonomies", "pages", "users"].includes(section) && (
                      <button type="button" onClick={() => setEditing(row)}>
                        Edit {section === "users" ? "access" : "record"}
                      </button>
                    )}
                    {section === "taxonomies" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          change(`/api/admin/taxonomies/${id}`, "DELETE", {})
                        }
                      >
                        Delete unused term
                      </button>
                    )}
                    {section === "sponsorships" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          change(`/api/admin/sponsorships/${id}`, "PATCH", {
                            enabled: !row.enabled,
                          })
                        }
                      >
                        {row.enabled ? "Disable placement" : "Enable placement"}
                      </button>
                    )}
                    {section === "ownership" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          change("/api/admin/ownership", "DELETE", {
                            breweryId: row.brewery_id,
                            userId: row.user_id,
                          })
                        }
                      >
                        Revoke ownership
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <nav className={styles.pagination} aria-label="Staff records pages">
            {page > 1 && (
              <Link href={`/admin/?section=${section}&page=${page - 1}`}>
                Previous
              </Link>
            )}
            <span>Page {page}</span>
            {rows.length >= 100 && (
              <Link href={`/admin/?section=${section}&page=${page + 1}`}>
                Next
              </Link>
            )}
          </nav>
        </section>
      </div>
      {editing && (
        <Dialog
          title={
            section === "pages"
              ? "Edit page"
              : section === "users"
                ? "Edit account access"
                : section === "taxonomies"
                  ? "Category term"
                  : "Sponsored placement"
          }
          onClose={() => setEditing(null)}
        >
          <form className={styles.form} onSubmit={save}>
            {section === "taxonomies" && (
              <>
                {!editing.id && (
                  <>
                    <label>
                      Category
                      <select name="category">
                        {facetGroups.map((group) => (
                          <option value={group} key={group}>
                            {facetLabels[group]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      URL slug
                      <input
                        name="slug"
                        pattern="[a-z0-9-]+"
                        maxLength={80}
                        required
                      />
                    </label>
                  </>
                )}
                <label>
                  Label
                  <input
                    name="label"
                    defaultValue={String(editing.label || "")}
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    defaultValue={String(editing.description || "")}
                    maxLength={2000}
                  />
                </label>
              </>
            )}
            {section === "pages" && (
              <>
                <label>
                  Title
                  <input
                    name="title"
                    defaultValue={String(editing.title || "")}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  Content
                  <textarea
                    name="body"
                    defaultValue={String(editing.body || "")}
                    rows={15}
                    maxLength={40000}
                  />
                </label>
              </>
            )}
            {section === "sponsorships" && (
              <>
                <label>
                  Published brewery ID
                  <input name="breweryId" required pattern="[0-9a-f-]{36}" />
                </label>
                <p className={styles.fieldHelp}>
                  Copy the brewery ID from its staff editor URL. Placement dates
                  use your browser’s local time.
                </p>
                <label>
                  Starts
                  <input type="datetime-local" name="startsAt" required />
                </label>
                <label>
                  Ends
                  <input type="datetime-local" name="endsAt" required />
                </label>
              </>
            )}
            {section === "users" && (
              <>
                <p>{String(editing.email)}</p>
                <label>
                  Role
                  <select name="role" defaultValue={String(editing.role)}>
                    <option value="member">Member</option>
                    <option value="staff">Staff moderator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name="disabled"
                    defaultChecked={Boolean(editing.disabled)}
                  />
                  Disable account and revoke sessions
                </label>
              </>
            )}
            <button type="submit" disabled={busy} className={styles.primary}>
              {busy ? "Saving…" : "Save"}
            </button>
            {message && (
              <p role="status" className={styles.notice}>
                {message}
              </p>
            )}
          </form>
        </Dialog>
      )}
    </main>
  );
}
