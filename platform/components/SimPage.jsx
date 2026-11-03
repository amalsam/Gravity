import Link from "next/link";
import Image from "next/image";
import JsonLd from "./JsonLd";
import { getSimulation, relatedSimulations, categories } from "@/shared/simulations";
import { simulationJsonLd } from "@/shared/structuredData";

// Server-rendered wrapper for every simulation route: the live simulation
// first, then a crawlable article (H1, how-to, concepts, FAQ, related) that
// gives search engines and answer engines real text to index.
export default function SimPage({ slug, children }) {
  const sim = getSimulation(slug);
  const category = categories.find((c) => c.id === sim.category);
  const related = relatedSimulations(slug, 3);

  return (
    <>
      <JsonLd data={simulationJsonLd(slug)} />
      {children}

      <article
        id="about"
        data-sim-article
        className="scroll-mt-20 border-t border-line bg-bg"
        style={{ "--accent": sim.accent }}
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <nav aria-label="Breadcrumb" className="eyebrow">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-ink">Stacklor Lab</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/#${category.id}`} className="hover:text-ink">{category.name}</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink-2">{sim.name}</li>
            </ol>
          </nav>

          <header className="mt-5 max-w-3xl">
            <h1 className="display text-[2.25rem] text-ink md:text-[3.25rem]">{sim.name} simulation</h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-2 md:text-xl">{sim.description}</p>
          </header>

          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-12 md:grid-cols-[minmax(0,1fr)_320px] md:gap-16">
            <div className="space-y-12">
              <section aria-labelledby="what">
                <h2 id="what" className="heading text-2xl text-ink">What you&rsquo;re looking at</h2>
                <p className="prose-lab mt-3 text-[16px]">{sim.summary}</p>
              </section>

              <section aria-labelledby="how">
                <h2 id="how" className="heading text-2xl text-ink">How to use it</h2>
                <ol className="mt-4 space-y-3">
                  {sim.howTo.map((step, i) => (
                    <li key={i} className="flex gap-3.5">
                      <span
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[12px] text-ink"
                        style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)" }}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <span className="prose-lab text-[16px]">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section aria-labelledby="faq">
                <h2 id="faq" className="heading text-2xl text-ink">Questions</h2>
                <div className="mt-4 divide-y divide-[var(--line)] border-y border-line">
                  {sim.faq.map(({ q, a }) => (
                    <details key={q} className="group">
                      <summary className="flex min-h-14 items-center justify-between gap-4 py-4 text-[16px] font-medium text-ink">
                        <h3>{q}</h3>
                        <span className="chev text-xl leading-none text-ink-3" aria-hidden="true">+</span>
                      </summary>
                      <p className="prose-lab pb-5 text-[15px]">{a}</p>
                    </details>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-10">
              <section aria-labelledby="concepts">
                <h2 id="concepts" className="eyebrow">Concepts</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {sim.concepts.map((c) => (
                    <li key={c} className="rounded-full border border-line bg-fill px-3 py-1.5 text-[13px] text-ink-2">
                      {c}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="related">
                <h2 id="related" className="eyebrow">Try next</h2>
                <ul className="mt-3 space-y-2">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/${r.slug}/`}
                        className="card pressable flex items-center gap-3 rounded-2xl border border-line bg-fill p-2 pr-4"
                      >
                        <span className="card-media relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
                          <Image src={`/thumbs/${r.slug}.webp`} alt="" fill sizes="80px" className="object-cover" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-medium text-ink">{r.name}</span>
                          <span className="block truncate text-[13px] text-ink-3">{r.tagline}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
