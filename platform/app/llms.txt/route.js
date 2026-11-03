import { siteConfig, absoluteUrl } from "@/shared/config";
import { simulationsByCategory } from "@/shared/simulations";
import { homeFaq } from "@/shared/structuredData";

export const dynamic = "force-static";

// /llms.txt — a plain-text map of the site for AI assistants and answer engines.
export function GET() {
  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description}`,
    "",
    "All simulations are free, run entirely in the browser (desktop and mobile), and need no account or install. Each page has a live simulation, usage instructions, an explanation of the physics and an FAQ.",
    "",
  ];

  for (const cat of simulationsByCategory()) {
    lines.push(`## ${cat.name}`, "", cat.blurb, "");
    for (const s of cat.items) {
      lines.push(`- [${s.name}](${absoluteUrl(`/${s.slug}`)}): ${s.description}`);
    }
    lines.push("");
  }

  lines.push("## Details", "");
  for (const cat of simulationsByCategory()) {
    for (const s of cat.items) {
      lines.push(`### ${s.name}`, "", s.summary, "", `Concepts: ${s.concepts.join(", ")}.`, "");
      for (const { q, a } of s.faq) lines.push(`Q: ${q}`, `A: ${a}`, "");
    }
  }

  lines.push("## About", "");
  for (const { q, a } of homeFaq) lines.push(`Q: ${q}`, `A: ${a}`, "");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
