import { constructMetadata } from "@/shared/seo";

export const metadata = constructMetadata({
  title: "N-Particle Simulation – O(N²) Performance Sandbox",
  description: "A highly optimized 3D interacting particle swarm sandbox running in your browser.",
  keywords: ["N-body simulation", "particle swarm", "physics engine", "JavaScript physics"],
});

export default function NParticleLayout({ children }) {
  return <>{children}</>;
}
