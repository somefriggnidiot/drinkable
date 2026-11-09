export const facetGroups = [
  "category",
  "amenities",
  "food",
  "drinks",
  "seating",
  "takeaway",
  "tags",
] as const;
export type FacetGroup = (typeof facetGroups)[number];
export const ratingDimensions = [
  "overall",
  "quality",
  "variety",
  "price",
  "service",
  "atmosphere",
] as const;
export type Ratings = Record<(typeof ratingDimensions)[number], number>;
export type Interval = { open: string; close: string };
export type Hours = Partial<Record<string, Interval[]>>;
export type Profile = {
  description: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: "US";
  latitude: number;
  longitude: number;
  timezone: string;
  website: string;
  email: string;
  phone: string;
  cover: string;
  logo: string;
  gallery: string[];
  socials: { facebook: string; instagram: string; x: string };
  facets: Partial<Record<FacetGroup, string[]>>;
  hours: Hours;
  exceptions: Hours;
};
export type Brewery = {
  id: string;
  slug: string;
  name: string;
  profile: Profile;
  status: "pending" | "published" | "rejected" | "archived";
  version: number;
  createdAt: string;
  updatedAt: string;
  rating: number | null;
  reviewCount: number;
  campaignId?: string;
};
export type Taxonomy = {
  id: string;
  category: FacetGroup;
  slug: string;
  label: string;
  description: string;
};
export type Member = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "member" | "staff" | "admin";
  disabled: boolean;
  image?: string | null;
};
export type Review = {
  id: string;
  breweryId: string;
  userId: string;
  author: string;
  ratings: Ratings;
  message: string;
  photos: string[];
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
};
export type OpeningStatus = {
  state: "open" | "closed" | "unknown";
  today: Interval[];
};
export const facetLabels: Record<FacetGroup, string> = {
  category: "Location type",
  amenities: "Amenities",
  food: "Food",
  drinks: "Drink options",
  seating: "Seating",
  takeaway: "To-go options",
  tags: "Tags",
};
