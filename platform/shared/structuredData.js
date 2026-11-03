import { siteConfig, absoluteUrl } from "./config";
import { simulations, getSimulation } from "./simulations";

const ORG_ID = `${siteConfig.url}/#organization`;
const SITE_ID = `${siteConfig.url}/#website`;

export const organization = () => ({
    "@type": "Organization",
    "@id": ORG_ID,
    name: siteConfig.name,
    url: absoluteUrl("/"),
    logo: `${siteConfig.url}/icon-512.png`,
});

export const website = () => ({
    "@type": "WebSite",
    "@id": SITE_ID,
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
});

const faqPage = (faq, url) => ({
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
    })),
});

export const homeFaq = [
    {
        q: "What is Stacklor Lab?",
        a: "Stacklor Lab is a free collection of interactive physics simulations — gravity, orbits, a 3D black hole, chaos, flocking, cellular automata, electric fields and fluids — that run directly in your web browser.",
    },
    {
        q: "Are the simulations free and do they work on phones?",
        a: "Yes. Every simulation is free, needs no account or download, and works on desktop and mobile browsers. Controls sit in a side panel on desktop and a swipe-up sheet on phones.",
    },
    {
        q: "Are the simulations physically accurate?",
        a: "Each one is built from the real governing equations — Newton's law of gravitation, Coulomb's law, the Lorenz equations, smoothed particle hydrodynamics — integrated numerically in real time. Some visual effects, like black hole lensing, are approximations chosen so they run smoothly in a browser.",
    },
    {
        q: "Can I use these simulations for teaching?",
        a: "Yes. Every simulation has a The science panel that explains the equations behind it, which makes them useful for classroom demonstrations and self-study in physics, maths and computer science.",
    },
];

export function homeJsonLd() {
    const url = absoluteUrl("/");
    return {
        "@context": "https://schema.org",
        "@graph": [
            organization(),
            website(),
            {
                "@type": "CollectionPage",
                "@id": `${url}#page`,
                url,
                name: `${siteConfig.name} — ${siteConfig.tagline}`,
                description: siteConfig.description,
                isPartOf: { "@id": SITE_ID },
                mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: simulations.length,
                    itemListElement: simulations.map((s, i) => ({
                        "@type": "ListItem",
                        position: i + 1,
                        url: absoluteUrl(`/${s.slug}`),
                        name: s.name,
                    })),
                },
            },
            faqPage(homeFaq, url),
        ],
    };
}

export function simulationJsonLd(slug) {
    const sim = getSimulation(slug);
    const url = absoluteUrl(`/${sim.slug}`);
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": ["WebApplication", "LearningResource"],
                "@id": `${url}#app`,
                name: `${sim.name} simulation`,
                url,
                description: sim.description,
                abstract: sim.summary,
                image: `${siteConfig.url}/og/${sim.slug}.jpg`,
                applicationCategory: "EducationalApplication",
                applicationSubCategory: "Physics simulation",
                operatingSystem: "Any (web browser)",
                browserRequirements: "Requires JavaScript and HTML5 Canvas" + (sim.tech.includes("WebGL") ? " with WebGL" : ""),
                isAccessibleForFree: true,
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
                learningResourceType: "Interactive simulation",
                educationalUse: ["demonstration", "self-study"],
                teaches: sim.concepts,
                about: sim.concepts.map((name) => ({ "@type": "Thing", name })),
                keywords: sim.keywords.join(", "),
                inLanguage: "en",
                isPartOf: { "@id": SITE_ID },
                publisher: { "@id": ORG_ID },
            },
            {
                "@type": "HowTo",
                "@id": `${url}#howto`,
                name: `How to use the ${sim.name} simulation`,
                step: sim.howTo.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
            },
            faqPage(sim.faq, url),
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: siteConfig.name, item: absoluteUrl("/") },
                    { "@type": "ListItem", position: 2, name: sim.name, item: url },
                ],
            },
        ],
    };
}
