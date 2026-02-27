import { constructMetadata } from "@/shared/seo";

export const metadata = constructMetadata({
  title: "Boids Flocking – Emergent Swarm Simulation",
  description: "Interactive Craig Reynolds boids simulation. Watch emergent flocking behaviour arise from just three simple rules: separation, alignment, and cohesion.",
});

export default function BoidsLayout({ children }) {
  return <>{children}</>;
}
