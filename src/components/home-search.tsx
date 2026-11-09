"use client";
import { useEffect, useState } from "react";
import { LocationInput } from "./location-input";
import { Icon } from "./icon";
import styles from "./ui.module.css";
import type { Taxonomy } from "@/domain/types";
const phrases = [
  "family-friendly breweries",
  "restaurant breweries",
  "breweries with seltzers",
  "taprooms with outdoor seating",
  "breweries with arcade games",
];
export function HomeSearch({ categories }: { categories: Taxonomy[] }) {
  const [radius, setRadius] = useState(10);
  return (
    <div className={styles.homeSearch}>
      <div className={styles.searchTab}>
        <Icon name="beer" /> Breweries
      </div>
      <form action="/browse/" className={styles.homeFields}>
        <label>
          <span className="visuallyHidden">Type</span>
          <select name="category" defaultValue="">
            <option value="">Type</option>
            {categories.map((term) => (
              <option key={term.id} value={term.slug}>
                {term.label}
              </option>
            ))}
          </select>
        </label>
        <LocationInput placeholder="Location" />
        <label className={styles.radius}>
          Proximity {radius}mi
          <input
            type="range"
            name="radius"
            min="1"
            max="100"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </label>
        <button type="submit" className={styles.primary}>
          <Icon name="search" />
          Search
        </button>
      </form>
    </div>
  );
}
export function RotatingLine() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % phrases.length),
      4000,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <p className={styles.heroSubtitle}>
      Find <span>{phrases[index]}</span> near me.
    </p>
  );
}
