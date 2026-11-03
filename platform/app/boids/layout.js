import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("boids");

export default function BoidsLayout({ children }) {
  return <SimPage slug="boids">{children}</SimPage>;
}
