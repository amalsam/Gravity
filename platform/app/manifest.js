import { siteConfig } from "@/shared/config";
import { simulations } from "@/shared/simulations";

export const dynamic = "force-static";

export default function manifest() {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    categories: ["education", "science"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: simulations.slice(0, 4).map((s) => ({ name: s.name, url: `/${s.slug}/` })),
  };
}
