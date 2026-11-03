import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("efield");

export default function EfieldLayout({ children }) {
  return <SimPage slug="efield">{children}</SimPage>;
}
