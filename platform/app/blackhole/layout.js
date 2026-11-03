import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("blackhole");

export default function BlackholeLayout({ children }) {
  return <SimPage slug="blackhole">{children}</SimPage>;
}
