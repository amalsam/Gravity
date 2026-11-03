import Link from "next/link";
import Image from "next/image";
import HeroField from "@/components/HeroField";
import JsonLd from "@/components/JsonLd";
import { AdBanner } from "@/shared/ads";
import { constructMetadata } from "@/shared/seo";
import { simulations, simulationsByCategory } from "@/shared/simulations";
import { homeJsonLd, homeFaq } from "@/shared/structuredData";

export const metadata = constructMetadata({
  description:
    "Free interactive physics simulations in your browser: a gravity and orbit simulator, a 3D black hole, the Lorenz attractor, boids flocking, a falling sand game, electric fields and SPH fluid. No install, works on mobile.",
  keywords: [
    "physics simulations",
    "interactive physics simulation",
    "online physics simulator",
    "gravity simulator",
    "black hole simulation",
    "lorenz attractor",
    "falling sand game",
    "fluid simulation",
  ],
});

function SimCard({ sim, priority = false }) {
  return (
    <Link
      href={`/${sim.slug}/`}
      className="card pressable group flex h-full gap-4 rounded-[20px] border border-line bg-fill p-2.5 md:flex-col md:gap-0 md:p-0 md:overflow-hidden"
      style={{ "--accent": sim.accent }}
    >
      <div className="card-media relative aspect-square w-24 shrink-0 overflow-hidden rounded-[14px] bg-black md:aspect-[16/10] md:w-full md:rounded-none">
        <Image
          src={`/thumbs/${sim.slug}.webp`}
          alt={`${sim.name} simulation preview`}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 380px, (min-width: 768px) 45vw, 96px"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center md:p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: sim.accent }} aria-hidden="true" />
          <h3 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink md:text-[17px]">{sim.name}</h3>
        </div>
        <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-ink-2 md:mt-1.5 md:text-[15px]">{sim.tagline}</p>
        <div className="mt-2 flex items-center justify-between md:mt-4">
          <span className="font-mono text-[12px] text-ink-3">{sim.tech}</span>
          <span className="card-cta hidden text-[13px] text-ink-3 md:inline">Open →</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const groups = simulationsByCategory();

  return (
    <>
      <JsonLd data={homeJsonLd()} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <HeroField />
        <div
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(10,10,12,0.92) 0%, rgba(10,10,12,0.7) 38%, rgba(10,10,12,0) 70%), linear-gradient(0deg, rgba(10,10,12,1) 0%, rgba(10,10,12,0) 30%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex min-h-[min(78svh,720px)] max-w-6xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6 md:justify-center md:pb-20">
          <p className="eyebrow">
            {simulations.length} simulations · free · runs in your browser
          </p>
          <h1 className="display mt-4 max-w-[13ch] text-[2.75rem] text-ink sm:text-6xl md:text-[5rem]">
            Physics you can play with.
          </h1>
          <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-ink-2 md:text-xl">
            Interactive physics simulations — gravity, a 3D black hole, chaos, flocking, sand, fields and fluids — built
            from the real equations. No install, no sign-up, works on your phone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/gravity/" className="pressable btn btn-primary">
              Start with Gravity
            </Link>
            <a href="#simulations" className="pressable btn btn-secondary">
              Browse all {simulations.length}
            </a>
          </div>
          <p className="mt-8 hidden text-[13px] text-ink-3 md:block">Move your cursor — the field follows it.</p>
        </div>
      </section>

      {/* Simulations by category */}
      <section id="simulations" aria-labelledby="simulations-title" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <h2 id="simulations-title" className="sr-only">
            All simulations
          </h2>
          <div className="space-y-16 md:space-y-24">
            {groups.map((group, gi) => (
              <section
                key={group.id}
                id={group.id}
                aria-labelledby={`${group.id}-title`}
                className="grid scroll-mt-24 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12"
              >
                <header className="lg:sticky lg:top-28 lg:self-start">
                  <h2 id={`${group.id}-title`} className="heading text-2xl text-ink md:text-[1.75rem]">
                    {group.name}
                  </h2>
                  <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-3">{group.blurb}</p>
                </header>
                <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 md:gap-5">
                  {group.items.map((sim, i) => (
                    <li key={sim.slug}>
                      <SimCard sim={sim} priority={gi === 0 && i < 2} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <AdBanner dataAdSlot="home-mid" className="mx-auto max-w-[728px] px-4" />

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <h2 id="faq-title" className="heading text-2xl text-ink md:text-[1.75rem]">
            Questions
          </h2>
          <div className="divide-y divide-[var(--line)] border-y border-line">
            {homeFaq.map(({ q, a }) => (
              <details key={q}>
                <summary className="flex min-h-14 items-center justify-between gap-4 py-4 text-[16px] font-medium text-ink">
                  <h3>{q}</h3>
                  <span className="chev text-xl leading-none text-ink-3" aria-hidden="true">+</span>
                </summary>
                <p className="prose-lab pb-5 text-[15px]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
