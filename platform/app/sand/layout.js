import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("sand");

export default function SandLayout({ children }) {
  return <SimPage slug="sand">{children}</SimPage>;
}
