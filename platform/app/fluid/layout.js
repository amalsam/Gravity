import { constructMetadata } from "@/shared/seo";
export const metadata = constructMetadata({
  title: "Fluid SPH – Smoothed Particle Hydrodynamics",
  description: "Real-time 2D fluid simulation using Smoothed Particle Hydrodynamics. Spawn water, change gravity, and watch pressure, viscosity and surface tension interact.",
});
export default function FluidLayout({ children }) { return <>{children}</>; }
