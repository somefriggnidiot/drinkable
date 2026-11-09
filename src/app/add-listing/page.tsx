import { requirePageMember, isStaff } from "@/lib/access";
import { getTaxonomies } from "@/domain/search";
import { BreweryEditor } from "@/components/brewery-editor";
import styles from "@/components/ui.module.css";
export const metadata = { title: "Add a Brewery" };
export default async function AddListing() {
  const member = await requirePageMember();
  return (
    <main id="main-content" className={styles.page}>
      <h1>Add a Brewery</h1>
      <BreweryEditor
        taxonomies={await getTaxonomies()}
        staff={isStaff(member)}
      />
    </main>
  );
}
