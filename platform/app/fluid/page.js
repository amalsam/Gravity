"use client";

import { useEffect, useRef, useState } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Slider, Stats } from "@/components/controls";
import { Fluid, H } from "@/core/sph";

// Colour ramps: index 0 = calm/deep, last = fast/foam
const SPEED_RAMP = ["#1e3a8a", "#2563eb", "#3b82f6", "#38bdf8", "#7dd3fc", "#e0f2fe"];
const DENSITY_RAMP = ["#312e81", "#4338ca", "#6366f1", "#818cf8", "#a5b4fc", "#e0e7ff"];
const FLAT_RAMP = ["#4f7cff"];

function sprite(color, r) {
    const c = document.createElement("canvas");
    c.width = c.height = r * 2;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.55, color + "cc");
    grad.addColorStop(1, color + "00");
    g.fillStyle = grad;
    g.fillRect(0, 0, r * 2, r * 2);
    return c;
}

export default function FluidPage() {
    const canvasRef = useRef(null);
    const [gravity, setGravity] = useState("down");
    const [viscosity, setViscosity] = useState(15);
    const [tool, setTool] = useState("stir");
    const [colorMode, setColorMode] = useState("speed");
    const [count, setCount] = useState(0);
    const [showScience, setShowScience] = useState(false);
    const ui = useRef({ gravity: "down", viscosity: 15, tool: "stir", colorMode: "speed", reset: null, clear: null });

    useEffect(() => {
        const u = ui.current;
        u.gravity = gravity; u.viscosity = viscosity; u.tool = tool; u.colorMode = colorMode;
    }, [gravity, viscosity, tool, colorMode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const u = ui.current;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let fluid = null, dpr = 1, raf = 0, frame = 0;
        const R = Math.round(H * 0.75);
        const sprites = {
            speed: SPEED_RAMP.map((c) => sprite(c, R)),
            density: DENSITY_RAMP.map((c) => sprite(c, R)),
            flat: FLAT_RAMP.map((c) => sprite(c, R)),
        };

        // The water lives in a tank inside the visible area (clear of the desktop panel)
        const dims = () => {
            const r = canvas.getBoundingClientRect();
            const visW = r.width >= 1024 ? r.width - 340 : r.width;
            const w = Math.min(visW - 24, 960);
            return { cw: r.width, ch: r.height, w, x0: (visW - w) / 2, h: r.width < 768 ? r.height - 140 : r.height };
        };
        let x0 = 0;

        const damBreak = () => {
            const { w, h } = dims();
            fluid.clear();
            const sp = H * 0.45;
            const cols = Math.min(36, Math.floor((w * 0.36) / sp));
            const rows = Math.min(44, Math.floor((h * 0.8) / sp));
            fluid.block(12, h - rows * sp - 8, cols, rows, sp);
        };
        u.reset = () => damBreak();
        u.clear = () => fluid.clear();

        const resize = () => {
            const d = dims();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(d.cw * dpr);
            canvas.height = Math.round(d.ch * dpr);
            x0 = d.x0;
            if (!fluid) {
                fluid = new Fluid(d.w, d.h, 2000);
                damBreak();
            } else {
                fluid.w = d.w;
                fluid.h = d.h;
            }
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        // Pointer: stir pushes water along the drag; pour adds particles
        let pointer = null;
        const local = (e) => {
            const r = canvas.getBoundingClientRect();
            return [e.clientX - r.left - x0, e.clientY - r.top];
        };
        const onDown = (e) => {
            canvas.setPointerCapture(e.pointerId);
            const [x, y] = local(e);
            pointer = { id: e.pointerId, x, y, vx: 0, vy: 0 };
        };
        const onMove = (e) => {
            if (!pointer || pointer.id !== e.pointerId) return;
            const [x, y] = local(e);
            pointer.vx = (x - pointer.x) * 0.5;
            pointer.vy = (y - pointer.y) * 0.5;
            pointer.x = x; pointer.y = y;
        };
        const onUp = (e) => { if (pointer && pointer.id === e.pointerId) pointer = null; };
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);

        const loop = () => {
            raf = requestAnimationFrame(loop);
            fluid.gravity = u.gravity === "down" ? [0, 1] : u.gravity === "up" ? [0, -1] : [0, 0];
            fluid.viscosity = 0.02 + (u.viscosity / 50) * 0.75;

            let push = null;
            if (pointer) {
                if (u.tool === "pour") {
                    for (let k = 0; k < 3; k++) fluid.add(pointer.x + (Math.random() - 0.5) * 14, pointer.y + (Math.random() - 0.5) * 14, pointer.vx * 0.3, pointer.vy * 0.3 + 1);
                } else {
                    push = { x: pointer.x, y: pointer.y, r: 70, vx: pointer.vx, vy: pointer.vy, strength: 0.35 };
                }
                pointer.vx *= 0.6; pointer.vy *= 0.6;
            }
            fluid.step(push);

            // Draw: soft additive blobs merge into a glowing liquid surface
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = reduce ? "#03050c" : "rgba(3,5,12,0.55)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, dpr * x0, 0);
            // tank walls
            ctx.strokeStyle = "rgba(255,255,255,0.08)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(1, fluid.h * 0.15); ctx.lineTo(1, fluid.h - 1); ctx.lineTo(fluid.w - 1, fluid.h - 1); ctx.lineTo(fluid.w - 1, fluid.h * 0.15);
            ctx.stroke();
            const ramp = sprites[u.colorMode];
            ctx.globalAlpha = 0.9;
            const n = fluid.n;
            for (let i = 0; i < n; i++) {
                let t;
                if (u.colorMode === "speed") t = Math.min(0.999, Math.hypot(fluid.vx[i], fluid.vy[i]) / 7);
                else if (u.colorMode === "density") t = Math.min(0.999, fluid.rho[i] / 6);
                else t = 0;
                ctx.drawImage(ramp[(t * ramp.length) | 0], fluid.x[i] - R, fluid.y[i] - R);
            }
            ctx.globalAlpha = 1;

            if (++frame % 20 === 0) setCount(fluid.n);
        };
        loop();

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onUp);
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
            subtitle="Particle hydrodynamics"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <Segmented label="Drag to" value={tool} onChange={setTool} options={[
                            { value: "stir", label: "Stir" }, { value: "pour", label: "Pour" },
                        ]} />
                    </div>
                    <Stats items={[{ label: "Particles", value: count }]} />
                </div>
            }
            panel={
                <>
                    <Group label="Gravity">
                        <Segmented label="Gravity" value={gravity} onChange={setGravity} options={gravityOptions} />
                        <Hint>Flip gravity to Up and back again for a big splash.</Hint>
                    </Group>
                    <Group label="Fluid">
                        <Slider label="Viscosity" value={viscosity} min={1} max={50} step={1} onChange={setViscosity} format={(v) => (v < 12 ? `${v} · water` : v < 30 ? `${v} · oil` : `${v} · honey`)} />
                    </Group>
                    <Group label="Colour by">
                        <Segmented label="Colour mode" value={colorMode} onChange={setColorMode} options={[
                            { value: "speed", label: "Speed" },
                            { value: "density", label: "Density" },
                            { value: "flat", label: "Flat" },
                        ]} />
                    </Group>
                    <div className="grid grid-cols-2 gap-2">
                        <ActionButton icon={Icons.reset} onClick={() => ui.current.reset?.()}>Dam break</ActionButton>
                        <ActionButton tone="danger" icon={Icons.clear} onClick={() => ui.current.clear?.()}>Clear</ActionButton>
                    </div>
                </>
            }
        >
            <canvas ref={canvasRef} className="block h-full w-full touch-none" role="img"
                aria-label="Fluid simulation. Drag to stir the water or pour more in." />
            {showScience && (
                <ScienceModal
                    title="Fluid — Particle Hydrodynamics"
                    onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Water as particles", text: "Instead of a grid, the fluid is a cloud of particles that each carry position and velocity — a Lagrangian, mesh-free approach like Smoothed Particle Hydrodynamics (SPH). Quantities such as density at a point are estimated by summing nearby particles, weighted by a kernel that falls to zero at the interaction radius h." },
                        { heading: "Density and pressure", text: "Each particle measures how crowded it is. Too crowded and pressure pushes neighbours apart; too sparse and they pull together slightly, which gives the surface its cohesion. A second, short-range 'near pressure' stops particles from collapsing into clumps.",
                            equations: [
                                { label: "Density", value: "ρᵢ = Σⱼ (1 − rᵢⱼ/h)²" },
                                { label: "Near density", value: "ρᵢⁿᵉᵃʳ = Σⱼ (1 − rᵢⱼ/h)³" },
                                { label: "Pressure", value: "Pᵢ = k·(ρᵢ − ρ₀),  Pᵢⁿᵉᵃʳ = kⁿᵉᵃʳ·ρᵢⁿᵉᵃʳ" },
                            ] },
                        { heading: "Double density relaxation", text: "Rather than turning pressure into a force and integrating it (which needs tiny time steps to stay stable), this method moves particles directly to relieve pressure, then recovers velocity from how far they moved. That is why it can run in real time without exploding.",
                            code: `// for each neighbour j of particle i\nconst t = 1 - r / h;\nconst D = dt*dt * (P_i * t + Pnear_i * t*t);\npos[j] += D/2 * dir;   pos[i] -= D/2 * dir;\n// afterwards: v = (pos - prevPos) / dt` },
                        { heading: "Viscosity", text: "Neighbours that are moving toward each other exchange momentum, damping velocity differences. Raise viscosity and the fluid goes from water to oil to honey." },
                    ]}
                />
            )}
        </SimShell>
    );
}
