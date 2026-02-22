"use client";

import { useState } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import { AdBanner } from "@/shared/ads";

export default function GravitySimulationPage() {
    const [particleCount, setParticleCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [spawnMode, setSpawnMode] = useState("single");

    // Refs to hold simulation state without triggering re-renders
    const state = {
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
    };

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
        state.obj1.x = width / 2;
        state.obj1.y = height / 2;

        const canvas = engine.ctx.canvas;
        
        // Input Handling
        window.addEventListener('mousemove', (e) => {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY - 64; // adjust for navbar
        });
        
        const spawnBasedOnMode = (x, y) => {
            if (spawnMode === 'single') state.particles.push(new Particle(x, y));
            else if (spawnMode === 'line1') {
                for (let i=0; i<100; i++) state.particles.push(new Particle(Math.random()*width, y));
            } else if (spawnMode === 'circle') {
                for (let i=0; i<100; i++) {
                    let ang = Math.random() * 2 * Math.PI;
                    let hyp = Math.sqrt(Math.random()) * 50;
                    state.particles.push(new Particle(x + Math.cos(ang)*hyp, y + Math.sin(ang)*hyp));
                }
            } else if (spawnMode === 'line2') {
                for (let i=0; i<100; i++) state.particles.push(new Particle(x, Math.random()*height));
            }
        };

        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('nav')) return;
            if (e.ctrlKey) state.particles.push(new Particle(e.clientX, e.clientY - 64));
            else {
                state.isDragging = true;
                state.mouseX = e.clientX;
                state.mouseY = e.clientY - 64;
                spawnBasedOnMode(state.mouseX, state.mouseY);
            }
        });
        window.addEventListener('mouseup', () => state.isDragging = false);

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            state.isDragging = true;
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
        window.addEventListener('touchend', () => state.isDragging = false);

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
            if (spawnMode === 'single') state.particles.push(new Particle(state.mouseX, state.mouseY));
            else if (spawnMode === 'line1') {
                for (let i=0; i<100; i++) state.particles.push(new Particle(Math.random()*width, state.mouseY));
            } else if (spawnMode === 'circle') {
                for (let i=0; i<100; i++) {
                    let ang = Math.random() * 2 * Math.PI;
                    let hyp = Math.sqrt(Math.random()) * 50;
                    state.particles.push(new Particle(state.mouseX + Math.cos(ang)*hyp, state.mouseY + Math.sin(ang)*hyp));
                }
            } else if (spawnMode === 'line2') {
                for (let i=0; i<100; i++) state.particles.push(new Particle(state.mouseX, Math.random()*height));
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
        state.obj1.x = w / 2;
        state.obj1.y = h / 2;
    };

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden">
            <CanvasSimulation 
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
                onResize={handleResize}
            />

            {/* Glowing ambient background orb for the dashboard */}
            <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="absolute top-6 left-6 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 text-sm text-white max-w-sm pointer-events-auto shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🌌</span>
                    <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">Gravity 2D</h2>
                </div>
                <p className="text-xs text-gray-400 tracking-wider mb-6 pb-4 border-b border-white/10 uppercase font-semibold">Planetary Mechanics</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">PARTICLES</span>
                        <span className="text-white font-mono text-xl">{particleCount}</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-3">
                        <span className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">FPS</span>
                        <span className={`font-mono text-xl ${fps < 30 ? 'text-red-400' : 'text-emerald-400'}`}>{fps}</span>
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                        <p className="text-xs text-blue-200 leading-relaxed"><strong className="text-white">Drag</strong> to spawn particles towards the central mass.</p>
                        <p className="text-xs text-blue-200 mt-1"><strong className="text-white">Keys 1, 2, 3</strong> for distinct rapid-fire patterns.</p>
                    </div>
                    
                    <div>
                        <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-3">SPAWN BRUSH MODE</p>
                        <div className="grid grid-cols-2 gap-2">
                            {['single', 'line1', 'circle', 'line2'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setSpawnMode(mode)}
                                    className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                        spawnMode === mode 
                                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(56,189,248,0.3)] border border-transparent' 
                                        : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {mode.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() => { state.particles = []; setParticleCount(0); }}
                        className="w-full mt-2 py-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold hover:bg-red-500/20 hover:text-white hover:border-red-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        PURGE PARTICLES
                    </button>
                </div>
            </div>

            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
