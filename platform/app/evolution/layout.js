import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("evolution");

export default function EvolutionLayout({ children }) {
  return <SimPage slug="evolution">{children}</SimPage>;
}
