import type { Profile } from "./types";
export function blankProfile(): Profile {
  return {
    description: "",
    address: "",
    city: "",
    region: "MO",
    postalCode: "",
    country: "US",
    latitude: 39.0997,
    longitude: -94.5786,
    timezone: "America/Chicago",
    website: "",
    email: "",
    phone: "",
    cover: "",
    logo: "",
    gallery: [],
    socials: { facebook: "", instagram: "", x: "" },
    facets: {},
    hours: {},
    exceptions: {},
  };
}
export const defaultTaxonomies: Record<string, string[]> = {
  category: ["Brewery", "Brewpub", "Taproom"],
  amenities: [
    "Family Friendly",
    "Free Wifi",
    "Pet Friendly",
    "Games (Bar)",
    "Games (Tabletop)",
    "Games (Arcade)",
    "Games (Yard)",
    "Bike Friendly",
    "Guest Taps",
  ],
  food: [
    "Snacks Available",
    "Restaurant",
    "Outside Food Welcome",
    "Limited Menu",
    "Full Dining Menu",
    "Food Trucks (Regular)",
    "Food Trucks (Occasional)",
  ],
  drinks: [
    "Cocktails (Basic)",
    "Wine",
    "Cocktails (Specialty)",
    "Soda (Commercial)",
    "Soda (Craft)",
    "Seltzers",
    "Ciders",
    "Spirits (Whiskey)",
    "Barrel-Aged Options",
    "Meads",
  ],
  seating: [
    "Main Bar",
    "Tables",
    "High-Tops",
    "Outdoor Seating (Uncovered)",
    "Outdoor Seating (Covered)",
    "Booths",
    "Lounge",
    "Multiple Bars",
  ],
  takeaway: [
    "Build-Your-Own Packs",
    "Crowlers",
    "Growler Refills",
    "Premade Packs",
  ],
  tags: ["Locally Owned", "Multiple Locations", "Primary Location"],
};
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export const taxonomyDescriptions: Record<string, string> = {
  "family-friendly":
    "Allows minors, with seating beyond high-tops and the main bar. Food menus include kid-friendly choices when offered.",
  "bike-friendly":
    "Bicycle parking is available on the premises in a generally bike-friendly area.",
  "free-wifi":
    "Internet access is offered to patrons without a paid access requirement.",
  "pet-friendly":
    "Pets other than service animals are welcome inside the building.",
  "games-bar":
    "Bar games such as billiards, darts, or shuffleboard are available.",
  "games-tabletop":
    "Tabletop games such as cards or board games are available to play.",
  "games-arcade":
    "Arcade cabinets, pinball, skeeball, or similar games are available.",
  "games-yard": "Yard games such as cornhole or giant Jenga are available.",
};
