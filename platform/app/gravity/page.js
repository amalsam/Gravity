"use client";

import { simTop } from "@/core/viewport";
import { useState, useRef } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Stats } from "@/components/controls";

export default function GravitySimulationPage() {
    const [particleCount, setParticleCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [spawnMode, setSpawnMode] = useState("single");
    const [showScience, setShowScience] = useState(false);

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
            state.mouseY = e.clientY - simTop(); // adjust for navbar
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
            if (e.target.tagName === 'BUTTON' || e.target.closest('nav') || e.target.closest('.ui-panel') || e.target.closest('[data-sim-article]') || e.target.closest('footer') || e.target.closest('[role="dialog"]')) return;
            if (e.ctrlKey) state.particles.push(new Particle(e.clientX, e.clientY - simTop()));
            else {
                state.isDragging = true;
                setUIOpacity('0');
                state.mouseX = e.clientX;
                state.mouseY = e.clientY - simTop();
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
            state.mouseY = e.touches[0].clientY - simTop();
            spawnBasedOnMode(state.mouseX, state.mouseY);
        }, {passive: false});
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if(!state.isDragging) return;
            state.mouseX = e.touches[0].clientX;
            state.mouseY = e.touches[0].clientY - simTop();
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

    const setBrush = (id) => { setSpawnMode(id); state.spawnMode = id; };
    const clearParticles = () => { state.particles = []; setParticleCount(0); };

    return (
        <SimShell
            slug="gravity"
            subtitle="Newtonian gravity · Euler integration"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center justify-between gap-3">
                    <Stats items={[
                        { label: "Particles", value: particleCount.toLocaleString() },
                        { label: "FPS", value: fps, tone: fps && fps < 30 ? "bad" : undefined },
                    ]} />
                    <button type="button" onClick={clearParticles}
                        className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-fill px-3.5 text-[13px] font-medium text-ink-2">
                        {Icons.clear} Clear
                    </button>
                </div>
            }
            panel={
                <>
                    <Group label="Brush">
                        <Segmented label="Spawn brush" value={spawnMode} onChange={setBrush} columns={2} options={[
                            { value: "single", label: "Single" },
                            { value: "circle", label: "Circle" },
                            { value: "hline", label: "Horizontal line" },
                            { value: "vline", label: "Vertical line" },
                        ]} />
                        <Hint>Drag on the canvas to stream particles toward the star. On a keyboard, hold 1, 2 or 3 for rapid-fire patterns.</Hint>
                    </Group>
                    <ActionButton tone="danger" icon={Icons.clear} onClick={clearParticles}>Clear particles</ActionButton>
                </>
            }
        >
            <CanvasSimulation
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
                onResize={handleResize}
            />
            {showScience && (
                <ScienceModal
                    title="Gravity 2D — Orbital Mechanics"
                    accentClass="text-blue-400 border-blue-400/30 bg-blue-400/10"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "Newtonian Gravity",
                            text: "Each particle experiences a gravitational force from the central star. The force follows Newton's Law of Universal Gravitation — it grows stronger as particles get closer, creating the curved orbital paths seen in the simulation.",
                            equations: [
                                { label: "Force",      value: "F = G·M·m / r²" },
                                { label: "Escape Vel", value: "v_e = √(2·G·M / r)" },
                                { label: "Orbit Vel",  value: "v_c = √(G·M / r)" },
                            ]
                        },
                        {
                            heading: "Euler Integration — Particle Motion",
                            text: "Position and velocity are updated every frame using semi-implicit Euler integration. This runs stably at 60 fps without full Runge-Kutta expense.",
                            code:
`// Gravitational acceleration towards star
const dx = starX - this.x,  dy = starY - this.y;
const r  = Math.sqrt(dx*dx + dy*dy);
const a  = G * M / (r * r);   // |a| = G·M/r²

// Semi-implicit Euler (update v first, then pos)
this.vx += (dx/r) * a * DT;
this.vy += (dy/r) * a * DT;
this.x  += this.vx * DT;
this.y  += this.vy * DT;`
                        },
                        {
                            heading: "Orbit Formation",
                            text: "Stable orbits form when centripetal acceleration equals gravitational acceleration: v²/r = GM/r², giving orbital speed v_c = √(GM/r). Particles spawned faster than escape velocity v_e = v_c·2 leave the system. Particles below orbital speed spiral inward. Mixed spawns produce the elliptical paths visible in this simulation."
                        }
                    ]}
                />
            )}
        </SimShell>
    );
}
