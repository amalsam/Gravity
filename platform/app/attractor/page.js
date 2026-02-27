"use client";

import { useState, useRef } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import { AdBanner } from "@/shared/ads";
import ScienceModal from "@/components/ScienceModal";

// ── RK4 integrator ─────────────────────────────────────────────────────────
function rk4(x, y, z, dt, deriv) {
    const k1 = deriv(x, y, z);
    const k2 = deriv(x + dt/2*k1[0], y + dt/2*k1[1], z + dt/2*k1[2]);
    const k3 = deriv(x + dt/2*k2[0], y + dt/2*k2[1], z + dt/2*k2[2]);
    const k4 = deriv(x + dt*k3[0],   y + dt*k3[1],   z + dt*k3[2]);
    return [
        x + dt/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]),
        y + dt/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]),
        z + dt/6*(k1[2]+2*k2[2]+2*k3[2]+k4[2]),
    ];
}

const ATTRACTORS = {
    lorenz: {
        label: 'Lorenz',
        icon: '🦋',
        color: '#f97316',   // orange
        deriv: (x,y,z) => [10*(y-x), x*(28-z)-y, x*y - (8/3)*z],
        init: [0.1, 0, 0],
        dt: 0.005,
        scale: 8,
        cx: 0, cy: 12,     // offset so the butterfly is centred
    },
    rossler: {
        label: 'Rössler',
        icon: '🌀',
        color: '#a78bfa',   // violet
        deriv: (x,y,z) => [-(y+z), x+0.2*y, 0.2+z*(x-5.7)],
        init: [0.1, 0, 0],
        dt: 0.01,
        scale: 14,
        cx: 0, cy: 0,
    },
    thomas: {
        label: 'Thomas',
        icon: '⚛️',
        color: '#34d399',   // emerald
        deriv: (x,y,z) => [Math.sin(y)-0.19*x, Math.sin(z)-0.19*y, Math.sin(x)-0.19*z],
        init: [0.1, 0, 0],
        dt: 0.05,
        scale: 55,
        cx: 0, cy: 0,
    },
};

export default function AttractorPage() {
    const [attractorKey, setAttractorKey]     = useState('lorenz');
    const [trailLength, setTrailLength]       = useState(2000);
    const [speed, setSpeed]                   = useState(3);
    const [autoRotate, setAutoRotate]         = useState(true);
    const [showScience, setShowScience]       = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const swipeRef = useRef({ startY: 0, startX: 0 });

    const stateRef = useRef(null);
    if (!stateRef.current) {
        stateRef.current = {
            trail: [],
            x: 0.1, y: 0, z: 0,
            angle: 0,
            attractorKey: 'lorenz',
            trailLength: 2000,
            speed: 3,
            autoRotate: true,
            frames: 0,
            lastTime: performance.now(),
        };
    }
    const s = stateRef.current;

    // Keep mutable refs in sync with React state
    s.attractorKey  = attractorKey;
    s.trailLength   = trailLength;
    s.speed         = speed;
    s.autoRotate    = autoRotate;

    const resetAttractor = (key) => {
        const a = ATTRACTORS[key];
        s.trail = [];
        [s.x, s.y, s.z] = [...a.init];
        s.angle = 0;
    };

    const init = (engine, width, height) => { resetAttractor('lorenz'); };

    const update = (dt, engine) => {
        const a = ATTRACTORS[s.attractorKey];
        // Step the ODE several times per frame for speed
        for (let i = 0; i < s.speed * 5; i++) {
            const [nx, ny, nz] = rk4(s.x, s.y, s.z, a.dt, a.deriv);
            s.x = nx; s.y = ny; s.z = nz;
            s.trail.push([nx, ny, nz]);
        }
        if (s.trail.length > s.trailLength) {
            s.trail.splice(0, s.trail.length - s.trailLength);
        }
        if (s.autoRotate) s.angle += 0.004;
    };

    const draw = (ctx, engine, width, height) => {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, width, height);

        const a    = ATTRACTORS[s.attractorKey];
        const cx   = width / 2 + a.cx * a.scale;
        const cy   = height / 2 - a.cy * a.scale;
        const cos  = Math.cos(s.angle);
        const sin  = Math.sin(s.angle);
        const len  = s.trail.length;
        if (len < 2) return;

        // Perspective project: rotate around Y, then project to 2D
        const project = ([px, py, pz]) => {
            const rx = px * cos - pz * sin;
            const rz = px * sin + pz * cos;
            const persp = 600 / (600 + rz);
            return [cx + rx * a.scale * persp, cy - py * a.scale * persp];
        };

        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        for (let i = 1; i < len; i++) {
            const t    = i / len;
            const alpha = t * 0.85 + 0.05;
            const base = a.color;
            ctx.strokeStyle = base + Math.floor(alpha * 255).toString(16).padStart(2,'0');
            const [x0, y0] = project(s.trail[i-1]);
            const [x1, y1] = project(s.trail[i]);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }

        // Glow dot at head
        const [hx, hy] = project(s.trail[len-1]);
        const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
        grd.addColorStop(0, a.color + 'ff');
        grd.addColorStop(1, a.color + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(hx, hy, 10, 0, Math.PI*2);
        ctx.fill();
    };

    const switchAttractor = (key) => {
        setAttractorKey(key);
        resetAttractor(key);
    };

    // ── Panel content ─────────────────────────────────────────────────────────
    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🌀</span>
                <h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-400">Strange Attractors</h2>
            </div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Chaos Theory · RK4</p>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <div>
                    <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">ATTRACTOR TYPE</p>
                    <div className="space-y-1.5">
                        {Object.entries(ATTRACTORS).map(([key, a]) => (
                            <button key={key} onClick={() => switchAttractor(key)}
                                className={`w-full py-2 px-3 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${
                                    attractorKey === key
                                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_15px_rgba(251,146,60,0.3)]'
                                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}>
                                <span>{a.icon}</span>{a.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-gray-400 text-[9px] font-bold tracking-wider">TRAIL LENGTH</label>
                            <span className="text-[9px] font-mono text-orange-400">{trailLength}</span>
                        </div>
                        <input type="range" min="200" max="6000" step="100" value={trailLength}
                            onChange={e => setTrailLength(+e.target.value)}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-orange-500 cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <label className="text-gray-400 text-[9px] font-bold tracking-wider">SPEED</label>
                            <span className="text-[9px] font-mono text-orange-400">{speed}x</span>
                        </div>
                        <input type="range" min="1" max="8" step="1" value={speed}
                            onChange={e => setSpeed(+e.target.value)}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-orange-500 cursor-pointer" />
                    </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                    <button onClick={() => setAutoRotate(r => !r)}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${
                            autoRotate ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}>
                        🔄 AUTO-ROTATE {autoRotate ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => resetAttractor(attractorKey)}
                        className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        RESET TRAIL
                    </button>
                    <button onClick={() => setShowScience(true)}
                        className="w-full py-2 bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-xl text-[10px] font-bold hover:bg-orange-500/20 hover:text-white transition-all flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                        THE SCIENCE
                    </button>
                </div>
            </div>
        </>
    );

    const renderMobilePanelContent = () => (
        <>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-lg">🌀</span>
                    <div>
                        <div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-400 leading-none">Strange Attractors</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Chaos · RK4</div>
                    </div>
                </div>
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">TYPE</span>
                        <span className="text-orange-400 font-mono text-xs leading-none">{ATTRACTORS[attractorKey].icon}</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">SPD</span>
                        <span className="text-orange-400 font-mono text-xs leading-none">{speed}x</span>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mt-2.5">
                {Object.entries(ATTRACTORS).map(([key, a]) => (
                    <button key={key} onClick={() => switchAttractor(key)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-bold transition-all ${
                            attractorKey === key
                                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_15px_rgba(251,146,60,0.25)]'
                                : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}>
                        {a.icon} {a.label}
                    </button>
                ))}
            </div>

            {isMobileExpanded && (
                <div className="mt-3 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight:'calc(65vh - 130px)'}}>
                    <div className="space-y-2.5 pt-1 border-t border-white/10">
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-gray-400 text-[9px] font-bold tracking-wider">TRAIL LENGTH</label>
                                <span className="text-[9px] font-mono text-orange-400">{trailLength}</span>
                            </div>
                            <input type="range" min="200" max="6000" step="100" value={trailLength}
                                onChange={e => setTrailLength(+e.target.value)}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-orange-500 cursor-pointer" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-gray-400 text-[9px] font-bold tracking-wider">SPEED</label>
                                <span className="text-[9px] font-mono text-orange-400">{speed}x</span>
                            </div>
                            <input type="range" min="1" max="8" step="1" value={speed}
                                onChange={e => setSpeed(+e.target.value)}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-orange-500 cursor-pointer" />
                        </div>
                    </div>
                    <div className="pt-2 border-t border-white/10 space-y-2">
                        <button onClick={() => setAutoRotate(r => !r)}
                            className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${
                                autoRotate ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-white/5 border-white/10 text-gray-400'
                            }`}>
                            🔄 AUTO-ROTATE {autoRotate ? 'ON' : 'OFF'}
                        </button>
                        <button onClick={() => resetAttractor(attractorKey)}
                            className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            RESET TRAIL
                        </button>
                        <button onClick={() => setShowScience(true)}
                            className="w-full py-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-xl text-[10px] font-bold hover:bg-orange-500/20 transition-all flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                            THE SCIENCE
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden select-none">
            {showScience && (
                <ScienceModal
                    title="Strange Attractors — Chaos Theory"
                    accentClass="text-orange-400 border-orange-400/30 bg-orange-400/10"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "What is a Strange Attractor?",
                            text: "A strange attractor is a set of points in phase space toward which a chaotic dynamical system evolves. Despite being deterministic, trajectories never repeat and are exquisitely sensitive to initial conditions — the hallmark of chaos. The Lorenz butterfly is the most famous example, discovered while modelling atmospheric convection.",
                        },
                        {
                            heading: "The Lorenz Equations",
                            text: "Edward Lorenz (1963) derived three coupled ODEs for convective fluid flow. With σ=10, ρ=28, β=8/3 the system produces a chaotic double-lobe 'butterfly' orbit that never closes.",
                            equations: [
                                { label: "dx/dt", value: "σ(y − x)       σ=10" },
                                { label: "dy/dt", value: "x(ρ − z) − y   ρ=28" },
                                { label: "dz/dt", value: "xy − βz         β=8/3" },
                            ],
                        },
                        {
                            heading: "RK4 Numerical Integration",
                            text: "The simulation uses fourth-order Runge-Kutta integration. RK4 evaluates the derivative 4 times per step and combines them with Simpson-weighted averaging, giving O(dt⁵) local error — far more accurate than Euler for the same step size.",
                            code:
`// One RK4 step for the Lorenz system
function rk4(x, y, z, dt, deriv) {
  const k1 = deriv(x, y, z);
  const k2 = deriv(x+dt/2*k1[0], y+dt/2*k1[1], z+dt/2*k1[2]);
  const k3 = deriv(x+dt/2*k2[0], y+dt/2*k2[1], z+dt/2*k2[2]);
  const k4 = deriv(x+dt*k3[0],   y+dt*k3[1],   z+dt*k3[2]);
  return [
    x + dt/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]),
    y + dt/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]),
    z + dt/6*(k1[2]+2*k2[2]+2*k3[2]+k4[2]),
  ];
}`
                        },
                        {
                            heading: "Sensitive Dependence on Initial Conditions",
                            text: "Two trajectories starting 0.0001 apart diverge exponentially, quantified by the Lyapunov exponent λ≈0.905 for Lorenz. This means predictability is lost after ~1/λ ≈ 1.1 time units — weather is chaotic for exactly this reason.",
                            equations: [
                                { label: "Divergence", value: "|δZ(t)| ≈ e^(λt) · |δZ₀|" },
                                { label: "Lorenz λ",   value: "λ ≈ 0.905" },
                            ],
                        },
                    ]}
                />
            )}

            <CanvasSimulation
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
            />

            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-900/15 rounded-full blur-[100px] pointer-events-none" />

            {/* Desktop toggle */}
            <button onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)}
                className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center transition-opacity duration-300 ui-panel hover:bg-white/10">
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>

            {/* Desktop panel */}
            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>
                {renderPanelContent()}
            </div>

            {/* Mobile bottom sheet */}
            <div
                className={`ui-panel md:hidden fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-3xl border-t border-white/15 rounded-t-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileExpanded ? 'h-[65vh]' : 'h-[110px]'}`}
                onTouchStart={e => { swipeRef.current.startY = e.touches[0].clientY; swipeRef.current.startX = e.touches[0].clientX; }}
                onTouchEnd={e => {
                    const dy = swipeRef.current.startY - e.changedTouches[0].clientY;
                    const dx = Math.abs(swipeRef.current.startX - e.changedTouches[0].clientX);
                    if (Math.abs(dy) > 40 && Math.abs(dy) > dx) setIsMobileExpanded(dy > 0);
                }}
            >
                <div className="w-full flex flex-col items-center pt-2 pb-1 cursor-pointer gap-1"
                    onClick={() => setIsMobileExpanded(!isMobileExpanded)}>
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-orange-400/50' : 'bg-white/30'}`} />
                    {!isMobileExpanded && <span className="text-[9px] text-white/30 tracking-widest uppercase animate-bounce">swipe up</span>}
                </div>
                <div className="px-4 pb-4">{renderMobilePanelContent()}</div>
            </div>

            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
