import { notFound } from "next/navigation";
import { findBrewery, getTaxonomies } from "@/domain/search";
import { listReviews } from "@/domain/mutations";
import { currentMember, canEdit } from "@/lib/access";
import { pool } from "@/db";
import { BreweryDetail } from "@/components/brewery-detail";
import type { Review } from "@/domain/types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const b = await findBrewery((await params).slug);
  return {
    title: b?.name || "Brewery not found",
    description: b?.profile.description.slice(0, 160),
    alternates: { canonical: `/listing/${b?.slug || ""}/` },
  };
}
export default async function Listing({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const brewery = await findBrewery((await params).slug);
  if (!brewery) notFound();
  const member = await currentMember();
  const [taxonomies, reviews, edit, bookmark] = await Promise.all([
    getTaxonomies(),
    listReviews(brewery.id, member?.id),
    member ? canEdit(member, brewery.id) : false,
    member
      ? pool.query(
          "SELECT 1 FROM bookmark WHERE user_id=$1 AND brewery_id=$2",
          [member.id, brewery.id],
        )
      : null,
  ]);
  return (
    <BreweryDetail
      brewery={brewery}
      taxonomies={taxonomies}
      reviews={reviews as Review[]}
      member={member}
      bookmarked={Boolean(bookmark?.rowCount)}
      canEdit={edit}
      initialReviews={(await searchParams).reviews === "1"}
    />
  );
}
