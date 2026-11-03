import { siteConfig, absoluteUrl } from "./config";
import { getSimulation } from "./simulations";

export function constructMetadata({
    title,
    description = siteConfig.description,
    path = "/",
    image = "/og/home.jpg",
    imageAlt = `${siteConfig.name} — interactive physics simulations`,
    keywords = [],
    noIndex = false,
} = {}) {
    const url = absoluteUrl(path);
    const fullTitle = title ? `${title} · ${siteConfig.name}` : `${siteConfig.name} — ${siteConfig.tagline}`;
    return {
        title: title ? title : { absolute: fullTitle },
        description,
        keywords: keywords.length ? keywords : undefined,
        alternates: { canonical: url },
        openGraph: {
            type: "website",
            url,
            siteName: siteConfig.name,
            locale: siteConfig.locale,
            title: fullTitle,
            description,
            images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            images: [image],
        },
        ...(noIndex && { robots: { index: false, follow: false } }),
    };
}

export function simulationMetadata(slug) {
    const sim = getSimulation(slug);
    return constructMetadata({
        title: sim.title,
        description: sim.description,
        path: `/${sim.slug}`,
        image: `/og/${sim.slug}.jpg`,
        imageAlt: `${sim.name} simulation running in the browser`,
        keywords: sim.keywords,
    });
}
