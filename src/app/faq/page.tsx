import { Faq } from "@/components/faq";
import { getTaxonomies } from "@/domain/search";
import { pool } from "@/db";
import styles from "@/components/ui.module.css";
export const metadata = { title: "FAQ" };
export default async function FAQ() {
  const [terms, page] = await Promise.all([
    getTaxonomies(),
    pool.query("SELECT body FROM content_page WHERE slug='faq'"),
  ]);
  return (
    <main id="main-content" className={styles.page}>
      <h1 className={styles.pageTitle}>Frequently Asked Questions</h1>
      {page.rows[0]?.body && (
        <div className={`${styles.panel} ${styles.prose}`}>
          {page.rows[0].body}
        </div>
      )}
      <Faq taxonomies={terms} />
    </main>
  );
}
