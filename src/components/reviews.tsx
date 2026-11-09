"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ratingDimensions,
  type Member,
  type Ratings,
  type Review,
} from "@/domain/types";
import { apiFetch, errorMessage } from "@/lib/client";
import { Upload } from "./upload";
import { Dialog } from "./dialog";
import { SupportForm } from "./support-form";
import styles from "./ui.module.css";
export function Reviews({
  breweryId,
  reviews,
  member,
}: {
  breweryId: string;
  reviews: Review[];
  member: Member | null;
}) {
  const router = useRouter();
  const own = reviews.find((r) => r.userId === member?.id);
  const [report, setReport] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>(own?.photos || []);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const ratings = Object.fromEntries(
      ratingDimensions.map((d) => [d, Number(data.get(d))]),
    ) as Ratings;
    try {
      const result = await apiFetch<{ hidden: boolean }>(
        `/api/reviews/${breweryId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ratings,
            message: data.get("message"),
            photos,
          }),
        },
      );
      setMessage(
        result.hidden
          ? "Your update was saved. This review remains hidden while staff review it."
          : "Your review has been published.",
      );
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await apiFetch(`/api/reviews/${breweryId}`, { method: "DELETE" });
      setMessage("Your review was removed.");
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel} aria-label="Brewery reviews">
      <h2>Reviews</h2>
      {!reviews.length && <p>No reviews yet. Tell us about your visit.</p>}
      {reviews.map((review) => (
        <article key={review.id} className={styles.review}>
          <div className={styles.reviewHeader}>
            <strong>{review.author}</strong>
            <p>
              <span aria-label={`${review.ratings.overall} out of 5 stars`}>
                ★ {review.ratings.overall.toFixed(1)}
              </span>{" "}
              ·{" "}
              <small>
                {new Date(review.createdAt).toLocaleDateString("en-US", {
                  timeZone: "America/Chicago",
                })}
              </small>
            </p>
          </div>
          {review.hidden && (
            <p className={styles.notice}>
              This review is hidden from other visitors.
            </p>
          )}
          <p className={styles.prose}>{review.message}</p>
          <div className={styles.ratingsSummary}>
            {ratingDimensions
              .filter((d) => d !== "overall")
              .map((d) => (
                <span key={d}>
                  {d}: {review.ratings[d]}/5
                </span>
              ))}
          </div>
          <div className={styles.reviewPhotos}>
            {review.photos.map((url) => (
              <a href={url} key={url} target="_blank" rel="noreferrer">
                <img
                  src={url}
                  alt={`Photo from ${review.author}’s visit`}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
          <div className={styles.reviewTools}>
            {member && review.userId !== member.id && (
              <button type="button" onClick={() => setReport(review.id)}>
                Report abuse
              </button>
            )}
            {review.userId === member?.id && (
              <a href="#review-form">Edit your review</a>
            )}
          </div>
        </article>
      ))}
      <div id="review-form" className={styles.editorSection}>
        <h3>{own ? "Edit your review" : "Add a review"}</h3>
        {!member ? (
          <p>
            <Link href="/my-account/">Sign in or register</Link> with a verified
            email to leave a review.
          </p>
        ) : (
          <form className={styles.form} onSubmit={save}>
            <div className={styles.ratingGrid}>
              {ratingDimensions.map((d) => (
                <label key={d}>
                  {d}
                  <select name={d} defaultValue={own?.ratings[d] || 5} required>
                    {Array.from({ length: 10 }, (_, i) => 5 - i * 0.5).map(
                      (value) => (
                        <option value={value} key={value}>
                          {value} / 5
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ))}
            </div>
            <label>
              Your message
              <textarea
                name="message"
                defaultValue={own?.message || ""}
                required
                minLength={10}
                maxLength={5000}
              />
            </label>
            <div className={styles.editorGallery}>
              {photos.map((url) => (
                <div key={url}>
                  <img src={url} alt="Your review photo" />
                  <button
                    className={styles.smallButton}
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((x) => x !== url))}
                  >
                    Remove photo
                  </button>
                </div>
              ))}
            </div>
            {photos.length < 5 && (
              <Upload
                label="Add a review photo"
                onReady={(url) => setPhotos((p) => [...p, url].slice(0, 5))}
              />
            )}
            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={busy}>
                {busy ? "Saving…" : own ? "Update review" : "Publish review"}
              </button>
              {own && (
                <button type="button" onClick={remove} disabled={busy}>
                  Delete your review
                </button>
              )}
            </div>
          </form>
        )}
        {message && (
          <p role="status" className={styles.notice}>
            {message}
          </p>
        )}
      </div>
      {report && (
        <Dialog title="Report a review" onClose={() => setReport(null)}>
          <SupportForm kind="report" breweryId={report} />
        </Dialog>
      )}
    </section>
  );
}
