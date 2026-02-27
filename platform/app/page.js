import Link from "next/link";
import Image from "next/image";
import { constructMetadata } from "@/shared/seo";
import { AdBanner } from "@/shared/ads";

export const metadata = constructMetadata({
  title: "Stacklor Lab — Physics Simulations",
  description: "Interactive browser-based physics simulations — real-time gravity, black holes, and N-body particle systems built in WebGL.",
});

export default function Home() {
  const experiments = [
    {
      title: "Gravity Engine",
      description: "Real-time N-body orbital mechanics with drag-and-drop mass insertion.",
      href: "/gravity",
      image: "/preview-gravity.png",
      accent: "from-blue-400 to-indigo-400",
      shadowInfo: "group-hover:shadow-blue-500/20",
      tag: "2D · Canvas",
      tagColor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    {
      title: "3D Black Hole",
      description: "WebGL simulation with gravitational lensing and relativistic Doppler effects.",
      href: "/blackhole",
      image: "/preview-blackhole.png",
      accent: "from-purple-400 to-pink-500",
      shadowInfo: "group-hover:shadow-purple-500/20",
      tag: "3D · WebGL",
      tagColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    },
    {
      title: "N-Particle Sandbox",
      description: "O(N²) N-body simulation where every particle interacts with all others.",
      href: "/nparticle",
      image: "/preview-nparticle.png",
      accent: "from-emerald-400 to-teal-400",
      shadowInfo: "group-hover:shadow-emerald-500/20",
      tag: "3D · Canvas",
      tagColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    {
      title: "Strange Attractors",
      description: "Lorenz, Rössler & Thomas chaotic attractors with RK4 integration and glowing 3D trails.",
      href: "/attractor",
      image: "/preview-attractor.png",
      accent: "from-orange-400 to-amber-400",
      shadowInfo: "group-hover:shadow-orange-500/20",
      tag: "2D · Chaos",
      tagColor: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    },
    {
      title: "Boids Flocking",
      description: "Craig Reynolds' emergent flocking algorithm — separation, alignment and cohesion.",
      href: "/boids",
      image: "/preview-boids.png",
      accent: "from-rose-400 to-pink-400",
      shadowInfo: "group-hover:shadow-rose-500/20",
      tag: "2D · Canvas",
      tagColor: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    },
    {
      title: "Electric Field",
      description: "Place charges and watch real-time Coulomb field lines and equipotential surfaces draw.",
      href: "/efield",
      image: "/preview-efield.png",
      accent: "from-yellow-400 to-amber-400",
      shadowInfo: "group-hover:shadow-yellow-500/20",
      tag: "2D · Canvas",
      tagColor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },
    {
      title: "Magnetic Pendulum",
      description: "A chaotic pendulum above magnets reveals a stunning fractal basin-of-attraction map.",
      href: "/pendulum",
      image: "/preview-pendulum.png",
      accent: "from-cyan-400 to-sky-400",
      shadowInfo: "group-hover:shadow-cyan-500/20",
      tag: "2D · Fractal",
      tagColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    },
    {
      title: "Fluid SPH",
      description: "Smoothed Particle Hydrodynamics — real-time 2D water simulation with pressure and viscosity.",
      href: "/fluid",
      image: "/preview-fluid.png",
      accent: "from-indigo-400 to-blue-500",
      shadowInfo: "group-hover:shadow-indigo-500/20",
      tag: "2D · SPH",
      tagColor: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    },
    {
      title: "Solar System",
      description: "Real-scale 8-planet orbital simulation with Kepler mechanics and adjustable time speed.",
      href: "/solar",
      image: "/preview-solar.png",
      accent: "from-violet-400 to-slate-400",
      shadowInfo: "group-hover:shadow-violet-500/20",
      tag: "2D · Orbital",
      tagColor: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    },
    {
      title: "Falling Sand",
      description: "Cellular automata sandbox — paint with sand, water, fire and stone.",
      href: "/sand",
      image: "/preview-sand.png",
      accent: "from-amber-400 to-orange-500",
      shadowInfo: "group-hover:shadow-amber-500/20",
      tag: "2D · Automata",
      tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[150px] pointer-events-none" />

      <header className="relative pt-8 pb-6 md:pt-[80px] md:pb-[60px] px-5 text-center z-10">
        <div className="max-w-[800px] mx-auto mb-5 md:mb-10">
          <div className="inline-block px-3 py-1 mb-3 md:mb-6 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-semibold tracking-wider text-gray-300 backdrop-blur-sm">
            ⚡ STACKLOR LAB
          </div>
          <h1 className="text-3xl md:text-7xl font-extrabold tracking-tight mb-2 md:mb-6 text-white drop-shadow-2xl">
            Physics <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Simulations</span>
          </h1>
          <p className="text-sm md:text-2xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
            Real-time WebGL physics experiments.
            <br className="hidden md:block"/> Gravity, black holes, and N-body particle systems.
          </p>
        </div>
        <AdBanner dataAdSlot="top-ad" className="max-w-[728px] mx-auto min-h-[90px] rounded-xl overflow-hidden glass-panel" />
      </header>

      <main className="relative max-w-[1200px] mx-auto mb-10 md:mb-24 px-4 z-10">
        <div className="flex items-center justify-between mb-5 md:mb-10">
          <h2 className="text-base md:text-2xl font-bold text-white tracking-wide">
            Simulations <span className="text-gray-600 font-normal ml-2">({experiments.length})</span>
          </h2>
          <div className="h-[1px] flex-grow bg-gradient-to-r from-white/10 to-transparent ml-6"></div>
        </div>
        
        {/* Mobile: horizontal list  |  Desktop: grid cards */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8">
          {experiments.map((exp) => (
            <Link
              key={exp.title}
              href={exp.href}
              className={`group relative flex md:flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:bg-white/10 shadow-lg ${exp.shadowInfo}`}
            >
              {/* --- MOBILE: left thumbnail --- */}
              <div className="relative w-[110px] shrink-0 md:hidden overflow-hidden">
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  className="object-cover object-center scale-110 group-hover:scale-125 transition-transform duration-700"
                  sizes="110px"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/40" />
              </div>

              {/* --- DESKTOP: top image banner --- */}
              <div className="hidden md:block relative h-[200px] overflow-hidden">
                <Image
                  src={exp.image}
                  alt={exp.title}
                  fill
                  className="object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
                  sizes="(max-width:1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
              </div>

              {/* Card body */}
              <div className="flex flex-col flex-grow p-3 md:p-6 relative z-10">
                <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
                  <h3 className="text-sm md:text-xl font-bold text-white tracking-tight leading-snug">{exp.title}</h3>
                  <span className={`shrink-0 text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded border ${exp.tagColor}`}>{exp.tag}</span>
                </div>
                <p className="text-[11px] md:text-sm text-gray-400 leading-snug md:leading-relaxed flex-grow mb-2 md:mb-6">
                  {exp.description}
                </p>
                <div className="flex items-center justify-between mt-auto pt-2 md:pt-4 border-t border-white/10">
                  <span className={`text-[10px] md:text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r ${exp.accent}`}>
                    LAUNCH →
                  </span>
                </div>
              </div>
            </Link>
          ))}
          
          <div className="hidden lg:flex flex-col items-center justify-center min-h-[300px] rounded-2xl bg-white/5 border border-dashed border-white/20 backdrop-blur-sm">
             <AdBanner dataAdSlot="square-ad" className="w-[300px] h-[250px]" />
          </div>
        </div>
      </main>
    </div>
  );
}


