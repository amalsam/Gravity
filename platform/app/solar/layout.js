import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("solar");

export default function SolarLayout({ children }) {
  return <SimPage slug="solar">{children}</SimPage>;
}
