import { z } from "zod";
import { facetGroups, ratingDimensions } from "./types";

const text = (max: number) => z.string().trim().max(max);
export const publicUrl = z.union([
  z.literal(""),
  z
    .url()
    .refine(
      (v) => ["http:", "https:"].includes(new URL(v).protocol),
      "Use an http or https link",
    ),
]);
export const mediaUrl = z.union([
  z.literal(""),
  z
    .string()
    .regex(
      /^\/(?:media\/[0-9a-f-]+\/(?:image|thumb)\.webp|brand\/[a-z0-9.-]+)$/,
      "Upload an image first",
    ),
]);
const interval = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
const weekly = z.record(z.string().regex(/^[0-6]$/), z.array(interval).max(4));
const exceptions = z.record(z.iso.date(), z.array(interval).max(4));
export const profileSchema = z.object({
  description: text(20000),
  address: text(500).min(3),
  city: text(100).min(1),
  region: text(100).min(1),
  postalCode: text(20),
  country: z.literal("US"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: text(100).refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone"),
  website: publicUrl,
  email: z.union([z.literal(""), z.email()]),
  phone: text(40),
  cover: mediaUrl,
  logo: mediaUrl,
  gallery: z.array(mediaUrl).max(20),
  socials: z.object({
    facebook: publicUrl,
    instagram: publicUrl,
    x: publicUrl,
  }),
  facets: z.partialRecord(
    z.enum(facetGroups),
    z.array(text(80).regex(/^[a-z0-9-]+$/)).max(40),
  ),
  hours: weekly,
  exceptions,
});
export const brewerySchema = z.object({
  name: text(150).min(2),
  slug: text(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  profile: profileSchema,
});
export const ratingSchema = z.object(
  Object.fromEntries(
    ratingDimensions.map((d) => [
      d,
      z.number().min(0.5).max(5).multipleOf(0.5),
    ]),
  ) as Record<(typeof ratingDimensions)[number], z.ZodNumber>,
);
export const reviewSchema = z.object({
  ratings: ratingSchema,
  message: text(5000).min(10),
  photos: z.array(mediaUrl).max(5),
});
export const contactSchema = z.object({
  name: text(100).min(2),
  email: z.email(),
  subject: text(200).min(2),
  message: text(10000).min(10),
  website: z.string().max(0).optional(),
});
export const suggestionSchema = z.object({
  email: z.email(),
  message: text(5000).min(10),
  evidence: text(2000).min(5),
});
export const claimSchema = z.object({ evidence: text(5000).min(20) });
export const uuid = z.uuid();
