import { SupportForm } from "@/components/support-form";
import styles from "@/components/ui.module.css";
export const metadata = { title: "Contact Drinkable" };
export default function Contact() {
  return (
    <main id="main-content" className={`${styles.page} ${styles.narrow}`}>
      <h1 className={styles.pageTitle}>Drop Us A Line</h1>
      <section className={styles.panel}>
        <SupportForm kind="contact" />
      </section>
    </main>
  );
}
