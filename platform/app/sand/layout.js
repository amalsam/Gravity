import { constructMetadata } from "@/shared/seo";
export const metadata = constructMetadata({
  title: "Falling Sand – Cellular Automata Sandbox",
  description: "Interactive falling sand cellular automata. Paint with sand, water, fire and stone and watch emergent physics rule-based behaviour unfold pixel by pixel.",
});
export default function SandLayout({ children }) { return <>{children}</>; }
