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

    // Circular-orbit speed for this 2D (1/r) force law: v = √(G·M), the same at every radius
    const V_ORBIT = Math.sqrt(0.1 * 10e7);

    class Particle {
        constructor(x, y, vx = 250, vy = 250) {
            this.x = x;
            this.y = y;
            this.mass = 2;
            this.momentum_x = vx * this.mass;
            this.momentum_y = vy * this.mass;
        }
        // Identical to the original simulation (same operations, same rounding)
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
    }

    const addParticle = (p) => state.particles.push(p);

    // A particle placed at (x, y) moving on a near-circular orbit around the star
    const orbiter = (x, y, spread = 0.12) => {
        const dx = x - state.obj1.x, dy = y - state.obj1.y;
        const r = Math.hypot(dx, dy) || 1;
        const v = V_ORBIT * (1 - spread + Math.random() * spread * 2);
        return new Particle(x, y, (-dy / r) * v, (dx / r) * v);
    };

    const seedDisk = (n, width, height) => {
        const rMax = Math.min(width, height) * 0.42;
        for (let i = 0; i < n; i++) {
            const r = 70 + Math.pow(Math.random(), 0.8) * (rMax - 70);
            const a = Math.random() * Math.PI * 2;
            addParticle(orbiter(state.obj1.x + Math.cos(a) * r, state.obj1.y + Math.sin(a) * r, 0.32));
        }
    };

    // Star sits in the middle of the area the controls don't cover
    const placeStar = (w) => {
        const visibleH = window.innerHeight - simTop() - (window.innerWidth < 768 ? 140 : 0);
        state.obj1.x = window.innerWidth >= 1024 ? (w - 340) / 2 : w / 2;
        state.obj1.y = visibleH / 2;
    };

    const init = (engine, width, height) => {
        placeStar(width);

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
            if (mode === 'orbit') for (let i = 0; i < 6; i++) addParticle(orbiter(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 24));
            else if (mode === 'single') state.particles.push(new Particle(x, y));
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
            if (mode === 'orbit') for (let i = 0; i < 6; i++) addParticle(orbiter(state.mouseX + (Math.random() - 0.5) * 24, state.mouseY + (Math.random() - 0.5) * 24));
            else if (mode === 'single') state.particles.push(new Particle(state.mouseX, state.mouseY));
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

    // Speed relative to circular-orbit speed → colour (slow = deep blue, orbital = white, fast = amber)
    const SPEED_BINS = ['#3b5bdb', '#60a5fa', '#bfdbfe', '#ffffff', '#fde68a', '#fb923c'];
    const bins = SPEED_BINS.map(() => []);

    const draw = (ctx, engine, width, height) => {
        const { x: sx, y: sy, r: sr } = state.obj1;

        // Particles, batched by speed bin, added together so dense regions glow
        for (const b of bins) b.length = 0;
        for (const p of state.particles) {
            const v = Math.hypot(p.momentum_x, p.momentum_y) / p.mass / V_ORBIT;
            const i = v < 0.45 ? 0 : v < 0.75 ? 1 : v < 0.92 ? 2 : v < 1.1 ? 3 : v < 1.5 ? 4 : 5;
            bins[i].push(p);
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < bins.length; i++) {
            ctx.fillStyle = SPEED_BINS[i];
            ctx.globalAlpha = 0.85;
            for (const p of bins[i]) ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
        }
        ctx.globalAlpha = 1;

        // Star: soft corona + hot core
        const pulse = 1 + Math.sin(performance.now() / 900) * 0.04;
        const corona = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 6 * pulse);
        corona.addColorStop(0, 'rgba(255,214,120,0.55)');
        corona.addColorStop(0.35, 'rgba(255,170,60,0.16)');
        corona.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = corona;
        ctx.beginPath(); ctx.arc(sx, sy, sr * 6 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        const core = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, sr);
        core.addColorStop(0, '#fffdf2');
        core.addColorStop(0.5, '#ffe08a');
        core.addColorStop(1, '#f59e0b');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    };

    const handleResize = (w) => placeStar(w);

    const setBrush = (id) => { setSpawnMode(id); state.spawnMode = id; };
    const clearParticles = () => { state.particles = []; setParticleCount(0); };
    const reseed = () => {
        const c = document.querySelector('[data-sim-stage] canvas');
        seedDisk(window.innerWidth < 768 ? 900 : 1600, c?.width || window.innerWidth, (c?.height || window.innerHeight) - simTop());
    };

    return (
        <SimShell
            slug="gravity"
            subtitle="2D gravity · rosette orbits"
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
                            { value: "orbit", label: "Orbit" },
                        ]} />
                        <Hint>Drag on the canvas to stream particles toward the star. On a keyboard, hold 1, 2 or 3 for rapid-fire patterns; Ctrl-click adds one particle. Orbit launches particles at orbital speed so they stay in orbit.</Hint>
                    </Group>
                    <Group label="Colour = speed">
                        <div className="h-2 rounded-full" style={{ background: "linear-gradient(90deg,#3b5bdb,#60a5fa,#bfdbfe,#ffffff,#fde68a,#fb923c)" }} aria-hidden="true" />
                        <div className="flex justify-between text-[12px] text-ink-3"><span>Slower than orbit</span><span>Orbital</span><span>Faster</span></div>
                    </Group>
                    <div className="grid grid-cols-2 gap-2">
                        <ActionButton icon={Icons.play} onClick={reseed}>Seed a disk</ActionButton>
                        <ActionButton tone="danger" icon={Icons.clear} onClick={clearParticles}>Clear</ActionButton>
                    </div>
                </>
            }
        >
            <CanvasSimulation
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
                onResize={handleResize}
                background="rgba(4,6,14,0.22)"
            />
            {showScience && (
                <ScienceModal
                    title="Gravity Engine — Orbits in a 2D Universe"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "Gravity in two dimensions",
                            text: "In our 3D universe gravity weakens as 1/r², because its pull spreads over the surface of a sphere. In a flat 2D world it spreads around a circle instead, so it weakens only as 1/r. This simulation uses that 2D law — which is why its orbits look different from the planets'.",
                            equations: [
                                { label: "Force (2D)", value: "F = G·M·m / r" },
                                { label: "Force (3D)", value: "F = G·M·m / r²   (for comparison)" },
                            ],
                        },
                        {
                            heading: "The same orbital speed everywhere",
                            text: "For a circular orbit, gravity must supply the centripetal force m·v²/r. With a 1/r force the r cancels: every circular orbit, near or far, has the same speed. The colours show this — white particles are moving at that orbital speed, blue ones are slower and falling inward, amber ones are faster and swinging outward.",
                            equations: [
                                { label: "Balance", value: "m·v²/r = G·M·m / r" },
                                { label: "Orbit speed", value: "v = √(G·M)   (independent of r)" },
                            ],
                        },
                        {
                            heading: "Why orbits look like flowers",
                            text: "Only two force laws make every bound orbit close on itself: 1/r² and the spring force (Bertrand's theorem). With 1/r gravity, a non-circular orbit's closest point creeps forward each time round, tracing a rosette. And because the potential grows like log(r) forever, nothing can fully escape — every particle eventually swings back.",
                        },
                        {
                            heading: "Integration",
                            text: "Each frame updates momentum from the force, then position from the new momentum (semi-implicit Euler). It is cheap enough to move thousands of particles at 60 fps.",
                            code:
`// Acceleration toward the star, 2D gravity (1/r)
const dx = starX - x, dy = starY - y;
const r2 = dx*dx + dy*dy;
const k  = G * m * M / r2;        // |F| = G·m·M/r, times (dx,dy)/r
px += k * dx * dt;  py += k * dy * dt;   // momentum
x  += px / m * dt;  y  += py / m * dt;   // position`,
                        },
                    ]}
                />
            )}
        </SimShell>
    );
}
