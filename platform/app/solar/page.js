"use client";
import { useState, useRef, useEffect } from "react";
import { AdBanner } from "@/shared/ads";
import ScienceModal from "@/components/ScienceModal";

// Real orbital data: [name, color, semi-major axis AU, period years, size px]
const PLANETS = [
    { name: 'Mercury', color: '#a8a8a8', a: 0.387, period: 0.241, size: 3 },
    { name: 'Venus',   color: '#e8c572', a: 0.723, period: 0.615, size: 4 },
    { name: 'Earth',   color: '#4fa3e0', a: 1.000, period: 1.000, size: 4.5 },
    { name: 'Mars',    color: '#c1440e', a: 1.524, period: 1.881, size: 3.5 },
    { name: 'Jupiter', color: '#c88b3a', a: 5.203, period: 11.86, size: 9 },
    { name: 'Saturn',  color: '#e4d191', a: 9.537, period: 29.46, size: 7.5 },
    { name: 'Uranus',  color: '#7de8e8', a: 19.19, period: 84.01, size: 6 },
    { name: 'Neptune', color: '#5b7fde', a: 30.07, period: 164.8, size: 5.5 },
];

export default function SolarPage() {
    const canvasRef = useRef(null);
    const animRef   = useRef(null);
    const tRef      = useRef(0);

    const [timeSpeed,    setTimeSpeed]    = useState(50);
    const [showOrbits,   setShowOrbits]   = useState(true);
    const [showLabels,   setShowLabels]   = useState(true);
    const [followPlanet, setFollowPlanet] = useState(-1);  // -1 = sun centred
    const [showScience,  setShowScience]  = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const swipeRef = useRef({ startY: 0, startX: 0 });
    const settingsRef = useRef({});
    settingsRef.current = { timeSpeed, showOrbits, showLabels, followPlanet };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();

        let lastTime = performance.now();
        const loop = (now) => {
            animRef.current = requestAnimationFrame(loop);
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            const s = settingsRef.current;
            tRef.current += dt * s.timeSpeed * 0.01; // years

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000008';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Scale: 1 AU = scale pixels
            const scale = Math.min(canvas.width, canvas.height) * 0.42 / 30.07;
            let cx = canvas.width/2, cy = canvas.height/2;

            // If following a planet, offset canvas origin
            const fp = s.followPlanet;
            if (fp >= 0 && fp < PLANETS.length) {
                const p = PLANETS[fp];
                const ang = (tRef.current / p.period) * Math.PI * 2;
                cx -= Math.cos(ang) * p.a * scale;
                cy -= Math.sin(ang) * p.a * scale;
            }

            // Stars (static)
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            // draw a few fixed stars based on canvas size
            const starSeed = 42;
            for (let i = 0; i < 120; i++) {
                const sx = ((i * 137.508 * starSeed) % canvas.width);
                const sy = ((i * 97.31 * starSeed + 50) % canvas.height);
                ctx.fillRect(sx, sy, 1, 1);
            }

            // Draw orbits
            if (s.showOrbits) {
                PLANETS.forEach(p => {
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, p.a * scale, p.a * scale, 0, 0, Math.PI*2);
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            }

            // Sun
            const sunGrd = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
            sunGrd.addColorStop(0, '#fff7aa'); sunGrd.addColorStop(0.4, '#fde68a'); sunGrd.addColorStop(1, '#f97316' + '00');
            ctx.fillStyle = sunGrd;
            ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fde68a';
            ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.fill();

            // Planets
            PLANETS.forEach(p => {
                const ang = (tRef.current / p.period) * Math.PI * 2;
                const px = cx + Math.cos(ang) * p.a * scale;
                const py = cy + Math.sin(ang) * p.a * scale;

                // Glow
                const grd = ctx.createRadialGradient(px, py, 0, px, py, p.size*2.5);
                grd.addColorStop(0, p.color); grd.addColorStop(1, p.color + '00');
                ctx.fillStyle = grd;
                ctx.beginPath(); ctx.arc(px, py, p.size*2.5, 0, Math.PI*2); ctx.fill();

                // Planet dot
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2); ctx.fill();

                // Saturn ring
                if (p.name === 'Saturn') {
                    ctx.beginPath();
                    ctx.ellipse(px, py, p.size*2.2, p.size*0.7, 0.3, 0, Math.PI*2);
                    ctx.strokeStyle = p.color + '80'; ctx.lineWidth = 2.5; ctx.stroke();
                }

                if (s.showLabels) {
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText(p.name, px, py - p.size - 5);
                }
            });
        };
        loop(performance.now());
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current); };
    }, []);

    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1"><span className="text-xl">🪐</span><h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-slate-400">Solar System</h2></div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Newtonian Orbital Mechanics</p>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="space-y-1">
                    <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">TIME SPEED</label><span className="text-[9px] font-mono text-violet-400">{timeSpeed}x</span></div>
                    <input type="range" min="1" max="500" step="1" value={timeSpeed} onChange={e => setTimeSpeed(+e.target.value)} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-violet-500 cursor-pointer" />
                </div>
                <div className="space-y-1.5">
                    <button onClick={() => setShowOrbits(o => !o)} className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${showOrbits ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>○ ORBITS {showOrbits ? 'ON' : 'OFF'}</button>
                    <button onClick={() => setShowLabels(l => !l)} className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${showLabels ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>🏷 LABELS {showLabels ? 'ON' : 'OFF'}</button>
                </div>
                <div>
                    <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">FOLLOW PLANET</p>
                    <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => setFollowPlanet(-1)} className={`py-1.5 rounded-lg text-[9px] font-bold transition-all border ${followPlanet===-1 ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>☀ Sun</button>
                        {PLANETS.map((p, i) => (
                            <button key={i} onClick={() => setFollowPlanet(i)} className={`py-1.5 rounded-lg text-[9px] font-bold transition-all border ${followPlanet===i ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`} style={{color: followPlanet===i ? undefined : p.color+'bb'}}>{p.name}</button>
                        ))}
                    </div>
                </div>
                <div className="pt-2 border-t border-white/10">
                    <button onClick={() => setShowScience(true)} className="w-full py-2 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-xl text-[10px] font-bold hover:bg-violet-500/20 transition-all flex items-center justify-center gap-1.5">
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
                <div className="flex items-center gap-1.5 shrink-0"><span className="text-lg">🪐</span>
                    <div><div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-slate-400 leading-none">Solar System</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Orbital Mechanics</div></div>
                </div>
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">SPD</span>
                        <span className="text-violet-400 font-mono text-xs leading-none">{timeSpeed}x</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 mt-2.5">
                <button onClick={() => setShowOrbits(o => !o)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${showOrbits ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 text-gray-400 border-white/10'}`}>○ ORBITS</button>
                <button onClick={() => setShowLabels(l => !l)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${showLabels ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 text-gray-400 border-white/10'}`}>🏷 LABELS</button>
            </div>
            {isMobileExpanded && (
                <div className="mt-3 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight:'calc(65vh - 130px)'}}>
                    <div className="space-y-1 pt-1 border-t border-white/10">
                        <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">TIME SPEED</label><span className="text-[9px] font-mono text-violet-400">{timeSpeed}x</span></div>
                        <input type="range" min="1" max="500" step="1" value={timeSpeed} onChange={e => setTimeSpeed(+e.target.value)} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-violet-500 cursor-pointer" />
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-1.5">FOLLOW PLANET</p>
                        <div className="grid grid-cols-3 gap-1">
                            <button onClick={() => setFollowPlanet(-1)} className={`py-1.5 rounded-lg text-[9px] font-bold border ${followPlanet===-1 ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>☀ Sun</button>
                            {PLANETS.slice(0,8).map((p, i) => (
                                <button key={i} onClick={() => setFollowPlanet(i)} className={`py-1.5 rounded-lg text-[9px] font-bold border ${followPlanet===i ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{p.name.slice(0,3)}</button>
                            ))}
                        </div>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                        <button onClick={() => setShowScience(true)} className="w-full py-2.5 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
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
                <ScienceModal title="Solar System — Orbital Mechanics" accentClass="text-violet-400 border-violet-400/30 bg-violet-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Kepler's Three Laws", text: "Johannes Kepler (1609–1619) described planetary motion empirically. Newton later derived all three laws from his universal law of gravitation.", equations: [{ label: "1st Law", value: "Planets orbit in ellipses with the Sun at one focus" }, { label: "2nd Law", value: "Equal areas swept in equal times (conserves angular momentum)" }, { label: "3rd Law", value: "T² ∝ a³  →  T² = a³ (in years/AU)" }] },
                        { heading: "Orbital Period", text: "Kepler's Third Law states that the square of a planet's orbital period is proportional to the cube of its semi-major axis. Earth (1 AU, 1 year) is the reference. Jupiter at 5.2 AU takes √(5.2³) ≈ 11.86 years — exactly as observed.", equations: [{ label: "Period", value: "T = a^(3/2)  years  (a in AU)" }, { label: "Jupiter", value: "T = 5.2^(3/2) ≈ 11.86 yr ✓" }] },
                        { heading: "Why Ellipses?", text: "Under inverse-square gravity, the only closed orbits are ellipses (conic sections with e < 1). Parabolic (e=1) and hyperbolic (e>1) paths are escape trajectories. All planetary orbits have near-zero eccentricity — nearly circular — because high-eccentricity orbits tend to be unstable over billions of years." },
                    ]} />
            )}
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none" style={{width:'100vw', height:'100vh'}} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />
            <button onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)} className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center ui-panel hover:bg-white/10">
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>{renderPanelContent()}</div>
            <div className={`ui-panel md:hidden fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-3xl border-t border-white/15 rounded-t-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileExpanded ? 'h-[65vh]' : 'h-[110px]'}`}
                onTouchStart={e => { swipeRef.current.startY = e.touches[0].clientY; swipeRef.current.startX = e.touches[0].clientX; }}
                onTouchEnd={e => { const dy = swipeRef.current.startY - e.changedTouches[0].clientY; const dx = Math.abs(swipeRef.current.startX - e.changedTouches[0].clientX); if (Math.abs(dy) > 40 && Math.abs(dy) > dx) setIsMobileExpanded(dy > 0); }}>
                <div className="w-full flex flex-col items-center pt-2 pb-1 cursor-pointer gap-1" onClick={() => setIsMobileExpanded(!isMobileExpanded)}>
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-violet-400/50' : 'bg-white/30'}`} />
                    {!isMobileExpanded && <span className="text-[9px] text-white/30 tracking-widest uppercase animate-bounce">swipe up</span>}
                </div>
                <div className="px-4 pb-4">{renderMobilePanelContent()}</div>
            </div>
            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
