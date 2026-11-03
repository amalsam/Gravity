"use client";

import { useState, useRef, useEffect } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { Group, Slider, Stats, Switch, ToggleChip } from "@/components/controls";

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

    // ── UI ─────────────────────────────────────────────────────────────────────
    return (
        <SimShell
            slug="boids"
            subtitle="Separation · alignment · cohesion"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center justify-between gap-3">
                    <Stats items={[{ label: "Boids", value: boidCount }]} />
                    <div className="flex gap-2">
                        <ToggleChip label="Predator" pressed={predator} onChange={setPredator} />
                        <ToggleChip label="Trails" pressed={showTrails} onChange={setShowTrails} />
                    </div>
                </div>
            }
            panel={
                <>
                    <Group label="Steering rules">
                        <Slider label="Separation" value={separation} min={0} max={4} step={0.1} onChange={setSeparation} format={(v) => v.toFixed(1)} />
                        <Slider label="Alignment" value={alignment} min={0} max={4} step={0.1} onChange={setAlignment} format={(v) => v.toFixed(1)} />
                        <Slider label="Cohesion" value={cohesion} min={0} max={4} step={0.1} onChange={setCohesion} format={(v) => v.toFixed(1)} />
                    </Group>
                    <Group label="Flock">
                        <Slider label="Flock size" value={boidCount} min={20} max={400} step={10} onChange={setBoidCount} />
                        <Slider label="Visual radius" value={visualRadius} min={30} max={200} step={5} onChange={setVisualRadius} format={(v) => `${v}px`} />
                    </Group>
                    <Group label="Display">
                        <Switch label="Predator" description="One hunter the flock flees from" checked={predator} onChange={setPredator} />
                        <Switch label="Trails" checked={showTrails} onChange={setShowTrails} />
                    </Group>
                </>
            }
        >
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none" style={{ width: "100vw", height: "100vh" }} />
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
        </SimShell>
    );
}
