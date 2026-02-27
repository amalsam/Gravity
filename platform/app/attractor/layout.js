import { constructMetadata } from "@/shared/seo";

export const metadata = constructMetadata({
  title: "Strange Attractor – Lorenz Chaos Simulation",
  description: "Interactive Lorenz, Rössler and Thomas chaotic attractor simulation. Watch chaos theory come alive with real-time RK4 integration and glowing 3D particle trails.",
});

export default function AttractorLayout({ children }) {
  return <>{children}</>;
}
