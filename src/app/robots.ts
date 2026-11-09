import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/my-account/", "/add-listing/"],
    },
    sitemap: `${process.env.APP_URL || "http://localhost:3000"}/sitemap.xml`,
  };
}
