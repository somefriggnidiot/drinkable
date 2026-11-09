"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import type { Brewery } from "@/domain/types";
import { openingStatus } from "@/domain/hours";
import { apiFetch, errorMessage } from "@/lib/client";
import { useHydrated } from "@/lib/use-hydrated";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import styles from "./ui.module.css";
export function BookmarkButton({
  breweryId,
  initial = false,
  compact = false,
}: {
  breweryId: string;
  initial?: boolean;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const ready = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle() {
    setBusy(true);
    setMessage("");
    try {
      const data = await apiFetch<{ saved: boolean }>(
        `/api/bookmarks/${breweryId}`,
        { method: saved ? "DELETE" : "PUT" },
      );
      setSaved(data.saved);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={compact ? styles.roundButton : styles.actionButton}
        onClick={toggle}
        disabled={busy || !ready}
        aria-pressed={saved}
        aria-label={saved ? "Remove bookmark" : "Bookmark brewery"}
      >
        <Icon name="heart" />
        {!compact && (saved ? "Bookmarked" : "Bookmark")}
      </button>
      {message && (
        <Dialog title="Bookmark brewery" onClose={() => setMessage("")}>
          <p role="alert">{message}</p>
          <Link className={styles.primary} href="/my-account/">
            Sign in or register
          </Link>
        </Dialog>
      )}
    </>
  );
}
export function BreweryCard({
  brewery,
  sponsored = false,
  bookmarked = false,
}: {
  brewery: Brewery;
  sponsored?: boolean;
  bookmarked?: boolean;
}) {
  const [quick, setQuick] = useState(false);
  const state = openingStatus(brewery.profile).state;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!sponsored || !brewery.campaignId || !ref.current) return;
    const campaignId = brewery.campaignId;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void apiFetch(`/api/sponsors/${campaignId}`, {
            method: "POST",
            body: JSON.stringify({ event: "impression" }),
          }).catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [sponsored, brewery.campaignId]);
  return (
    <article ref={ref} className={styles.breweryCard}>
      <Link
        href={`/listing/${brewery.slug}/`}
        className={styles.cardImage}
        onClick={() => {
          if (sponsored && brewery.campaignId)
            void apiFetch(`/api/sponsors/${brewery.campaignId}`, {
              method: "POST",
              keepalive: true,
              body: JSON.stringify({ event: "click" }),
            }).catch(() => {});
        }}
      >
        <img
          src={brewery.profile.cover || "/brand/bar.jpeg"}
          alt=""
          loading="lazy"
        />
        <span className={styles.cardStatus}>
          {state === "unknown" ? "Hours unavailable" : state.toUpperCase()}
        </span>
        {sponsored && <span className={styles.sponsorLabel}>Sponsored</span>}
        <div className={styles.cardCaption}>
          <h2>{brewery.name}</h2>
          <p>
            <Icon name="pin" />
            {brewery.profile.address}
          </p>
          {brewery.rating !== null && (
            <small>
              ★ {Number(brewery.rating).toFixed(1)} · {brewery.reviewCount}{" "}
              reviews
            </small>
          )}
        </div>
      </Link>
      <div className={styles.cardTools}>
        <button
          type="button"
          className={styles.roundButton}
          onClick={() => setQuick(true)}
          aria-label={`Quick view ${brewery.name}`}
        >
          <Icon name="search" />
        </button>
        <BookmarkButton breweryId={brewery.id} initial={bookmarked} compact />
        <Link
          className={styles.roundButton}
          href={`/listing/${brewery.slug}/`}
          aria-label={`View ${brewery.name}`}
        >
          <Icon name="add" />
        </Link>
      </div>
      {quick && (
        <Dialog title={brewery.name} onClose={() => setQuick(false)}>
          <img
            className={styles.quickImage}
            src={brewery.profile.cover || "/brand/bar.jpeg"}
            alt=""
          />
          <p>{brewery.profile.address}</p>
          <p className={styles.prose}>
            {brewery.profile.description.slice(0, 500)}
          </p>
          <p>
            {state === "unknown"
              ? "Opening hours unavailable"
              : state === "open"
                ? "Open now"
                : "Closed now"}
          </p>
          <Link className={styles.primary} href={`/listing/${brewery.slug}/`}>
            View brewery
          </Link>
        </Dialog>
      )}
    </article>
  );
}
