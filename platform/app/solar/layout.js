import { constructMetadata } from "@/shared/seo";
export const metadata = constructMetadata({
  title: "Solar System – Real-Scale Orbital Mechanics",
  description: "Interactive solar system simulation with all 8 planets using real orbital data and Newtonian gravity. Fast-forward time and explore Kepler's laws in action.",
});
export default function SolarLayout({ children }) { return <>{children}</>; }
