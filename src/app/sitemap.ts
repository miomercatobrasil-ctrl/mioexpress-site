export const dynamic = "force-static";
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE.url, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE.url}/experiencia`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE.url}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
