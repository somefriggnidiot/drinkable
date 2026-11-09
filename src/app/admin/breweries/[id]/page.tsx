import { notFound } from "next/navigation";
import { requirePageMember, isStaff } from "@/lib/access";
import { findBrewery, getTaxonomies } from "@/domain/search";
import { pool } from "@/db";
import { BreweryEditor } from "@/components/brewery-editor";
import styles from "@/components/ui.module.css";
export const metadata = {
  title: "Edit brewery",
  robots: { index: false, follow: false },
};
export default async function StaffBrewery({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const member = await requirePageMember();
  if (!isStaff(member)) notFound();
  const id = (await params).id;
  const taxonomies = await getTaxonomies();
  if (id === "new")
    return (
      <main id="main-content" className={styles.page}>
        <BreweryEditor taxonomies={taxonomies} staff />
      </main>
    );
  const brewery = await findBrewery(id, true);
  if (!brewery) notFound();
  const revisions = await pool.query(
    "SELECT r.id,r.version,r.created_at,u.name AS actor FROM revision r JOIN app_user u ON u.id=r.actor_id WHERE brewery_id=$1 ORDER BY version DESC",
    [id],
  );
  return (
    <main id="main-content" className={styles.page}>
      <h1>{brewery.name}</h1>
      <p>Brewery ID: {brewery.id}</p>
      <BreweryEditor
        key={brewery.version}
        brewery={brewery}
        taxonomies={taxonomies}
        staff
        revisions={revisions.rows}
        saved={(await searchParams).saved === "1"}
      />
    </main>
  );
}
