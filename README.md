# Stacklor Lab

Source for **[labs.stacklor.com](https://labs.stacklor.com)**: free physics simulations and games that run in the browser.

- `platform/` is the Next.js site. Every push to `master` builds it and deploys to GitHub Pages.
- `platform/shared/simulations.js` lists every simulation and drives the home page, navigation, SEO and sitemap.
- `experiments/` holds the older standalone HTML prototypes (not deployed).

The desktop code from the reels (pygame, Java and more) lives in **[amalsam/stacklor-reels](https://github.com/amalsam/stacklor-reels)**, one folder per video. Its `reels.json` is pulled in at build time, so a simulation page shows "From the reels" links for any reel that lists its slug under `labs`.

## Run locally

```bash
cd platform
npm ci
npm run dev
```
