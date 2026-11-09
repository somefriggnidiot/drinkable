import { notFound } from "next/navigation";
import { requirePageMember, canEdit } from "@/lib/access";
import { findBrewery, getTaxonomies } from "@/domain/search";
import { BreweryEditor } from "@/components/brewery-editor";
import styles from "@/components/ui.module.css";
export const metadata = { title: "Manage brewery" };
export default async function EditListing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const member = await requirePageMember();
  const id = (await params).id;
  if (!(await canEdit(member, id))) notFound();
  const brewery = await findBrewery(id, true);
  if (!brewery) notFound();
  return (
    <main id="main-content" className={styles.page}>
      <h1>{brewery.name}</h1>
      <BreweryEditor
        key={brewery.version}
        brewery={brewery}
        taxonomies={await getTaxonomies()}
        saved={(await searchParams).saved === "1"}
      />
    </main>
  );
}
