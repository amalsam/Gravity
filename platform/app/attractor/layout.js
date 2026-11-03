import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("attractor");

export default function AttractorLayout({ children }) {
  return <SimPage slug="attractor">{children}</SimPage>;
}
