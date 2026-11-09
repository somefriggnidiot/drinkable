import type { MetadataRoute } from "next";
import { pool } from "@/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const { rows } = await pool.query(
    "SELECT slug,updated_at FROM brewery WHERE status='published'",
  );
  return [
    ...[
      "/",
      "/browse/",
      "/explore/",
      "/faq/",
      "/contact-drinkable/",
      "/privacy-policy/",
      "/terms/",
    ].map((path) => ({ url: base + path })),
    ...rows.map((row) => ({
      url: `${base}/listing/${row.slug}/`,
      lastModified: row.updated_at,
    })),
  ];
}
