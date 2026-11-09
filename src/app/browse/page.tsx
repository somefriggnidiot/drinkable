import { currentMember } from "@/lib/access";
import { Directory } from "@/components/directory";
import {
  searchBreweries,
  getTaxonomies,
  getSponsors,
  getBookmarkedBreweryIds,
} from "@/domain/search";
export const metadata = { title: "Browse Kansas City Breweries" };
export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.set(key, value);
  }
  const [result, taxonomies, sponsors, bookmarkedIds] = await Promise.all([
    searchBreweries(params),
    getTaxonomies(),
    getSponsors(),
    currentMember().then((member) => getBookmarkedBreweryIds(member?.id)),
  ]);
  return (
    <Directory
      result={result}
      taxonomies={taxonomies}
      sponsors={sponsors}
      bookmarkedIds={bookmarkedIds}
      mapView={false}
    />
  );
}
