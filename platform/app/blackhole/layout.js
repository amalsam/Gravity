import { constructMetadata } from "@/shared/seo";

export const metadata = constructMetadata({
  title: "Black Hole Simulation – Relativistic 3D Rendering",
  description: "An interactive, accurate 3D black hole visualization with Einstein ring microlensing.",
  keywords: ["black hole simulation", "relativity", "Einstein ring", "Three.js black hole"],
});

export default function BlackHoleLayout({ children }) {
  return <>{children}</>;
}
