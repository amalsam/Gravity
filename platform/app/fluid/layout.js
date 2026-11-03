import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("fluid");

export default function FluidLayout({ children }) {
  return <SimPage slug="fluid">{children}</SimPage>;
}
