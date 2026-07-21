import type { MetadataRoute } from "next";

// A private team site — keep it out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
