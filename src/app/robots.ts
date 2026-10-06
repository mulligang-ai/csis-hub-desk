import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/support/docs", disallow: ["/desk", "/api/", "/support/tickets/"] } };
}
