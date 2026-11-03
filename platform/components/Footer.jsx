import Link from "next/link";
import BrandMark from "./BrandMark";
import { simulationsByCategory } from "@/shared/simulations";
import { siteConfig } from "@/shared/config";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-bg">
      <div className="mx-auto max-w-6xl px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-12 sm:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="col-span-2 max-w-xs md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-ink">
              <BrandMark className="h-5 w-5" />
              <span className="text-[15px] font-semibold">{siteConfig.name}</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink-3">
              Free physics simulations that run in your browser. Built from the real equations.
            </p>
          </div>
          {simulationsByCategory().map((cat) => (
            <div key={cat.id}>
              <p className="eyebrow">{cat.name}</p>
              <ul className="mt-3 space-y-1">
                {cat.items.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/${s.slug}/`} className="inline-flex min-h-9 items-center text-sm text-ink-2 hover:text-ink">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 text-[13px] text-ink-3">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
