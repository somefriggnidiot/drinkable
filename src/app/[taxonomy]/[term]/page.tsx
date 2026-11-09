import { redirect, notFound } from "next/navigation";
import { getTaxonomies } from "@/domain/search";
const mapping: Record<string, string> = {
  amenities: "amenities",
  "location-type": "category",
  categories: "category",
  "food-options": "food",
  "drink-options": "drinks",
  "seating-options": "seating",
  "to-go-options": "takeaway",
  tags: "tags",
};
export default async function TaxonomyArchive({
  params,
}: {
  params: Promise<{ taxonomy: string; term: string }>;
}) {
  const { taxonomy, term } = await params;
  const category = mapping[taxonomy];
  if (
    !category ||
    !(await getTaxonomies()).some(
      (t) => t.category === category && t.slug === term,
    )
  )
    notFound();
  redirect(`/browse/?${category}=${encodeURIComponent(term)}`);
}
