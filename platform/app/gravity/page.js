"use client";

import { useState, useRef } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import { AdBanner } from "@/shared/ads";

export default function GravitySimulationPage() {
    const [particleCount, setParticleCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [spawnMode, setSpawnMode] = useState("single");
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);

    // useRef keeps the same object across ALL re-renders
    // so event handlers in init(), update(), and buttons all share one live state
    const stateRef = useRef(null);
    if (!stateRef.current) {
        stateRef.current = {
            G: 0.1,
            M: 10e7,
            DT: 0.001,
            particles: [],
            obj1: { x: 0, y: 0, r: 15 },
            isDragging: false,
            mouseX: 0,
            mouseY: 0,
            keys: {},
            lastTime: performance.now(),
            frames: 0,
            lastSpawnTime: performance.now(),
            spawnMode: 'single',
        };
    }
    const state = stateRef.current;

    class Particle {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.mass = 2;
            this.momentum_x = 500;
            this.momentum_y = 500;
            this.color = 'white';
        }
        move(x2, y2, dt, G, M) {
            let dx = x2 - this.x;
            let dy = y2 - this.y;
            let hyp = Math.sqrt(dx * dx + dy * dy);
            if (hyp < 1) return;
            let theta = Math.atan2(dy, dx);
            let force = (G * this.mass * M) / hyp;
            this.momentum_x += force * Math.cos(theta) * dt;
            this.momentum_y += force * Math.sin(theta) * dt;
            this.x += (this.momentum_x / this.mass) * dt;
            this.y += (this.momentum_y / this.mass) * dt;
        }
        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
        }
    }

    const init = (engine, width, height) => {
        const mobileDrawer = window.innerWidth < 768 ? 110 : 0;
        state.obj1.x = width / 2;
        state.obj1.y = (height - mobileDrawer) / 2;

        const canvas = engine.ctx.canvas;
        
        const setUIOpacity = (val) => {
            document.querySelectorAll('.ui-panel').forEach(p => {
                p.style.opacity = val;
                p.style.pointerEvents = val === '0' ? 'none' : 'auto';
            });
        };

        // Input Handling
        window.addEventListener('mousemove', (e) => {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY - 64; // adjust for navbar
        });
        
        const spawnBasedOnMode = (x, y) => {
            const mode = state.spawnMode;
            if (mode === 'single') state.particles.push(new Particle(x, y));
            else if (mode === 'hline') {
                for (let i=0; i<120; i++) state.particles.push(new Particle(Math.random()*width, y));
            } else if (mode === 'circle') {
                for (let i=0; i<80; i++) {
                    let ang = Math.random() * 2 * Math.PI;
                    let hyp = Math.sqrt(Math.random()) * 80;
                    state.particles.push(new Particle(x + Math.cos(ang)*hyp, y + Math.sin(ang)*hyp));
                }
            } else if (mode === 'vline') {
                for (let i=0; i<120; i++) state.particles.push(new Particle(x, Math.random()*height));
            }
        };

        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('nav') || e.target.closest('.ui-panel')) return;
            if (e.ctrlKey) state.particles.push(new Particle(e.clientX, e.clientY - 64));
            else {
                state.isDragging = true;
                setUIOpacity('0');
                state.mouseX = e.clientX;
                state.mouseY = e.clientY - 64;
                spawnBasedOnMode(state.mouseX, state.mouseY);
            }
        });
        window.addEventListener('mouseup', () => {
            state.isDragging = false;
            setUIOpacity('1');
        });

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            state.isDragging = true;
            setUIOpacity('0');
            state.mouseX = e.touches[0].clientX;
            state.mouseY = e.touches[0].clientY - 64;
            spawnBasedOnMode(state.mouseX, state.mouseY);
        }, {passive: false});
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if(!state.isDragging) return;
            state.mouseX = e.touches[0].clientX;
            state.mouseY = e.touches[0].clientY - 64;
        }, {passive: false});
        window.addEventListener('touchend', () => {
            state.isDragging = false;
            setUIOpacity('1');
        });

        window.addEventListener('keydown', (e) => state.keys[e.key] = true);
        window.addEventListener('keyup', (e) => state.keys[e.key] = false);

        engine.state = state;
    };

    const update = (dt, engine) => {
        let currentTime = performance.now();
        state.frames++;
        if (currentTime - state.lastTime >= 1000) {
            setFps(state.frames);
            setParticleCount(state.particles.length);
            state.frames = 0;
            state.lastTime = currentTime;
        }

        const width = engine.ctx.canvas.width;
        const height = engine.ctx.canvas.height;

        if (state.keys['1']) {
            for (let i=0; i<100; i++) state.particles.push(new Particle(Math.random()*width, state.mouseY));
        }
        if (state.keys['2']) {
            for (let i=0; i<100; i++) {
                let ang = Math.random() * 2 * Math.PI;
                let hyp = Math.sqrt(Math.random()) * 50;
                state.particles.push(new Particle(state.mouseX + Math.cos(ang)*hyp, state.mouseY + Math.sin(ang)*hyp));
            }
        }
        if (state.keys['3']) {
            for (let i=0; i<100; i++) state.particles.push(new Particle(state.mouseX, Math.random()*height));
        }

        if (state.isDragging && currentTime - state.lastSpawnTime > 16) {
            const mode = state.spawnMode;
            if (mode === 'single') state.particles.push(new Particle(state.mouseX, state.mouseY));
            else if (mode === 'hline') {
                for (let i=0; i<120; i++) state.particles.push(new Particle(Math.random()*width, state.mouseY));
            } else if (mode === 'circle') {
                for (let i=0; i<80; i++) {
                    let ang = Math.random() * 2 * Math.PI;
                    let hyp = Math.sqrt(Math.random()) * 80;
                    state.particles.push(new Particle(state.mouseX + Math.cos(ang)*hyp, state.mouseY + Math.sin(ang)*hyp));
                }
            } else if (mode === 'vline') {
                for (let i=0; i<120; i++) state.particles.push(new Particle(state.mouseX, Math.random()*height));
            }
            state.lastSpawnTime = currentTime;
        }

        for (let i = 0; i < state.particles.length; i++) {
            state.particles[i].move(state.obj1.x, state.obj1.y, state.DT, state.G, state.M);
        }
    };

    const draw = (ctx, engine, width, height) => {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(state.obj1.x, state.obj1.y, state.obj1.r, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < state.particles.length; i++) {
            state.particles[i].draw(ctx);
        }
    };

    const handleResize = (w, h) => {
        const mobileDrawer = window.innerWidth < 768 ? 110 : 0;
        state.obj1.x = w / 2;
        state.obj1.y = (h - mobileDrawer) / 2;
    };

    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🌌</span>
                <h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">Gravity 2D</h2>
            </div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Planetary Mechanics</p>
            
            <div className="grid grid-cols-2 gap-2 mb-3 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="flex flex-col">
                    <span className="text-gray-500 text-[9px] font-bold tracking-wider mb-0.5">PARTICLES</span>
                    <span className="text-white font-mono text-lg leading-tight">{particleCount}</span>
                </div>
                <div className="flex flex-col border-l border-white/10 pl-3">
                    <span className="text-gray-500 text-[9px] font-bold tracking-wider mb-0.5">FPS</span>
                    <span className={`font-mono text-lg leading-tight ${fps < 30 ? 'text-red-400' : 'text-emerald-400'}`}>{fps}</span>
                </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl mb-3">
                    <p className="text-[10px] text-blue-200 leading-snug"><strong className="text-white">Drag</strong> to spawn particles towards the central mass.</p>
                    <p className="text-[10px] text-blue-200 mt-1"><strong className="text-white">Keys 1, 2, 3</strong> for distinct rapid-fire patterns.</p>
                </div>
                
                <div>
                    <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">SPAWN BRUSH MODE</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'single', label: '✦ SINGLE' },
                            { id: 'circle', label: '◉ CIRCLE' },
                            { id: 'hline',  label: '━ H LINE' },
                            { id: 'vline',  label: '┃ V LINE' },
                        ].map(({ id, label }) => (
                            <button
                                key={id}
                                onClick={() => { setSpawnMode(id); state.spawnMode = id; }}
                                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                    spawnMode === id 
                                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)] border border-transparent' 
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 hover:border-white/20'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-3 mt-3 border-t border-white/10">
                    <button 
                        onClick={() => { state.particles = []; setParticleCount(0); }}
                        className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-bold hover:bg-red-500/20 hover:text-white hover:border-red-500/50 transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        PURGE PARTICLES
                    </button>
                </div>
            </div>
        </>
    );

    const renderMobilePanelContent = () => (
        <>
            {/* === PEEK ROW: always visible === */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-lg">🌌</span>
                    <div>
                        <div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 leading-none">Gravity 2D</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Planetary</div>
                    </div>
                </div>

                {/* Live stats pills */}
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">PTC</span>
                        <span className="text-white font-mono text-xs leading-none">{particleCount}</span>
                    </div>
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">FPS</span>
                        <span className={`font-mono text-xs leading-none ${fps < 30 ? 'text-red-400' : 'text-emerald-400'}`}>{fps}</span>
                    </div>
                </div>
            </div>

            {/* Spawn mode toggle — always in peek */}
            <div className="flex gap-2 mt-2.5">
                {[
                    { id: 'single', icon: '✦', label: 'SINGLE' },
                    { id: 'circle', icon: '◉', label: 'CIRCLE' },
                ].map(({ id, icon, label }) => (
                    <button
                        key={id}
                        onClick={() => { setSpawnMode(id); state.spawnMode = id; }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all ${
                            spawnMode === id
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                                : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                    >
                        <span>{icon}</span> {label}
                    </button>
                ))}
            </div>

            {/* === EXPANDED content === */}
            {isMobileExpanded && (
                <div className="mt-3 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight: 'calc(65vh - 130px)'}}>
                    {/* All 4 modes */}
                    <div>
                        <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">ALL BRUSH MODES</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'single', label: '✦ SINGLE' },
                                { id: 'circle', label: '◉ CIRCLE' },
                                { id: 'hline',  label: '━ H LINE' },
                                { id: 'vline',  label: '┃ V LINE' },
                            ].map(({ id, label }) => (
                                <button
                                    key={id}
                                    onClick={() => { setSpawnMode(id); state.spawnMode = id; }}
                                    className={`py-2 rounded-xl text-[10px] font-bold transition-all ${
                                        spawnMode === id
                                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                                            : 'bg-white/5 text-gray-400 border border-white/10'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Hint card */}
                    <div className="bg-blue-500/5 border border-blue-500/15 p-2.5 rounded-xl">
                        <p className="text-[10px] text-blue-200 leading-snug"><strong className="text-white">Drag</strong> to stream particles to the star.</p>
                        <p className="text-[10px] text-blue-200 mt-1"><strong className="text-white">Keys 1–3</strong> for rapid-fire patterns.</p>
                    </div>

                    {/* Purge */}
                    <div className="pt-2 border-t border-white/10">
                        <button
                            onClick={() => { state.particles = []; setParticleCount(0); }}
                            className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold hover:bg-red-500/20 hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            PURGE PARTICLES
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden select-none">
            <CanvasSimulation 
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
                onResize={handleResize}
            />

            {/* Glowing ambient background orb for the dashboard */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />

            {/* --- DESKTOP PANEL TOGGLE BUTTON --- */}
            <button 
                onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)}
                className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center transition-opacity duration-300 ui-panel hover:bg-white/10"
            >
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </button>

            {/* --- DESKTOP SIDE PANEL --- */}
            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] pointer-events-auto shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>
                {renderPanelContent()}
            </div>

            {/* --- MOBILE BOTTOM SHEET --- */}
            <div
                className={`ui-panel md:hidden fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-3xl border-t border-white/15 rounded-t-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    isMobileExpanded ? 'h-[65vh]' : 'h-[110px]'
                }`}
            >
                <div
                    className="w-full flex justify-center pt-2 pb-1 cursor-pointer"
                    onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                >
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-blue-400/50' : 'bg-white/20'}`} />
                </div>
                <div className="px-4 pb-4">
                    {renderMobilePanelContent()}
                </div>
            </div>

            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
