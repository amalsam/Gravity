"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AdBanner } from "@/shared/ads";
import ScienceModal from "@/components/ScienceModal";

// Magnet positions (equilateral triangle centred on canvas)
const getMagnetPositions = (cx, cy, count) => {
    const r = 100;
    const positions = [];
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        positions.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return positions;
};

const MAGNET_COLORS = ['#22d3ee', '#38bdf8', '#7dd3fc', '#a78bfa', '#fb7185'];

export default function PendulumPage() {
    const canvasRef  = useRef(null);
    const workerRef  = useRef(null);
    const drawingRef = useRef(false);

    const [magnetCount,  setMagnetCount]  = useState(3);
    const [damping,      setDamping]      = useState(0.3);
    const [strength,     setStrength]     = useState(1.0);
    const [resolution,   setResolution]   = useState(2);   // pixel block size: 2,3,5
    const [computing,    setComputing]    = useState(false);
    const [showScience,  setShowScience]  = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const swipeRef = useRef({ startY: 0, startX: 0 });

    const compute = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || drawingRef.current) return;
        drawingRef.current = true;
        setComputing(true);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2, cy = canvas.height / 2;
        const magnets = getMagnetPositions(cx, cy, magnetCount);
        const d = damping, s = strength;
        const block = resolution;
        const W = canvas.width, H = canvas.height;

        // Simulate the pendulum from each starting position
        const DT = 0.05, MAX_STEPS = 500;
        const simulate = (x0, y0) => {
            // Pendulum hangs from (cx,cy), initial position offset by (x0-cx, y0-cy)/scale
            let px = (x0-cx)*0.008, py = (y0-cy)*0.008;
            let vx = 0, vy = 0;
            for (let t = 0; t < MAX_STEPS; t++) {
                let fx = -d*vx - px*0.2;  // spring + damping
                let fy = -d*vy - py*0.2;
                for (const m of magnets) {
                    const dx = (m.x-cx)*0.008 - px;
                    const dy = (m.y-cy)*0.008 - py;
                    const r2 = dx*dx+dy*dy+0.01;
                    const r  = Math.sqrt(r2);
                    const f  = s / (r2*r);
                    fx += dx*f; fy += dy*f;
                }
                vx += fx*DT; vy += fy*DT;
                px += vx*DT; py += vy*DT;
                // Check if settled near a magnet
                for (let i = 0; i < magnets.length; i++) {
                    const m = magnets[i];
                    const dx = (m.x-cx)*0.008-px, dy = (m.y-cy)*0.008-py;
                    if (Math.sqrt(dx*dx+dy*dy) < 0.05) return i;
                }
            }
            return -1; // didn't settle
        };

        // Draw in chunks to not block UI
        let x = 0;
        const drawChunk = () => {
            const end = Math.min(x + 20*block, W);
            for (; x < end; x += block) {
                for (let y = 0; y < H; y += block) {
                    const m = simulate(x, y);
                    const color = m >= 0 ? MAGNET_COLORS[m] : '#1a1a2e';
                    const bright = Math.random()*0.3+0.7;
                    ctx.fillStyle = color;
                    ctx.globalAlpha = bright;
                    ctx.fillRect(x, y, block, block);
                }
            }
            ctx.globalAlpha = 1;
            // Draw magnets on top
            const mx2 = getMagnetPositions(cx, cy, magnetCount);
            mx2.forEach((m, i) => {
                ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, Math.PI*2);
                ctx.fillStyle = MAGNET_COLORS[i]; ctx.fill();
                ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI*2);
                ctx.fillStyle = '#fff'; ctx.fill();
            });
            if (x < W) { requestAnimationFrame(drawChunk); }
            else { drawingRef.current = false; setComputing(false); }
        };
        requestAnimationFrame(drawChunk);
    }, [magnetCount, damping, strength, resolution]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; compute(); };
        window.addEventListener('resize', resize); resize();
        return () => window.removeEventListener('resize', resize);
    }, [compute]);

    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1"><span className="text-xl">🧲</span><h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-400">Magnetic Pendulum</h2></div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Fractal Chaos</p>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <div><p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">MAGNET COUNT</p>
                    <div className="flex gap-1.5">{[3,4,5].map(n => (
                        <button key={n} onClick={() => setMagnetCount(n)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${magnetCount===n ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{n}</button>
                    ))}</div>
                </div>
                {[
                    { label: 'DAMPING', val: damping, set: setDamping, min: 0.05, max: 1.0, step: 0.05, color: 'text-cyan-400', accent: 'accent-cyan-500' },
                    { label: 'MAGNET STRENGTH', val: strength, set: setStrength, min: 0.2, max: 3.0, step: 0.1, color: 'text-cyan-400', accent: 'accent-cyan-500' },
                ].map(({ label, val, set, min, max, step, color, accent }) => (
                    <div key={label} className="space-y-1">
                        <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">{label}</label><span className={`text-[9px] font-mono ${color}`}>{val.toFixed(2)}</span></div>
                        <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(+e.target.value)} className={`w-full h-1 bg-gray-700 rounded-lg appearance-none ${accent} cursor-pointer`} />
                    </div>
                ))}
                <div><p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">RESOLUTION</p>
                    <div className="flex gap-1.5">{[{l:'Low',v:5},{l:'Med',v:3},{l:'High',v:1}].map(({l,v}) => (
                        <button key={v} onClick={() => setResolution(v)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${resolution===v ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{l}</button>
                    ))}</div>
                </div>
                <div className="pt-2 border-t border-white/10 space-y-2">
                    <button onClick={compute} disabled={computing}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${computing ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-gray-400' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30'}`}>
                        {computing ? '⏳ COMPUTING...' : '🔄 RECOMPUTE FRACTAL'}
                    </button>
                    <button onClick={() => setShowScience(true)} className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-xl text-[10px] font-bold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5">
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
                <div className="flex items-center gap-1.5 shrink-0"><span className="text-lg">🧲</span>
                    <div><div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-sky-400 leading-none">Magnetic Pendulum</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Fractal Chaos</div></div>
                </div>
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">MAGS</span>
                        <span className="text-cyan-400 font-mono text-xs leading-none">{magnetCount}</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">STAT</span>
                        <span className={`font-mono text-xs leading-none ${computing ? 'text-yellow-400' : 'text-emerald-400'}`}>{computing ? '…' : 'OK'}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 mt-2.5">
                {[3,4,5].map(n => (
                    <button key={n} onClick={() => setMagnetCount(n)}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${magnetCount===n ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/5 text-gray-400 border-white/10'}`}>{n} Magnets</button>
                ))}
            </div>
            {isMobileExpanded && (
                <div className="mt-3 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight:'calc(65vh - 130px)'}}>
                    <div className="pt-1 border-t border-white/10 space-y-2">
                        {[
                            { label: 'DAMPING', val: damping, set: setDamping, min: 0.05, max: 1.0, step: 0.05 },
                            { label: 'MAGNET STRENGTH', val: strength, set: setStrength, min: 0.2, max: 3.0, step: 0.1 },
                        ].map(({ label, val, set, min, max, step }) => (
                            <div key={label} className="space-y-1">
                                <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">{label}</label><span className="text-[9px] font-mono text-cyan-400">{val.toFixed(2)}</span></div>
                                <input type="range" min={min} max={max} step={step} value={val} onChange={e => set(+e.target.value)} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-cyan-500 cursor-pointer" />
                            </div>
                        ))}
                        <div><p className="text-[9px] text-gray-500 font-bold tracking-wider mb-1.5">RESOLUTION</p>
                            <div className="flex gap-1.5">{[{l:'Low',v:5},{l:'Med',v:3},{l:'High',v:1}].map(({l,v}) => (
                                <button key={v} onClick={() => setResolution(v)} className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${resolution===v ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{l}</button>
                            ))}</div>
                        </div>
                        <button onClick={compute} disabled={computing} className={`w-full py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${computing ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-gray-400' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'}`}>{computing ? '⏳ COMPUTING...' : '🔄 RECOMPUTE'}</button>
                        <button onClick={() => setShowScience(true)} className="w-full py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
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
                <ScienceModal title="Magnetic Pendulum — Fractal Chaos" accentClass="text-cyan-400 border-cyan-400/30 bg-cyan-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "The Magnetic Pendulum System", text: "A pendulum swings freely above N fixed magnets embedded in a surface below. The competing attractive forces from each magnet and the restoring spring force of the pendulum rod create a surprisingly complex system. Even infinitesimally different starting positions can lead to dramatically different final magnets — a hallmark of chaos." },
                        { heading: "Basin of Attraction", text: "The colour map you see is called a basin-of-attraction diagram. Every pixel represents a starting position. Its colour is determined by which magnet the pendulum eventually settles above. At smooth boundaries between colour regions, the system is well-behaved. But where all three colours meet, the boundary is fractal — infinitely detailed at every zoom level.", equations: [{ label: "Pendulum ODE", value: "ẍ = -d·ẋ - k·x + Σ f_i(x,y)" }, { label: "Magnet force", value: "f_i = s·(m_i - x) / |m_i - x|³" }] },
                        { heading: "Sensitive Dependence", text: "Points on the fractal boundary never truly settle — they are the chaotic regime where arbitrarily small uncertainties in initial position lead to completely different outcomes. This is why long-range weather prediction is fundamentally impossible: the atmosphere is governed by similar chaotic equations." },
                    ]} />
            )}
            <canvas ref={canvasRef} className="block w-full h-full bg-black" style={{width:'100vw', height:'100vh'}} />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
            <button onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)} className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center ui-panel hover:bg-white/10">
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>{renderPanelContent()}</div>
            <div className={`ui-panel md:hidden fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-3xl border-t border-white/15 rounded-t-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileExpanded ? 'h-[65vh]' : 'h-[110px]'}`}
                onTouchStart={e => { swipeRef.current.startY = e.touches[0].clientY; swipeRef.current.startX = e.touches[0].clientX; }}
                onTouchEnd={e => { const dy = swipeRef.current.startY - e.changedTouches[0].clientY; const dx = Math.abs(swipeRef.current.startX - e.changedTouches[0].clientX); if (Math.abs(dy) > 40 && Math.abs(dy) > dx) setIsMobileExpanded(dy > 0); }}>
                <div className="w-full flex flex-col items-center pt-2 pb-1 cursor-pointer gap-1" onClick={() => setIsMobileExpanded(!isMobileExpanded)}>
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-cyan-400/50' : 'bg-white/30'}`} />
                    {!isMobileExpanded && <span className="text-[9px] text-white/30 tracking-widest uppercase animate-bounce">swipe up</span>}
                </div>
                <div className="px-4 pb-4">{renderMobilePanelContent()}</div>
            </div>
            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
