import Link from "next/link";
import styles from "@/components/ui.module.css";
export default function NotFound() {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.panel}>
        <h1>Page not found</h1>
        <p>This page may have moved or is no longer available.</p>
        <Link className={styles.primary} href="/browse/">
          Browse breweries
        </Link>
      </section>
    </main>
  );
}
