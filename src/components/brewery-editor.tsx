"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { blankProfile, slugify } from "@/domain/defaults";
import {
  facetGroups,
  facetLabels,
  type Brewery,
  type Profile,
  type Taxonomy,
  type Hours,
  type Interval,
} from "@/domain/types";
import { apiFetch, errorMessage } from "@/lib/client";
import { Upload } from "./upload";
import styles from "./ui.module.css";
type Revision = {
  id: string;
  version: number;
  actor: string;
  created_at: string;
};
export function HoursEditor({
  hours,
  onChange,
  exceptions = false,
}: {
  hours: Hours;
  onChange: (hours: Hours) => void;
  exceptions?: boolean;
}) {
  const [date, setDate] = useState("");
  const keys = exceptions
    ? Object.keys(hours).sort()
    : Array.from({ length: 7 }, (_, i) => String(i));
  const labels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  function set(key: string, intervals: Interval[] | undefined) {
    const next = { ...hours };
    if (intervals === undefined) delete next[key];
    else next[key] = intervals;
    onChange(next);
  }
  return (
    <div className={styles.hoursEditor}>
      {exceptions && (
        <div className={styles.inlineForm}>
          <label className={styles.grow}>
            Exception date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={styles.smallButton}
            disabled={!date}
            onClick={() => {
              if (date) {
                set(date, []);
                setDate("");
              }
            }}
          >
            Add date
          </button>
        </div>
      )}
      {keys.map((key) => (
        <div className={styles.dayRow} key={key}>
          <strong>{exceptions ? key : labels[Number(key)]}</strong>
          <div className={styles.intervals}>
            {hours[key]?.map((interval, index) => (
              <div key={index} className={styles.interval}>
                <label>
                  Open
                  <input
                    type="time"
                    aria-label={`${exceptions ? key : labels[Number(key)]} opening time ${index + 1}`}
                    value={interval.open}
                    onChange={(e) =>
                      set(
                        key,
                        hours[key]!.map((x, i) =>
                          i === index ? { ...x, open: e.target.value } : x,
                        ),
                      )
                    }
                    required
                  />
                </label>
                <label>
                  Close
                  <input
                    type="time"
                    aria-label={`${exceptions ? key : labels[Number(key)]} closing time ${index + 1}`}
                    value={interval.close}
                    onChange={(e) =>
                      set(
                        key,
                        hours[key]!.map((x, i) =>
                          i === index ? { ...x, close: e.target.value } : x,
                        ),
                      )
                    }
                    required
                  />
                </label>
                <button
                  className={styles.smallButton}
                  type="button"
                  onClick={() =>
                    set(
                      key,
                      hours[key]!.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            {(!hours[key] || !hours[key]?.length) && (
              <span className={styles.muted}>
                {hours[key] ? "Closed" : "Not provided"}
              </span>
            )}
            <div className={styles.actions}>
              {(hours[key]?.length || 0) < 4 && (
                <button
                  className={styles.smallButton}
                  type="button"
                  onClick={() =>
                    set(key, [
                      ...(hours[key] || []),
                      { open: "12:00", close: "22:00" },
                    ])
                  }
                >
                  Add hours
                </button>
              )}
              <button
                className={styles.smallButton}
                type="button"
                onClick={() => set(key, [])}
              >
                Closed
              </button>
              <button
                className={styles.smallButton}
                type="button"
                onClick={() => set(key, undefined)}
              >
                {exceptions ? "Remove exception" : "Clear hours"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export function BreweryEditor({
  brewery,
  taxonomies,
  staff = false,
  revisions = [],
  saved: initiallySaved = false,
}: {
  brewery?: Brewery;
  taxonomies: Taxonomy[];
  staff?: boolean;
  revisions?: Revision[];
  saved?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(brewery?.name || "");
  const [slug, setSlug] = useState(brewery?.slug || "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [profile, setProfile] = useState<Profile>(
    brewery?.profile || blankProfile(),
  );
  const [status, setStatus] = useState(brewery?.status || "pending");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    initiallySaved ? "Listing saved." : "",
  );
  const [saved, setSaved] = useState(false);
  const [locations, setLocations] = useState<
    { label: string; latitude: number; longitude: number }[]
  >([]);
  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await apiFetch<{ id: string; slug: string }>(
        brewery ? `/api/breweries/${brewery.id}` : "/api/breweries",
        {
          method: brewery ? "PATCH" : "POST",
          body: JSON.stringify({
            name,
            slug,
            profile,
            ...(brewery
              ? { version: brewery.version, ...(staff ? { status } : {}) }
              : {}),
          }),
        },
      );
      if (!brewery && !staff) {
        setSaved(true);
        return;
      }
      router.push(
        staff
          ? `/admin/breweries/${result.id}/?saved=1`
          : `/my-account/listings/${result.id}/?saved=1`,
      );
      setMessage("Listing saved.");
      router.refresh();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function locate() {
    setBusy(true);
    try {
      const result = await apiFetch<{ items: typeof locations }>(
        `/api/geocode?q=${encodeURIComponent(profile.address)}`,
      );
      setLocations(result.items);
      if (!result.items.length)
        setMessage(
          "No locations found. Enter the latitude and longitude manually.",
        );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function restore(revisionId: string) {
    if (!brewery) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/restore/${brewery.id}`, {
        method: "POST",
        body: JSON.stringify({ revisionId, version: brewery.version }),
      });
      router.refresh();
      window.location.reload();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (saved)
    return (
      <section className={styles.panel}>
        <h2>Your brewery has been submitted</h2>
        <p>
          Staff will review your submission before publishing it. Once it is
          published, request ownership from the listing page to manage updates.
        </p>
        <Link className={styles.primary} href="/my-account/dashboard/">
          View my submissions
        </Link>
      </section>
    );
  const textFields = [
    ["address", "Street address"],
    ["city", "City"],
    ["region", "State"],
    ["postalCode", "ZIP code"],
    ["phone", "Phone"],
  ] as const;
  return (
    <>
      <form className={`${styles.form} ${styles.panel}`} onSubmit={submit}>
        <h2>{brewery ? "Edit brewery" : "Add a Brewery"}</h2>
        {!brewery && !staff && (
          <p>
            Submit one physical location per listing. New listings are reviewed
            by Drinkable staff.
          </p>
        )}
        <div className={styles.formColumns}>
          <label>
            Brewery name
            <input
              value={name}
              required
              minLength={2}
              maxLength={150}
              onChange={(e) => {
                setName(e.target.value);
                if (!brewery && !slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </label>
          <label>
            URL slug
            <input
              value={slug}
              required
              maxLength={180}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            rows={8}
            value={profile.description}
            maxLength={20000}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <div className={styles.formColumns}>
          {textFields.map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={profile[key]}
                onChange={(e) => set(key, e.target.value)}
                required={["address", "city", "region"].includes(key)}
                maxLength={key === "address" ? 500 : 100}
              />
            </label>
          ))}
          <label>
            Website
            <input
              type="url"
              value={profile.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </label>
          <label>
            Contact email
            <input
              type="email"
              value={profile.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className={styles.secondary}
          onClick={locate}
          disabled={busy || profile.address.length < 3}
        >
          Look up address coordinates
        </button>
        {locations.length > 0 && (
          <div className={styles.notice}>
            <p>Choose the correct location:</p>
            {locations.map((location) => (
              <button
                key={location.label}
                type="button"
                className={styles.secondary}
                onClick={() => {
                  setProfile((p) => ({
                    ...p,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    address: location.label,
                  }));
                  setLocations([]);
                }}
              >
                {location.label}
              </button>
            ))}
          </div>
        )}
        <div className={styles.formColumns}>
          <label>
            Latitude
            <input
              type="number"
              min="-90"
              max="90"
              step="any"
              required
              value={profile.latitude}
              onChange={(e) => set("latitude", Number(e.target.value))}
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              min="-180"
              max="180"
              step="any"
              required
              value={profile.longitude}
              onChange={(e) => set("longitude", Number(e.target.value))}
            />
          </label>
          <label>
            Time zone
            <select
              value={profile.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {[
                "America/Chicago",
                "America/New_York",
                "America/Denver",
                "America/Phoenix",
                "America/Los_Angeles",
                "America/Anchorage",
                "Pacific/Honolulu",
              ].map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </label>
        </div>
        <section className={styles.editorSection}>
          <h3>Images</h3>
          <div className={styles.formColumns}>
            <div>
              {profile.cover && (
                <img
                  src={profile.cover}
                  alt="Current cover"
                  style={{ height: 150, objectFit: "cover" }}
                />
              )}
              <Upload
                label="Cover photo"
                onReady={(url) => set("cover", url)}
              />
              {profile.cover && (
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() => set("cover", "")}
                >
                  Remove cover
                </button>
              )}
            </div>
            <div>
              {profile.logo && (
                <img
                  src={profile.logo}
                  alt="Current logo"
                  width="100"
                  height="100"
                />
              )}
              <Upload
                label="Business logo"
                onReady={(url) => set("logo", url)}
              />
              {profile.logo && (
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() => set("logo", "")}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
          <h3 style={{ marginTop: 25 }}>Photo gallery</h3>
          <div className={styles.editorGallery}>
            {profile.gallery.map((url) => (
              <div key={url}>
                <img src={url} alt="Gallery photo" />
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={() =>
                    set(
                      "gallery",
                      profile.gallery.filter((x) => x !== url),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {profile.gallery.length < 20 && (
            <Upload
              label="Add gallery photo"
              onReady={(url) =>
                setProfile((p) => ({
                  ...p,
                  gallery: [...p.gallery, url].slice(0, 20),
                }))
              }
            />
          )}
        </section>
        {facetGroups.map((group) => (
          <fieldset key={group} className={styles.editorSection}>
            <legend>{facetLabels[group]}</legend>
            <div className={styles.termGrid}>
              {taxonomies
                .filter((t) => t.category === group)
                .map((term) => (
                  <label key={term.id} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={
                        profile.facets[group]?.includes(term.slug) || false
                      }
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          facets: {
                            ...p.facets,
                            [group]: e.target.checked
                              ? [...(p.facets[group] || []), term.slug]
                              : (p.facets[group] || []).filter(
                                  (x) => x !== term.slug,
                                ),
                          },
                        }))
                      }
                    />
                    {term.label}
                  </label>
                ))}
            </div>
          </fieldset>
        ))}
        <section className={styles.editorSection}>
          <h3>Opening hours</h3>
          <p className={styles.fieldHelp}>
            Closing times earlier than opening times continue into the next day.
            Leave all hours unset when unknown.
          </p>
          <HoursEditor
            hours={profile.hours}
            onChange={(hours) => set("hours", hours)}
          />
        </section>
        <section className={styles.editorSection}>
          <h3>Date exceptions</h3>
          <p className={styles.fieldHelp}>
            A date exception overrides that calendar date, including overnight
            hours from the previous day.
          </p>
          <HoursEditor
            hours={profile.exceptions}
            onChange={(hours) => set("exceptions", hours)}
            exceptions
          />
        </section>
        <section className={styles.editorSection}>
          <h3>Social networks</h3>
          <div className={styles.formColumns}>
            {(["facebook", "instagram", "x"] as const).map((network) => (
              <label key={network}>
                {network === "x"
                  ? "X"
                  : network === "facebook"
                    ? "Facebook"
                    : "Instagram"}
                <input
                  type="url"
                  value={profile.socials[network]}
                  onChange={(e) =>
                    set("socials", {
                      ...profile.socials,
                      [network]: e.target.value,
                    })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        {staff && brewery && (
          <label>
            Publication status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Brewery["status"])}
            >
              <option value="pending">Pending review</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        )}
        {message && (
          <p className={styles.notice} role="status">
            {message}
          </p>
        )}
        <button type="submit" className={styles.primary} disabled={busy}>
          {busy
            ? "Saving…"
            : brewery
              ? "Save changes"
              : staff
                ? "Publish brewery"
                : "Submit brewery for review"}
        </button>
      </form>
      {staff && brewery && (
        <section className={styles.panel}>
          <h2>Revision history</h2>
          {revisions.length ? (
            <ul className={styles.recordList}>
              {revisions.map((revision) => (
                <li key={revision.id}>
                  <p>
                    Version {revision.version} · {revision.actor} ·{" "}
                    {new Date(revision.created_at).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    className={styles.smallButton}
                    disabled={busy}
                    onClick={() => restore(revision.id)}
                  >
                    Restore version {revision.version}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No previous revisions yet.</p>
          )}
        </section>
      )}
    </>
  );
}
