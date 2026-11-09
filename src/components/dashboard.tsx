"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Member } from "@/domain/types";
import { authClient } from "@/lib/auth-client";
import { apiFetch, errorMessage } from "@/lib/client";
import { Upload } from "./upload";
import styles from "./ui.module.css";
type Item = { id: string; name: string; slug: string; status?: string };
export function Dashboard({
  member,
  bookmarks,
  owned,
  submissions,
  reviews,
  claims,
}: {
  member: Member;
  bookmarks: Item[];
  owned: Item[];
  submissions: Item[];
  reviews: {
    id: string;
    name: string;
    slug: string;
    message: string;
    hidden: boolean;
  }[];
  claims: { id: string; name: string; status: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState(member.image || "");
  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/api/account", {
        method: "PATCH",
        body: JSON.stringify({
          name: new FormData(event.currentTarget).get("name"),
          ...(image !== member.image ? { image } : {}),
        }),
      });
      setMessage("Your profile was updated.");
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: String(data.get("current")),
        newPassword: String(data.get("new")),
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      form.reset();
      setMessage("Password changed. Other sessions have been signed out.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.sectionTitle}>
        <h1>My account</h1>
        <p>Welcome, {member.name}</p>
      </div>
      <nav className={styles.dashboardNav}>
        <a href="#saved">Saved breweries</a>
        <a href="#listings">My listings</a>
        <a href="#settings">Settings</a>
        {(member.role === "staff" || member.role === "admin") && (
          <Link href="/admin/">Staff administration</Link>
        )}
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      </nav>
      <div className={styles.dashboardGrid}>
        <section className={styles.panel} id="saved">
          <h2>Saved breweries</h2>
          {bookmarks.length ? (
            <ul className={styles.recordList}>
              {bookmarks.map((b) => (
                <li key={b.id}>
                  <Link href={`/listing/${b.slug}/`}>{b.name}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              You haven’t bookmarked any breweries yet.{" "}
              <Link href="/browse/">Find a brewery</Link>.
            </p>
          )}
        </section>
        <section className={styles.panel} id="listings">
          <h2>My listings</h2>
          {owned.length ? (
            <ul className={styles.recordList}>
              {owned.map((b) => (
                <li key={b.id}>
                  <Link href={`/my-account/listings/${b.id}/`}>{b.name}</Link> ·{" "}
                  {b.status}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              You don’t manage any breweries yet. Claim a brewery from its
              listing page or submit a new location.
            </p>
          )}
          <p style={{ marginTop: 20 }}>
            <Link className={styles.primary} href="/add-listing/">
              Add a Brewery
            </Link>
          </p>
        </section>
        <section className={styles.panel}>
          <h2>My reviews</h2>
          {reviews.length ? (
            <ul className={styles.recordList}>
              {reviews.map((r) => (
                <li key={r.id}>
                  <Link href={`/listing/${r.slug}/?reviews=1`}>{r.name}</Link>
                  {r.hidden && " · Hidden"}
                  <p>{r.message.slice(0, 180)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Your published reviews will appear here.</p>
          )}
        </section>
        <section className={styles.panel}>
          <h2>Submissions and ownership claims</h2>
          <ul className={styles.recordList}>
            {submissions.map((b) => (
              <li key={b.id}>
                {b.name} · {b.status}
              </li>
            ))}
            {claims.map((c) => (
              <li key={c.id}>
                {c.name} · Claim {c.status}
              </li>
            ))}
          </ul>
          {!submissions.length && !claims.length && (
            <p>You have no pending submissions or claims.</p>
          )}
        </section>
        <section className={styles.panel} id="settings">
          <h2>Profile settings</h2>
          <p>{member.email} · Verified</p>
          <form onSubmit={saveProfile} className={styles.form}>
            <label>
              Display name
              <input
                name="name"
                defaultValue={member.name}
                required
                minLength={2}
                maxLength={100}
              />
            </label>
            {image && (
              <img
                src={image}
                alt="Your profile"
                width="90"
                height="90"
                style={{ objectFit: "cover" }}
              />
            )}
            <Upload label="Profile photo" onReady={setImage} />
            <button type="submit" className={styles.primary} disabled={busy}>
              Save profile
            </button>
          </form>
        </section>
        <section className={styles.panel}>
          <h2>Change password</h2>
          <form className={styles.form} onSubmit={password}>
            <label>
              Current password
              <input
                name="current"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              New password
              <input
                name="new"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </label>
            <button type="submit" className={styles.primary} disabled={busy}>
              Change password
            </button>
          </form>
          <p className={styles.fieldHelp}>
            If you joined with Google, use the password reset page to set a
            password first.
          </p>
        </section>
      </div>
      {message && (
        <p role="status" className={styles.notice}>
          {message}
        </p>
      )}
    </main>
  );
}
