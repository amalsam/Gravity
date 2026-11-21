import reels from "./reels.json";

// Reels from amalsam/stacklor-reels whose reel.json lists this slug under "labs".
export const reelsForSimulation = (slug) => reels.filter((r) => (r.labs || []).includes(slug));
