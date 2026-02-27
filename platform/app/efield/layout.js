import { constructMetadata } from "@/shared/seo";
export const metadata = constructMetadata({
  title: "Electric Field Visualizer – Coulomb Field Lines",
  description: "Interactive electric field visualizer. Place positive and negative charges and watch real-time Coulomb field lines and equipotential surfaces rendered on canvas.",
});
export default function EfieldLayout({ children }) { return <>{children}</>; }
