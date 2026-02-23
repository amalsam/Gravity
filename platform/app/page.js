import Link from "next/link";
import { constructMetadata } from "@/shared/seo";
import { AdBanner } from "@/shared/ads";

export const metadata = constructMetadata({
  title: "Physics Simulation Framework",
  description: "A scalable framework of interactive physics experiments and simulations.",
});

export default function Home() {
  const experiments = [
    {
      title: "Gravity Engine",
      description: "Real-time N-body orbital mechanics simulation with drag-and-drop mass insertion.",
      href: "/gravity",
      emoji: "🌌",
      background: "bg-gradient-to-br from-blue-900 to-indigo-900",
      accent: "from-blue-400 to-indigo-400",
      shadowInfo: "group-hover:shadow-blue-500/20"
    },
    {
      title: "True 3D Black Hole",
      description: "A WebGL 3D simulation featuring volumetric particle accretion and gravitational lensing.",
      href: "/blackhole",
      emoji: "🕳️",
      background: "bg-gradient-to-br from-gray-900 to-slate-800",
      accent: "from-purple-400 to-pink-500",
      shadowInfo: "group-hover:shadow-purple-500/20"
    },
    {
      title: "N-Particle Sandbox",
      description: "An intricate O(N²) N-body simulation where every particle interacts with all others simultaneously.",
      href: "/nparticle",
      emoji: "🐝",
      background: "bg-gradient-to-br from-emerald-900 to-teal-900",
      accent: "from-emerald-400 to-teal-400",
      shadowInfo: "group-hover:shadow-emerald-500/20"
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white font-sans relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-900/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[150px] pointer-events-none" />

      <header className="relative pt-10 pb-8 md:pt-[80px] md:pb-[60px] px-5 text-center z-10">
        <div className="max-w-[800px] mx-auto mb-6 md:mb-10">
          <div className="inline-block px-3 py-1 mb-4 md:mb-6 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-semibold tracking-wider text-gray-300 backdrop-blur-sm">
            NEXT-GEN PHYSICS ENGINE
          </div>
          <h1 className="text-3xl md:text-7xl font-extrabold tracking-tight mb-3 md:mb-6 text-white drop-shadow-2xl">
            Universe <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Simulator</span>
          </h1>
          <p className="text-sm md:text-2xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
            Beautiful, high-fidelity browser simulations.
            <br className="hidden md:block"/> Experience real-time orbital mechanics and relativity.
          </p>
        </div>
        <AdBanner dataAdSlot="top-ad" className="max-w-[728px] mx-auto min-h-[90px] rounded-xl overflow-hidden glass-panel" />
      </header>

      <main className="relative max-w-[1200px] mx-auto mb-10 md:mb-24 px-5 z-10">
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <h2 className="text-lg md:text-2xl font-bold text-white tracking-wide">
            Available Modules <span className="text-gray-600 font-normal ml-2">({experiments.length})</span>
          </h2>
          <div className="h-[1px] flex-grow bg-gradient-to-r from-white/10 to-transparent ml-6"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {experiments.map((exp) => (
            <Link 
              key={exp.title} 
              href={exp.href}
              className={`group relative flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 shadow-lg ${exp.shadowInfo}`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-0 pointer-events-none" />
              
              <div className={`h-[120px] md:h-[200px] flex items-center justify-center text-[3.5rem] md:text-[5rem] relative overflow-hidden ${exp.background}`}>
                {/* Inner Glow effect on hover */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-tr ${exp.accent} mix-blend-overlay`} />
                <span className="drop-shadow-2xl transform transition-transform duration-500 group-hover:scale-110 z-10">{exp.emoji}</span>
              </div>
              
              <div className="p-4 md:p-8 flex flex-col flex-grow relative z-10">
                <h3 className="text-lg md:text-2xl font-bold text-white mb-1.5 md:mb-3 tracking-tight">{exp.title}</h3>
                <p className="text-sm md:text-base text-gray-400 flex-grow mb-4 md:mb-8 leading-relaxed">
                  {exp.description}
                </p>
                <div className="flex items-center justify-between mt-auto pt-3 md:pt-4 border-t border-white/10">
                  <span className={`text-xs md:text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r ${exp.accent}`}>
                    ENTER SIMULATION
                  </span>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 group-hover:bg-white/20 transition-colors`}>
                    <svg className={`w-3.5 h-3.5 md:w-4 md:h-4 text-white transform transition-transform duration-300 group-hover:translate-x-1`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
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
