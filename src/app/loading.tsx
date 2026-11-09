import styles from "@/components/ui.module.css";
export default function Loading() {
  return (
    <main id="main-content" className={styles.loadingPage}>
      <p role="status">Loading Drinkable City…</p>
    </main>
  );
}
