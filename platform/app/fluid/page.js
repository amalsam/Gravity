"use client";
import { useState, useRef, useEffect } from "react";
import { AdBanner } from "@/shared/ads";
import ScienceModal from "@/components/ScienceModal";

// ── Minimal 2D SPH fluid ──────────────────────────────────────────────────────
const H    = 30;   // smoothing radius
const REST = 12;   // rest density
const K    = 80;   // pressure stiffness
const VISC = 15;   // viscosity
const DT   = 0.016;

const poly6  = (r2, h) => { const d = h*h-r2; return d > 0 ? 315/(64*Math.PI*h**9)*d**3 : 0; };
const spiky  = (r, h)  => { const d = h-r;  return d > 0 ? -45/(Math.PI*h**6)*d**2 : 0; };
const viscK  = (r, h)  => { const d = h-r;  return d > 0 ? 45/(Math.PI*h**6)*d : 0; };

class Particle {
    constructor(x, y) {
        this.x=x; this.y=y; this.vx=0; this.vy=0;
        this.density=0; this.pressure=0;
        this.fx=0; this.fy=0;
    }
}

export default function FluidPage() {
    const canvasRef = useRef(null);
    const animRef   = useRef(null);
    const particles = useRef([]);
    const colorMode = useRef('speed');

    const [gravity,    setGravity]    = useState('down');
    const [viscosity,  setViscosity]  = useState(15);
    const [count,      setCount]      = useState(0);
    const [colorModeS, setColorModeS] = useState('speed');
    const [showScience, setShowScience]  = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const swipeRef = useRef({ startY: 0, startX: 0 });

    const settingsRef = useRef({});
    settingsRef.current = { gravity, viscosity, colorMode: colorModeS };
    colorMode.current = colorModeS;

    const spawnParticles = (x, y) => {
        for (let i = 0; i < 12; i++) {
            const p = new Particle(x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*20);
            p.vx = (Math.random()-0.5)*30; p.vy = (Math.random()-0.5)*30;
            if (particles.current.length < 600) particles.current.push(p);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();

        // Initial fluid drop
        for (let x = canvas.width/2 - 60; x < canvas.width/2 + 60; x += 12)
            for (let y = 80; y < 200; y += 12)
                particles.current.push(new Particle(x, y));

        let dragging = false;
        const onDown = (e) => {
            if (e.target.closest('.ui-panel') || e.target.closest('nav')) return;
            dragging = true;
            const cx = e.clientX || e.touches[0].clientX;
            const cy = (e.clientY || e.touches[0].clientY) - 64;
            spawnParticles(cx, cy);
        };
        const onMove = (e) => {
            if (!dragging) return;
            const cx = e.clientX || (e.touches && e.touches[0].clientX);
            const cy = (e.clientY || (e.touches && e.touches[0].clientY)) - 64;
            if (cx && cy) spawnParticles(cx, cy);
        };
        const onUp = () => { dragging = false; };

        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('touchstart', onDown, { passive: true });
        canvas.addEventListener('touchmove',  onMove, { passive: true });
        window.addEventListener('mouseup',   onUp);
        window.addEventListener('touchend',  onUp);

        const ctx = canvas.getContext('2d');
        let frameCount = 0;

        const loop = () => {
            animRef.current = requestAnimationFrame(loop);
            const ps = particles.current;
            const s  = settingsRef.current;
            const visc = s.viscosity;
            const W = canvas.width, H2 = canvas.height;

            // Gravity vector
            let gx = 0, gy = 0;
            if (s.gravity === 'down')  gy = 200;
            if (s.gravity === 'up')    gy = -200;
            if (s.gravity === 'zero')  { gx = 0; gy = 0; }

            const n = ps.length;
            // Density + pressure
            for (const p of ps) {
                p.density = 0;
                for (const q of ps) {
                    const dx=q.x-p.x, dy=q.y-p.y;
                    const r2=dx*dx+dy*dy;
                    if (r2 < H*H) p.density += poly6(r2, H);
                }
                p.pressure = K * (p.density - REST);
            }
            // Forces
            for (const p of ps) {
                p.fx = gx; p.fy = gy;
                for (const q of ps) {
                    if (p===q) continue;
                    const dx=q.x-p.x, dy=q.y-p.y;
                    const r=Math.sqrt(dx*dx+dy*dy);
                    if (r < H && r > 0) {
                        const dir_x=dx/r, dir_y=dy/r;
                        const pf = -(p.pressure+q.pressure)/(2*q.density+0.001)*spiky(r,H);
                        p.fx += dir_x*pf;
                        p.fy += dir_y*pf;
                        const vf = visc/q.density*(q.vx-p.vx)*viscK(r,H);
                        p.fx += vf;
                        p.fy += visc/q.density*(q.vy-p.vy)*viscK(r,H);
                    }
                }
            }
            // Integrate
            for (const p of ps) {
                const dens = Math.max(p.density, 0.001);
                p.vx += p.fx/dens*DT; p.vy += p.fy/dens*DT;
                p.x += p.vx*DT;       p.y += p.vy*DT;
                // Boundary
                const bounce = 0.3;
                if (p.x < 5)        { p.x = 5;    p.vx *= -bounce; }
                if (p.x > W-5)      { p.x = W-5;  p.vx *= -bounce; }
                if (p.y < 5)        { p.y = 5;    p.vy *= -bounce; }
                if (p.y > H2-5)     { p.y = H2-5; p.vy *= -bounce; }
            }

            // Draw
            ctx.fillStyle = 'rgba(0,0,12,0.4)';
            ctx.fillRect(0, 0, W, H2);
            for (const p of ps) {
                const spd = Math.sqrt(p.vx*p.vx+p.vy*p.vy);
                let color;
                if (colorMode.current === 'speed') {
                    const t = Math.min(spd/150, 1);
                    const r = Math.floor(t*100+55*(1-t));
                    const g = Math.floor((1-t)*80);
                    const b = Math.floor((1-t)*220+t*40);
                    color = `rgb(${r},${g},${b})`;
                } else if (colorMode.current === 'density') {
                    const t = Math.min(p.density/20, 1);
                    color = `hsl(${200+t*60},80%,${40+t*30}%)`;
                } else {
                    color = '#6366f1';
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI*2);
                ctx.fillStyle = color;
                ctx.shadowBlur = 4; ctx.shadowColor = color;
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            if (++frameCount % 20 === 0) setCount(particles.current.length);
        };
        loop();

        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousedown', onDown);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('touchstart', onDown);
            canvas.removeEventListener('touchmove',  onMove);
            window.removeEventListener('mouseup',   onUp);
            window.removeEventListener('touchend',  onUp);
            cancelAnimationFrame(animRef.current);
        };
    }, []);

    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1"><span className="text-xl">🌊</span><h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-500">Fluid SPH</h2></div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Smoothed Particle Hydrodynamics</p>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="flex flex-col"><span className="text-gray-500 text-[9px] font-bold">PARTICLES</span><span className="text-white font-mono text-lg">{count}</span></div>
                    <div className="flex flex-col border-l border-white/10 pl-3"><span className="text-gray-500 text-[9px] font-bold">GRAVITY</span><span className="text-indigo-400 font-mono text-sm">{gravity}</span></div>
                </div>
                <div className="bg-indigo-500/5 border border-indigo-500/15 p-2.5 rounded-xl">
                    <p className="text-[10px] text-indigo-200"><strong className="text-white">Drag</strong> on canvas to spawn fluid particles.</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">GRAVITY</p>
                    <div className="flex gap-1.5">
                        {['down','zero','up'].map(g => (
                            <button key={g} onClick={() => setGravity(g)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${gravity===g ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                {g==='down'?'↓':g==='up'?'↑':'○'} {g}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">VISCOSITY</label><span className="text-[9px] font-mono text-indigo-400">{viscosity}</span></div>
                    <input type="range" min="1" max="50" step="1" value={viscosity} onChange={e => setViscosity(+e.target.value)} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-indigo-500 cursor-pointer" />
                </div>
                <div>
                    <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">COLOUR MODE</p>
                    <div className="flex gap-1.5">
                        {['speed','density','flat'].map(m => (
                            <button key={m} onClick={() => setColorModeS(m)}
                                className={`flex-1 py-1.5 rounded-xl text-[9px] font-bold transition-all border capitalize ${colorModeS===m ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{m}</button>
                        ))}
                    </div>
                </div>
                <div className="pt-2 border-t border-white/10 space-y-2">
                    <button onClick={() => { particles.current = []; setCount(0); }} className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        CLEAR FLUID
                    </button>
                    <button onClick={() => setShowScience(true)} className="w-full py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-xl text-[10px] font-bold hover:bg-indigo-500/20 transition-all flex items-center justify-center gap-1.5">
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
                <div className="flex items-center gap-1.5 shrink-0"><span className="text-lg">🌊</span>
                    <div><div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-500 leading-none">Fluid SPH</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Hydrodynamics</div></div>
                </div>
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">PTC</span>
                        <span className="text-white font-mono text-xs leading-none">{count}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-1.5 mt-2.5">
                {['down','zero','up'].map(g => (
                    <button key={g} onClick={() => setGravity(g)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${gravity===g ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                        {g==='down'?'↓':g==='up'?'↑':'○'}
                    </button>
                ))}
            </div>
            {isMobileExpanded && (
                <div className="mt-3 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight:'calc(65vh - 130px)'}}>
                    <div className="pt-1 border-t border-white/10 space-y-2">
                        <div className="space-y-1">
                            <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">VISCOSITY</label><span className="text-[9px] font-mono text-indigo-400">{viscosity}</span></div>
                            <input type="range" min="1" max="50" step="1" value={viscosity} onChange={e => setViscosity(+e.target.value)} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-indigo-500 cursor-pointer" />
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-1.5">COLOUR MODE</p>
                            <div className="flex gap-1.5">{['speed','density','flat'].map(m => (<button key={m} onClick={() => setColorModeS(m)} className={`flex-1 py-1.5 rounded-xl text-[9px] font-bold transition-all border capitalize ${colorModeS===m ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{m}</button>))}</div>
                        </div>
                        <button onClick={() => { particles.current = []; setCount(0); }} className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            CLEAR FLUID
                        </button>
                        <button onClick={() => setShowScience(true)} className="w-full py-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
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
                <ScienceModal title="Fluid SPH — Smoothed Particle Hydrodynamics" accentClass="text-indigo-400 border-indigo-400/30 bg-indigo-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Smoothed Particle Hydrodynamics", text: "SPH is a mesh-free particle method for simulating fluid flows. Each particle carries fluid properties (density, pressure, velocity). Properties at any point in space are estimated by averaging nearby particle values, weighted by a smooth kernel function W(r, h) that falls off with distance h." },
                        { heading: "Kernel Functions & Density", text: "The Poly6 kernel estimates density at each particle by summing contributions from neighbours within smoothing radius h. Pressure is derived from density via an equation of state.",
                            equations: [{ label: "Density", value: "ρᵢ = Σⱼ mⱼ · W(|rᵢ-rⱼ|, h)" }, { label: "Pressure", value: "pᵢ = k(ρᵢ - ρ_rest)" }, { label: "W(r,h)", value: "315/(64πh⁹) · (h²-r²)³" }] },
                        { heading: "Pressure & Viscosity Forces", code: `// Pressure force between particles i and j\nconst pForce = -(p.pressure + q.pressure)\n  / (2 * q.density) * spiky(r, h);\n\n// Viscosity smooths velocity differences\nconst vForce = VISC / q.density\n  * (q.vx - p.vx) * viscLaplacian(r, h);` },
                    ]} />
            )}
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none" style={{width:'100vw', height:'100vh'}} />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
            <button onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)} className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center ui-panel hover:bg-white/10">
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>{renderPanelContent()}</div>
            <div className={`ui-panel md:hidden fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-3xl border-t border-white/15 rounded-t-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileExpanded ? 'h-[65vh]' : 'h-[110px]'}`}
                onTouchStart={e => { swipeRef.current.startY = e.touches[0].clientY; swipeRef.current.startX = e.touches[0].clientX; }}
                onTouchEnd={e => { const dy = swipeRef.current.startY - e.changedTouches[0].clientY; const dx = Math.abs(swipeRef.current.startX - e.changedTouches[0].clientX); if (Math.abs(dy) > 40 && Math.abs(dy) > dx) setIsMobileExpanded(dy > 0); }}>
                <div className="w-full flex flex-col items-center pt-2 pb-1 cursor-pointer gap-1" onClick={() => setIsMobileExpanded(!isMobileExpanded)}>
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-indigo-400/50' : 'bg-white/30'}`} />
                    {!isMobileExpanded && <span className="text-[9px] text-white/30 tracking-widest uppercase animate-bounce">swipe up</span>}
                </div>
                <div className="px-4 pb-4">{renderMobilePanelContent()}</div>
            </div>
            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
