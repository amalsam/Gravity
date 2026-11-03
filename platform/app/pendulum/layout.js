import SimPage from "@/components/SimPage";
import { simulationMetadata } from "@/shared/seo";

export const metadata = simulationMetadata("pendulum");

export default function PendulumLayout({ children }) {
  return <SimPage slug="pendulum">{children}</SimPage>;
}
