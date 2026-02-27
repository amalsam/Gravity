import { constructMetadata } from "@/shared/seo";
export const metadata = constructMetadata({
  title: "Magnetic Pendulum – Fractal Chaos Simulation",
  description: "A damped pendulum swinging over magnets generates a stunning fractal basin-of-attraction map. Explore chaos theory and sensitive dependence on initial conditions.",
});
export default function PendulumLayout({ children }) { return <>{children}</>; }
