"use client";
import styles from "@/components/ui.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.panel}>
        <h1>We couldn’t load this page</h1>
        <p>
          Please try again. If the problem continues, contact Drinkable support.
        </p>
        <button className={styles.primary} onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
