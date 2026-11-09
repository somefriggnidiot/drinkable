"use client";
import { useState } from "react";
import { facetGroups, facetLabels, type Taxonomy } from "@/domain/types";
import styles from "./ui.module.css";
export function Faq({ taxonomies }: { taxonomies: Taxonomy[] }) {
  const [category, setCategory] = useState("amenities");
  return (
    <section className={styles.panel}>
      <h2>How We Categorize Businesses</h2>
      <div className={styles.faqTabs}>
        <div
          role="tablist"
          aria-label="Business categories"
          className={styles.faqNav}
        >
          {facetGroups.map((group) => (
            <button
              type="button"
              role="tab"
              id={`faq-${group}`}
              aria-controls="faq-content"
              aria-selected={category === group}
              onClick={() => setCategory(group)}
              key={group}
            >
              {facetLabels[group]}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id="faq-content"
          aria-labelledby={`faq-${category}`}
        >
          {taxonomies
            .filter((t) => t.category === category)
            .map((term) => (
              <section key={term.id} className={styles.faqTerm}>
                <h3>{term.label}</h3>
                <p>
                  {term.description ||
                    `This listing offers ${term.label.toLowerCase()}. Check with the brewery for current availability.`}
                </p>
              </section>
            ))}
        </div>
      </div>
    </section>
  );
}
