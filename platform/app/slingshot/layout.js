import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("slingshot");

export default function SlingshotLayout({ children }) {
  return <SimPage slug="slingshot">{children}</SimPage>;
}
