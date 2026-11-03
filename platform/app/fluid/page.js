"use client";
import { simTop } from "@/core/viewport";
import { useState, useRef, useEffect } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Slider, Stats } from "@/components/controls";

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
            const cy = (e.clientY || e.touches[0].clientY) - simTop();
            spawnParticles(cx, cy);
        };
        const onMove = (e) => {
            if (!dragging) return;
            const cx = e.clientX || (e.touches && e.touches[0].clientX);
            const cy = (e.clientY || (e.touches && e.touches[0].clientY)) - simTop();
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

    const gravityOptions = [
        { value: "down", label: "↓ Down" },
        { value: "zero", label: "Zero" },
        { value: "up", label: "↑ Up" },
    ];

    return (
        <SimShell
            slug="fluid"
            subtitle="Smoothed particle hydrodynamics"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-3">
                    <div className="flex-1"><Segmented label="Gravity" value={gravity} onChange={setGravity} options={gravityOptions} /></div>
                    <Stats items={[{ label: "Particles", value: count }]} />
                </div>
            }
            panel={
                <>
                    <Group label="Fluid">
                        <Hint>Click or drag on the canvas to pour in fluid.</Hint>
                        <Slider label="Viscosity" value={viscosity} min={1} max={50} step={1} onChange={setViscosity} />
                    </Group>
                    <Group label="Colour by">
                        <Segmented label="Colour mode" value={colorModeS} onChange={setColorModeS} options={[
                            { value: "speed", label: "Speed" },
                            { value: "density", label: "Density" },
                            { value: "flat", label: "Flat" },
                        ]} />
                    </Group>
                    <ActionButton tone="danger" icon={Icons.clear} onClick={() => { particles.current = []; setCount(0); }}>Clear fluid</ActionButton>
                </>
            }
        >
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none" style={{ width: "100vw", height: "100vh" }} />
            {showScience && (
                <ScienceModal title="Fluid SPH — Smoothed Particle Hydrodynamics" accentClass="text-indigo-400 border-indigo-400/30 bg-indigo-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Smoothed Particle Hydrodynamics", text: "SPH is a mesh-free particle method for simulating fluid flows. Each particle carries fluid properties (density, pressure, velocity). Properties at any point in space are estimated by averaging nearby particle values, weighted by a smooth kernel function W(r, h) that falls off with distance h." },
                        { heading: "Kernel Functions & Density", text: "The Poly6 kernel estimates density at each particle by summing contributions from neighbours within smoothing radius h. Pressure is derived from density via an equation of state.",
                            equations: [{ label: "Density", value: "ρᵢ = Σⱼ mⱼ · W(|rᵢ-rⱼ|, h)" }, { label: "Pressure", value: "pᵢ = k(ρᵢ - ρ_rest)" }, { label: "W(r,h)", value: "315/(64πh⁹) · (h²-r²)³" }] },
                        { heading: "Pressure & Viscosity Forces", code: `// Pressure force between particles i and j\nconst pForce = -(p.pressure + q.pressure)\n  / (2 * q.density) * spiky(r, h);\n\n// Viscosity smooths velocity differences\nconst vForce = VISC / q.density\n  * (q.vx - p.vx) * viscLaplacian(r, h);` },
                    ]} />
            )}
        </SimShell>
    );
}
