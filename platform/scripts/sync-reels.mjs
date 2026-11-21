// Runs before every build. Pulls the reel index from amalsam/stacklor-reels
// so each simulation page can link to the reels and code behind it.
// If the fetch fails, the committed shared/reels.json is used as is, so a
// network blip never breaks a deploy.
import { writeFile } from "node:fs/promises";

const SOURCE = "https://raw.githubusercontent.com/amalsam/stacklor-reels/main/reels.json";
const OUT = new URL("../shared/reels.json", import.meta.url);

try {
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reels = await res.json();
  if (!Array.isArray(reels)) throw new Error("reels.json is not an array");
  await writeFile(OUT, JSON.stringify(reels, null, 2) + "\n");
  console.log(`sync-reels: ${reels.length} reels`);
} catch (err) {
  console.warn(`sync-reels: keeping committed reels.json (${err.message})`);
}
