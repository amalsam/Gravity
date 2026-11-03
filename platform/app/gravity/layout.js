import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("gravity");

export default function GravityLayout({ children }) {
  return <SimPage slug="gravity">{children}</SimPage>;
}
