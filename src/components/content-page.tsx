import { pool } from "@/db";
import { notFound } from "next/navigation";
import styles from "./ui.module.css";
export async function ContentPage({ slug }: { slug: string }) {
  const { rows } = await pool.query(
    "SELECT title,body FROM content_page WHERE slug=$1",
    [slug],
  );
  if (!rows[0]) notFound();
  return (
    <main id="main-content" className={`${styles.page} ${styles.narrow}`}>
      <section className={styles.panel}>
        <h1>{rows[0].title}</h1>
        <div className={styles.prose}>{rows[0].body}</div>
      </section>
    </main>
  );
}
