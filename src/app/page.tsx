import { HomeSearch, RotatingLine } from "@/components/home-search";
import { AdSlot } from "@/components/consent";
import styles from "@/components/ui.module.css";
import { getTaxonomies } from "@/domain/search";
export default async function Home() {
  const categories = (await getTaxonomies()).filter(
    (term) => term.category === "category",
  );
  return (
    <main id="main-content">
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>Your One-Stop Brewery Directory</h1>
          <RotatingLine />
          <HomeSearch categories={categories} />
        </div>
      </section>
      <AdSlot placement="home" />
    </main>
  );
}
