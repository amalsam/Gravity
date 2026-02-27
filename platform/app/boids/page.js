"use client";

import { useState, useRef, useEffect } from "react";
import { AdBanner } from "@/shared/ads";
import ScienceModal from "@/components/ScienceModal";

export default function BoidsPage() {
    const canvasRef = useRef(null);
    const stateRef = useRef(null);
    const animRef  = useRef(null);

    const [boidCount,    setBoidCount]    = useState(180);
    const [separation,   setSeparation]   = useState(1.5);
    const [alignment,    setAlignment]    = useState(1.0);
    const [cohesion,     setCohesion]     = useState(1.0);
    const [visualRadius, setVisualRadius] = useState(80);
    const [predator,     setPredator]     = useState(false);
    const [showTrails,   setShowTrails]   = useState(false);
    const [showScience,  setShowScience]  = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const swipeRef = useRef({ startY: 0, startX: 0 });

    // Keep settings accessible to animation loop without closure issues
    const settingsRef = useRef({});
    settingsRef.current = { boidCount, separation, alignment, cohesion, visualRadius, predator, showTrails };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const ctx = canvas.getContext('2d');

        // ── Boid class ────────────────────────────────────────────────────────
        class Boid {
            constructor(isPredator = false) {
                this.x  = Math.random() * canvas.width;
                this.y  = Math.random() * canvas.height;
                const a = Math.random() * Math.PI * 2;
                const spd = isPredator ? 3.5 : 2.5 + Math.random();
                this.vx = Math.cos(a) * spd;
                this.vy = Math.sin(a) * spd;
                this.isPredator = isPredator;
                this.history = [];
            }

            steer(boids) {
                const s = settingsRef.current;
                const R = s.visualRadius;
                const MAX  = this.isPredator ? 4.5  : 3.5;
                const MAXF = this.isPredator ? 0.25 : 0.15;

                let sepX=0,sepY=0,sepN=0;
                let aliX=0,aliY=0,aliN=0;
                let cohX=0,cohY=0,cohN=0;
                let fleeX=0,fleeY=0;

                for (const b of boids) {
                    if (b === this) continue;
                    const dx = b.x - this.x, dy = b.y - this.y;
                    const d  = Math.sqrt(dx*dx+dy*dy);

                    if (!this.isPredator && b.isPredator && d < R * 2.5) {
                        // Flee from predator
                        fleeX -= dx/d * 3; fleeY -= dy/d * 3;
                    }
                    if (this.isPredator && !b.isPredator && d < R * 1.5) {
                        // Chase prey
                        fleeX += dx/d; fleeY += dy/d;
                    }
                    if (b.isPredator !== this.isPredator) continue;
                    if (d > R || d < 0.01) continue;

                    // Separation (closer = stronger repulsion)
                    if (d < R * 0.35) { sepX -= dx/(d*d+0.1); sepY -= dy/(d*d+0.1); sepN++; }
                    // Alignment
                    aliX += b.vx; aliY += b.vy; aliN++;
                    // Cohesion
                    cohX += b.x;  cohY += b.y;  cohN++;
                }

                const limit = (fx, fy, max) => {
                    const m = Math.sqrt(fx*fx+fy*fy);
                    return m > max ? [fx/m*max, fy/m*max] : [fx, fy];
                };

                let fx=0, fy=0;
                if (sepN) { const [x,y]=limit(sepX,sepY,MAXF); fx+=x*s.separation; fy+=y*s.separation; }
                if (aliN) {
                    const tx=aliX/aliN-this.vx, ty=aliY/aliN-this.vy;
                    const [x,y]=limit(tx,ty,MAXF); fx+=x*s.alignment; fy+=y*s.alignment;
                }
                if (cohN) {
                    const tx=cohX/cohN-this.x, ty=cohY/cohN-this.y;
                    const [x,y]=limit(tx,ty,MAXF); fx+=x*s.cohesion; fy+=y*s.cohesion;
                }
                fx += fleeX*MAXF*2; fy += fleeY*MAXF*2;

                this.vx += fx; this.vy += fy;
                // Clamp speed
                const speed = Math.sqrt(this.vx*this.vx+this.vy*this.vy);
                const minS = this.isPredator ? 2.5 : 1.5;
                if (speed > MAX)     { this.vx = this.vx/speed*MAX; this.vy = this.vy/speed*MAX; }
                if (speed < minS)    { this.vx = this.vx/speed*minS*1.01; this.vy = this.vy/speed*minS*1.01; }
            }

            move() {
                this.x += this.vx; this.y += this.vy;
                // Wrap edges
                if (this.x < 0) this.x += canvas.width;
                if (this.x > canvas.width) this.x -= canvas.width;
                if (this.y < 0) this.y += canvas.height;
                if (this.y > canvas.height) this.y -= canvas.height;
                if (settingsRef.current.showTrails) {
                    this.history.push([this.x, this.y]);
                    if (this.history.length > 20) this.history.shift();
                } else {
                    this.history = [];
                }
            }

            draw(ctx) {
                const s = settingsRef.current;
                const angle = Math.atan2(this.vy, this.vx);
                const color = this.isPredator ? '#ef4444' : '#fb7185';

                // Trail
                if (s.showTrails && this.history.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(this.history[0][0], this.history[0][1]);
                    for (const [hx,hy] of this.history) ctx.lineTo(hx, hy);
                    ctx.strokeStyle = color + '30';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }

                // Arrow
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(-5, 4);
                ctx.lineTo(-3, 0);
                ctx.lineTo(-5, -4);
                ctx.closePath();
                ctx.fillStyle = this.isPredator ? '#ef4444cc' : color + 'cc';
                ctx.shadowBlur = this.isPredator ? 12 : 6;
                ctx.shadowColor = color;
                ctx.fill();
                ctx.restore();
            }
        }

        // ── Init flock ────────────────────────────────────────────────────────
        const boids = [];
        const target = settingsRef.current.boidCount;
        for (let i = 0; i < target; i++) boids.push(new Boid(false));
        boids.push(new Boid(true)); // one predator (hidden if not enabled)
        stateRef.current = { boids };

        // ── Animation loop ─────────────────────────────────────────────────────
        const loop = () => {
            animRef.current = requestAnimationFrame(loop);
            const s = settingsRef.current;

            // Sync boid count
            const flockBoids = stateRef.current.boids.filter(b => !b.isPredator);
            const predBoid   = stateRef.current.boids.find(b => b.isPredator);
            while (flockBoids.length < s.boidCount) flockBoids.push(new Boid(false));
            while (flockBoids.length > s.boidCount) flockBoids.pop();

            const active = s.predator
                ? [...flockBoids, predBoid]
                : flockBoids;
            stateRef.current.boids = active;

            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.shadowBlur = 0;

            for (const b of active) b.steer(active);
            for (const b of active) { b.move(); b.draw(ctx); }
        };
        loop();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animRef.current);
        };
    }, []);

    // ── Panel renderers ────────────────────────────────────────────────────────
    const SliderRow = ({ label, value, min, max, step, onChange, unit='' }) => (
        <div className="space-y-1">
            <div className="flex justify-between">
                <label className="text-gray-400 text-[9px] font-bold tracking-wider">{label}</label>
                <span className="text-[9px] font-mono text-rose-400">{value}{unit}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-rose-500 cursor-pointer" />
        </div>
    );

    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🐦</span>
                <h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-pink-400">Boids Flocking</h2>
            </div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Emergent Swarm Behaviour</p>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <SliderRow label="BOID COUNT"   value={boidCount}    min={20}  max={400} step={10}  onChange={setBoidCount} />
                <SliderRow label="SEPARATION"   value={separation}   min={0}   max={4}   step={0.1} onChange={setSeparation} />
                <SliderRow label="ALIGNMENT"    value={alignment}    min={0}   max={4}   step={0.1} onChange={setAlignment} />
                <SliderRow label="COHESION"     value={cohesion}     min={0}   max={4}   step={0.1} onChange={setCohesion} />
                <SliderRow label="VISUAL RADIUS" value={visualRadius} min={30} max={200} step={5}   onChange={setVisualRadius} />
                <div className="pt-2 border-t border-white/10 space-y-2">
                    <button onClick={() => setPredator(p => !p)}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${predator ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                        🦅 PREDATOR {predator ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => setShowTrails(t => !t)}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${showTrails ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                        ✨ TRAILS {showTrails ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => setShowScience(true)}
                        className="w-full py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-[10px] font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5">
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
                    <span className="text-lg">🐦</span>
                    <div>
                        <div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-pink-400 leading-none">Boids Flocking</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Emergent Swarm</div>
                    </div>
                </div>
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">BOIDS</span>
                        <span className="text-white font-mono text-xs leading-none">{boidCount}</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">PRED</span>
                        <span className={`font-mono text-xs leading-none ${predator ? 'text-red-400' : 'text-gray-500'}`}>{predator ? 'ON' : 'OFF'}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 mt-2.5">
                <button onClick={() => setPredator(p => !p)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${predator ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                    🦅 PREDATOR
                </button>
                <button onClick={() => setShowTrails(t => !t)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all border ${showTrails ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                    ✨ TRAILS
                </button>
            </div>
            {isMobileExpanded && (
                <div className="mt-3 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight:'calc(65vh - 130px)'}}>
                    <div className="space-y-2.5 pt-1 border-t border-white/10">
                        <SliderRow label="BOID COUNT"    value={boidCount}    min={20}  max={400} step={10}  onChange={setBoidCount} />
                        <SliderRow label="SEPARATION"    value={separation}   min={0}   max={4}   step={0.1} onChange={setSeparation} />
                        <SliderRow label="ALIGNMENT"     value={alignment}    min={0}   max={4}   step={0.1} onChange={setAlignment} />
                        <SliderRow label="COHESION"      value={cohesion}     min={0}   max={4}   step={0.1} onChange={setCohesion} />
                        <SliderRow label="VISUAL RADIUS" value={visualRadius} min={30}  max={200} step={5}   onChange={setVisualRadius} />
                    </div>
                    <div className="pt-2 border-t border-white/10 space-y-2">
                        <button onClick={() => setShowScience(true)}
                            className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-[10px] font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5">
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
                    title="Boids — Emergent Flocking"
                    accentClass="text-rose-400 border-rose-400/30 bg-rose-400/10"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "Three Rules — Infinite Complexity",
                            text: "Craig Reynolds (1986) showed that realistic flocking emerges from just three local steering rules applied independently to each agent. No agent knows the global flock shape — complex collective behaviour arises purely from interactions with neighbours within a fixed visual radius.",
                        },
                        {
                            heading: "The Three Steering Rules",
                            equations: [
                                { label: "Separation", value: "Steer away from nearby neighbours (avoid crowding)" },
                                { label: "Alignment",  value: "Steer toward average heading of neighbours" },
                                { label: "Cohesion",   value: "Steer toward average position of neighbours" },
                            ],
                        },
                        {
                            heading: "Steering Force Computation",
                            text: "Each rule produces a desired velocity direction. The actual steering force is the difference between the desired velocity and the current velocity, clamped to a maximum force magnitude. The three forces are weighted and summed each frame.",
                            code:
`// Separation: flee from too-close neighbours
if (dist < separationRadius) {
  sepForce.x -= (neighbour.x - this.x) / dist;
  sepForce.y -= (neighbour.y - this.y) / dist;
}
// Alignment: match average velocity
alignForce.x += neighbour.vx / n;
alignForce.y += neighbour.vy / n;
// Cohesion: steer toward centroid
cohForce.x += (centroid.x - this.x) / n;
cohForce.y += (centroid.y - this.y) / n;

// Combine with user-adjustable weights
this.vx += sepForce.x * w_sep + alignForce.x * w_ali + cohForce.x * w_coh;`
                        },
                        {
                            heading: "Emergent Behaviour",
                            text: "The predator (red) uses inverted rules: it chases the centroid of nearby prey. Prey detect the predator within a larger radius and apply an extra flee force. This demonstrates how multi-species ecosystems emerge from local rules — the same principle drives schooling fish, starling murmurations, and even traffic flow.",
                        },
                    ]}
                />
            )}

            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none" style={{width:'100vw', height:'100vh'}} />

            <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-rose-900/10 rounded-full blur-[120px] pointer-events-none" />

            <button onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)}
                className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center transition-opacity duration-300 ui-panel hover:bg-white/10">
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>

            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>
                {renderPanelContent()}
            </div>

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
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-rose-400/50' : 'bg-white/30'}`} />
                    {!isMobileExpanded && <span className="text-[9px] text-white/30 tracking-widest uppercase animate-bounce">swipe up</span>}
                </div>
                <div className="px-4 pb-4">{renderMobilePanelContent()}</div>
            </div>

            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
