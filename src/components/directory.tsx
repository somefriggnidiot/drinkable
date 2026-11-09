"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { SearchResult } from "@/domain/search";
import {
  facetGroups,
  facetLabels,
  type Taxonomy,
  type Brewery,
} from "@/domain/types";
import { LocationInput } from "./location-input";
import { Icon } from "./icon";
import { Dialog } from "./dialog";
import { BreweryCard } from "./brewery-card";
import { BreweryMap } from "./brewery-map";
import { AdSlot } from "./consent";
import styles from "./ui.module.css";
export function Directory({
  result,
  taxonomies,
  mapView,
  sponsors,
  bookmarkedIds,
}: {
  result: SearchResult;
  taxonomies: Taxonomy[];
  mapView: boolean;
  sponsors: Brewery[];
  bookmarkedIds: string[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState(false);
  const [move, setMove] = useState(false);
  const path = mapView ? "/explore/" : "/browse/";
  const link = (page: number) => {
    const q = new URLSearchParams(params);
    q.set("page", String(page));
    return `${path}?${q}`;
  };
  const onBounds = useCallback(
    (bounds: string) => {
      if (!move) return;
      const next = new URLSearchParams(params);
      if (next.get("bounds") === bounds) return;
      next.set("bounds", bounds);
      next.delete("page");
      router.replace(`${path}?${next}`, { scroll: false });
    },
    [move, params, path, router],
  );
  const form = (
    <form action={path} className={styles.filterForm} key={params.toString()}>
      <label>
        Search
        <input
          type="search"
          name="q"
          defaultValue={params.get("q") || ""}
          maxLength={150}
        />
      </label>
      <fieldset>
        <legend>Open now</legend>
        <div className={styles.segmented}>
          <label>
            <input
              type="radio"
              name="open"
              value="0"
              defaultChecked={params.get("open") !== "1"}
            />
            <span>All</span>
          </label>
          <label>
            <input
              type="radio"
              name="open"
              value="1"
              defaultChecked={params.get("open") === "1"}
            />
            <span>Open now</span>
          </label>
        </div>
      </fieldset>
      <label>
        Order by
        <select name="sort" defaultValue={params.get("sort") || "updated"}>
          <option value="updated">Last Updated</option>
          <option value="rating">Top rated</option>
          <option value="latest">Latest</option>
          <option value="random">Random</option>
        </select>
      </label>
      <LocationInput
        initial={params.get("location") || ""}
        lat={params.get("lat") || undefined}
        lng={params.get("lng") || undefined}
      />
      <label>
        Proximity (miles)
        <input
          type="number"
          min="1"
          max="500"
          name="radius"
          defaultValue={params.get("radius") || "10"}
        />
      </label>
      {params.get("bounds") && (
        <input type="hidden" name="bounds" value={params.get("bounds")!} />
      )}
      {facetGroups.map((group) => (
        <fieldset key={group}>
          <legend>{facetLabels[group]}</legend>
          {taxonomies
            .filter((t) => t.category === group)
            .map((term) => (
              <label className={styles.checkbox} key={term.id}>
                <input
                  type="checkbox"
                  name={group}
                  value={term.slug}
                  defaultChecked={params
                    .getAll(group)
                    .flatMap((x) => x.split(","))
                    .includes(term.slug)}
                />
                {term.label}
              </label>
            ))}
        </fieldset>
      ))}
      <div className={styles.filterActions}>
        <button type="submit" className={styles.primary}>
          <Icon name="search" />
          Search
        </button>
        <Link href={path}>Reset filters</Link>
      </div>
    </form>
  );
  return (
    <main id="main-content" className={styles.directory}>
      <div className={styles.directoryHeading}>
        <h1>What are you looking for?</h1>
        <span>
          <Icon name="beer" />
          Breweries
        </span>
      </div>
      <div
        className={`${styles.directoryBody} ${mapView ? styles.withMap : ""}`}
      >
        <aside className={styles.filtersDesktop} aria-label="Brewery filters">
          {form}
        </aside>
        <div className={styles.mobileFilterBar}>
          <form action={path}>
            <label>
              <Icon name="search" />
              <input
                aria-label="Search breweries"
                type="search"
                name="q"
                defaultValue={params.get("q") || ""}
              />
            </label>
          </form>
          <button type="button" onClick={() => setFilters(true)}>
            Filters <Icon name="settings" />
          </button>
        </div>
        <section
          className={styles.directoryResults}
          aria-label="Brewery results"
        >
          <div className={styles.resultsToolbar}>
            {result.page > 1 ? (
              <Link href={link(result.page - 1)} aria-label="Previous results">
                <Icon name="previous" />
              </Link>
            ) : (
              <span />
            )}
            <p role="status">
              Showing <strong>{result.total}</strong> results
            </p>
            {result.page * result.pageSize < result.total ? (
              <Link href={link(result.page + 1)} aria-label="Next results">
                <Icon name="next" />
              </Link>
            ) : (
              <span />
            )}
          </div>
          {sponsors.length > 0 && (
            <section
              aria-label="Sponsored breweries"
              className={styles.sponsored}
            >
              <h2>Sponsored breweries</h2>
              {sponsors.slice(0, 1).map((b) => (
                <BreweryCard
                  key={b.id}
                  brewery={b}
                  bookmarked={bookmarkedIds.includes(b.id)}
                  sponsored
                />
              ))}
            </section>
          )}
          {result.items.length ? (
            <div className={styles.cardGrid}>
              {result.items.map((brewery, index) => (
                <div key={brewery.id}>
                  <BreweryCard
                    brewery={brewery}
                    bookmarked={bookmarkedIds.includes(brewery.id)}
                  />
                  {index === 3 && <AdSlot placement="results" />}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <h2>No breweries found</h2>
              <p>Try a broader location or fewer filters.</p>
              <Link className={styles.primary} href={path}>
                Reset filters
              </Link>
            </div>
          )}
          {result.total > result.pageSize && (
            <nav className={styles.pagination} aria-label="Results pages">
              {result.page > 1 && (
                <Link href={link(result.page - 1)}>Previous</Link>
              )}
              <span>
                Page {result.page} of{" "}
                {Math.ceil(result.total / result.pageSize)}
              </span>
              {result.page * result.pageSize < result.total && (
                <Link href={link(result.page + 1)}>Next</Link>
              )}
            </nav>
          )}
        </section>
        {mapView && (
          <aside className={styles.directoryMap} aria-label="Map view">
            <label className={styles.mapMove}>
              <input
                type="checkbox"
                checked={move}
                onChange={(e) => setMove(e.target.checked)}
              />
              Search as I move the map
            </label>
            <BreweryMap
              markers={result.markers}
              onBounds={onBounds}
              fitToResults={!move}
            />
          </aside>
        )}
      </div>
      <Link
        className={styles.viewToggle}
        href={`${mapView ? "/browse/" : "/explore/"}?${params}`}
      >
        <Icon name="map" />
        {mapView ? "List view" : "Map view"}
      </Link>
      {filters && (
        <Dialog title="Filters" onClose={() => setFilters(false)}>
          {form}
        </Dialog>
      )}
    </main>
  );
}
