import { constructMetadata } from "@/shared/seo";

export const metadata = constructMetadata({
  title: "Gravity Simulation – Interactive Physics Demo",
  description: "Explore gravity with a real-time 2D planetary gravity simulator.",
  keywords: ["gravity simulation", "physics demo", "particle system", "2D gravity"],
});

export default function GravityLayout({ children }) {
  return <>{children}</>;
}
