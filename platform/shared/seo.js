import { siteConfig } from './config';

export function constructMetadata({
    title = siteConfig.name,
    description = siteConfig.description,
    image = "/og-image.jpg",
    icons = "/favicon.ico",
    noIndex = false,
} = {}) {
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [{ url: image }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
        icons,
        metadataBase: new URL(siteConfig.url),
        ...(noIndex && {
            robots: {
                index: false,
                follow: false,
            },
        }),
    };
}
