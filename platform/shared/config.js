// Global configuration for the application

export const siteConfig = {
    name: "Stacklor Lab",
    shortName: "Stacklor Lab",
    tagline: "Physics simulations you can play with",
    description:
        "Free interactive physics simulations that run in your browser: gravity and orbits, a 3D black hole, chaos and strange attractors, flocking, falling sand, electric fields and fluids.",
    url: "https://labs.stacklor.com",
    locale: "en_US",
    themeColor: "#0a0a0c",
    // AdSense: set a real publisher ID (ca-pub-…) to enable ad slots.
    // While null, ad slots render nothing (no empty boxes).
    adsClientId: null,
    googleAnalyticsId: "G-EQ943WFK5R",
};

// Canonical URL for a route. The site is exported with trailingSlash: true,
// so every page lives at /slug/ — canonicals must match that exactly.
export const absoluteUrl = (path = "/") => {
    const clean = path === "/" || path === "" ? "/" : `/${path.replace(/^\/|\/$/g, "")}/`;
    return `${siteConfig.url}${clean}`;
};
