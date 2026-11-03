import { absoluteUrl, siteConfig } from "@/shared/config";
import { simulations } from "@/shared/simulations";

export const dynamic = "force-static";

export default function sitemap() {
  const lastModified = new Date().toISOString();
  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${siteConfig.url}/og/home.jpg`],
    },
    ...simulations.map((s) => ({
      url: absoluteUrl(`/${s.slug}`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [`${siteConfig.url}/og/${s.slug}.jpg`],
    })),
  ];
}
