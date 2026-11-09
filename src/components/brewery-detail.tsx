"use client";
import Link from "next/link";
import { useState } from "react";
import {
  facetGroups,
  facetLabels,
  type Brewery,
  type Taxonomy,
  type Member,
  type Review,
} from "@/domain/types";
import { openingStatus, formatHours } from "@/domain/hours";
import { BookmarkButton } from "./brewery-card";
import { BreweryMap } from "./brewery-map";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import { SupportForm } from "./support-form";
import { Reviews } from "./reviews";
import { AdSlot } from "./consent";
import styles from "./ui.module.css";
export function BreweryDetail({
  brewery,
  taxonomies,
  reviews,
  member,
  bookmarked,
  canEdit,
  initialReviews = false,
}: {
  brewery: Brewery;
  taxonomies: Taxonomy[];
  reviews: Review[];
  member: Member | null;
  bookmarked: boolean;
  canEdit: boolean;
  initialReviews?: boolean;
}) {
  const [tab, setTab] = useState(initialReviews ? "reviews" : "about");
  const [modal, setModal] = useState<"claim" | "suggestion" | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [share, setShare] = useState("");
  const { profile } = brewery;
  const hours = openingStatus(profile);
  const directions = `https://www.openstreetmap.org/directions?to=${profile.latitude}%2C${profile.longitude}`;
  async function shareListing() {
    try {
      if (navigator.share)
        await navigator.share({
          title: brewery.name,
          url: window.location.href,
        });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShare("Link copied.");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        setShare("Copy this page’s address to share the brewery.");
    }
  }
  const markers = [
    {
      id: brewery.id,
      slug: brewery.slug,
      name: brewery.name,
      latitude: profile.latitude,
      longitude: profile.longitude,
      category: profile.facets.category?.[0],
    },
  ];
  return (
    <main id="main-content">
      <section className={styles.detailHero}>
        <img src={profile.cover || "/brand/bar.jpeg"} alt="" />
        <div className={styles.detailHeroContent}>
          <h1>{brewery.name}</h1>
          <div className={styles.actions}>
            <a
              className={styles.primary}
              href={directions}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="pin" />
              Get Directions
            </a>
            <button
              type="button"
              className={styles.primary}
              onClick={() => setTab("reviews")}
            >
              <Icon name="edit" />
              Write a Review
            </button>
          </div>
        </div>
      </section>
      <div
        role="tablist"
        aria-label="Brewery information"
        className={styles.tabs}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "about"}
          aria-controls="brewery-about"
          id="tab-about"
          onClick={() => setTab("about")}
        >
          About
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          aria-controls="brewery-reviews"
          id="tab-reviews"
          onClick={() => setTab("reviews")}
        >
          Reviews ({brewery.reviewCount})
        </button>
      </div>
      <div className={styles.page}>
        <div className={styles.detailActions}>
          <BookmarkButton breweryId={brewery.id} initial={bookmarked} />
          {profile.website && (
            <a
              className={styles.actionButton}
              href={profile.website}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="link" />
              Website
            </a>
          )}
          {profile.email && (
            <a className={styles.actionButton} href={`mailto:${profile.email}`}>
              <Icon name="email" />
              Email
            </a>
          )}
          {profile.phone && (
            <a
              className={styles.actionButton}
              href={`tel:${profile.phone.replace(/[^+\d]/g, "")}`}
            >
              <Icon name="phone" />
              Call
            </a>
          )}
          <button
            type="button"
            className={styles.actionButton}
            onClick={shareListing}
          >
            <Icon name="share" />
            Share
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setModal("claim")}
          >
            <Icon name="check" />
            Claim listing
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setModal("suggestion")}
          >
            <Icon name="edit" />
            Suggest An Edit
          </button>
          {canEdit && (
            <Link
              className={styles.actionButton}
              href={`/my-account/listings/${brewery.id}/`}
            >
              Manage listing
            </Link>
          )}
        </div>
        {share && (
          <p role="status" className={styles.notice}>
            {share}
          </p>
        )}
        {tab === "about" ? (
          <div
            className={styles.detailGrid}
            role="tabpanel"
            id="brewery-about"
            aria-labelledby="tab-about"
          >
            <div>
              {profile.description && (
                <section className={styles.panel}>
                  <h2>
                    <Icon name="edit" />
                    Description
                  </h2>
                  <div
                    className={`${styles.prose} ${styles.detailDescription}`}
                  >
                    {profile.description}
                  </div>
                </section>
              )}
              {profile.gallery.length > 0 && (
                <section className={styles.panel}>
                  <h2>
                    <Icon name="photo" />
                    Photo gallery
                  </h2>
                  <div className={styles.gallery}>
                    {profile.gallery.map((url, index) => (
                      <button
                        type="button"
                        key={url}
                        onClick={() => setPhoto(url)}
                        aria-label={`Open brewery photo ${index + 1}`}
                      >
                        <img
                          src={url}
                          alt={`${brewery.name}, photo ${index + 1}`}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {facetGroups
                .filter((g) => !["category", "tags"].includes(g))
                .map((group) =>
                  profile.facets[group]?.length ? (
                    <section key={group} className={styles.panel}>
                      <h2>
                        <Icon
                          name={
                            group === "food"
                              ? "food"
                              : group === "drinks"
                                ? "drink"
                                : "check"
                          }
                        />
                        {facetLabels[group]}
                      </h2>
                      <div className={styles.facetList}>
                        {profile.facets[group]!.map((slug) => (
                          <Link key={slug} href={`/browse/?${group}=${slug}`}>
                            <Icon name="check" />
                            {taxonomies.find(
                              (t) => t.category === group && t.slug === slug,
                            )?.label || slug}
                          </Link>
                        ))}
                      </div>
                    </section>
                  ) : null,
                )}
            </div>
            <aside>
              <section className={styles.panel}>
                <details>
                  <summary className={styles.hoursStatus}>
                    <strong className={styles[hours.state]}>
                      <Icon name="clock" />
                      {hours.state === "unknown"
                        ? "Hours unavailable"
                        : hours.state === "open"
                          ? "Open"
                          : "Closed"}
                    </strong>
                    {hours.state !== "unknown" && (
                      <span>Today: {formatHours(hours.today)}</span>
                    )}
                  </summary>
                  <dl className={styles.hoursList}>
                    {[
                      "Sunday",
                      "Monday",
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                    ].map((day, index) => (
                      <div key={day}>
                        <dt>{day}</dt>
                        <dd>
                          {profile.hours[index]
                            ? formatHours(profile.hours[index])
                            : "Not provided"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className={styles.fieldHelp}>
                    Local time zone: {profile.timezone}. Holiday hours may vary.
                  </p>
                </details>
              </section>
              <AdSlot placement="detail" />
              <section className={styles.panel}>
                <h2>
                  <Icon name="map" />
                  Location
                </h2>
                <div className={styles.detailMap}>
                  <BreweryMap markers={markers} selectedId={brewery.id} />
                </div>
                <p>{profile.address}</p>
                <a
                  className={styles.secondary}
                  href={directions}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get Directions
                </a>
              </section>
              {Object.values(profile.socials).some(Boolean) && (
                <section className={styles.panel}>
                  <h2>Social networks</h2>
                  <div className={styles.actions}>
                    {Object.entries(profile.socials)
                      .filter(([, url]) => url)
                      .map(([name, url]) => (
                        <a
                          href={url}
                          key={name}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {name === "x"
                            ? "X"
                            : name === "facebook"
                              ? "Facebook"
                              : "Instagram"}
                        </a>
                      ))}
                  </div>
                </section>
              )}
              {(["category", "tags"] as const).map((group) =>
                profile.facets[group]?.length ? (
                  <section className={styles.panel} key={group}>
                    <h2>{facetLabels[group]}</h2>
                    <div className={styles.facetList}>
                      {profile.facets[group]!.map((slug) => (
                        <Link key={slug} href={`/browse/?${group}=${slug}`}>
                          <Icon name="beer" />
                          {taxonomies.find(
                            (t) => t.category === group && t.slug === slug,
                          )?.label || slug}
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null,
              )}
              <section className={styles.panel}>
                <h2>
                  <Icon name="clock" />
                  Last Updated
                </h2>
                <p>
                  {new Date(brewery.updatedAt).toLocaleDateString("en-US", {
                    dateStyle: "long",
                    timeZone: profile.timezone,
                  })}
                </p>
              </section>
            </aside>
          </div>
        ) : (
          <div
            role="tabpanel"
            id="brewery-reviews"
            aria-labelledby="tab-reviews"
          >
            <Reviews breweryId={brewery.id} reviews={reviews} member={member} />
          </div>
        )}
      </div>
      {modal && (
        <Dialog
          title={
            modal === "claim" ? `Claim ${brewery.name}` : "Suggest an edit"
          }
          onClose={() => setModal(null)}
        >
          {modal === "claim" && !member ? (
            <p>
              <Link href="/my-account/">Sign in or register</Link> to request
              ownership of this brewery.
            </p>
          ) : (
            <SupportForm kind={modal} breweryId={brewery.id} />
          )}
        </Dialog>
      )}
      {photo && (
        <Dialog title={brewery.name} onClose={() => setPhoto(null)}>
          <img
            src={photo}
            alt={`${brewery.name} gallery photo`}
            className={styles.fullPhoto}
          />
        </Dialog>
      )}
    </main>
  );
}
