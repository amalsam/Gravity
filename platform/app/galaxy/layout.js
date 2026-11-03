import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("galaxy");

export default function GalaxyLayout({ children }) {
  return <SimPage slug="galaxy">{children}</SimPage>;
}
