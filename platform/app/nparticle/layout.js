import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("nparticle");

export default function NparticleLayout({ children }) {
  return <SimPage slug="nparticle">{children}</SimPage>;
}
