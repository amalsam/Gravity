import { siteConfig } from "@/shared/config";

export const dynamic = 'force-static';

export default function sitemap() {
  const routes = ["", "/gravity", "/blackhole", "/nparticle", "/attractor", "/boids", "/efield", "/pendulum", "/fluid", "/solar", "/sand"].map(
    (route) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: route === "" ? 1 : 0.8,
    })
  );

  return [...routes];
}
