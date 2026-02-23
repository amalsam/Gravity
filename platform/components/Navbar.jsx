'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <nav className="fixed top-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: back button (non-home pages) + brand */}
          <div className="flex items-center gap-2">
            {!isHome && (
              <Link
                href="/"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/15 hover:text-white transition-all duration-200"
                aria-label="Back to home"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <Link href="/" className="group flex items-center gap-2 text-white font-extrabold text-lg tracking-widest transition-transform hover:scale-105">
              <span className="text-xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">⚡</span>
              Stacklor<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400"> Lab</span>
            </Link>
          </div>

          {/* Right: desktop nav links */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-2">
              <Link href="/gravity" className="group relative px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:text-white">
                Gravity
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 transform scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
              <Link href="/blackhole" className="group relative px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:text-white">
                Black Hole
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-purple-500 transform scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
              <Link href="/nparticle" className="group relative px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:text-white">
                N-Particle
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500 transform scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </nav>
  );
}

