"use client";

import { useState, useRef } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Icons, Segmented, Slider, Switch } from "@/components/controls";

// ── RK4 integrator ─────────────────────────────────────────────────────────
function rk4(x, y, z, dt, deriv) {
    const k1 = deriv(x, y, z);
    const k2 = deriv(x + dt/2*k1[0], y + dt/2*k1[1], z + dt/2*k1[2]);
    const k3 = deriv(x + dt/2*k2[0], y + dt/2*k2[1], z + dt/2*k2[2]);
    const k4 = deriv(x + dt*k3[0],   y + dt*k3[1],   z + dt*k3[2]);
    return [
        x + dt/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]),
        y + dt/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]),
        z + dt/6*(k1[2]+2*k2[2]+2*k3[2]+k4[2]),
    ];
}

const ATTRACTORS = {
    lorenz: {
        label: 'Lorenz',
        icon: '🦋',
        color: '#f97316',   // orange
        deriv: (x,y,z) => [10*(y-x), x*(28-z)-y, x*y - (8/3)*z],
        init: [0.1, 0, 0],
        dt: 0.005,
        scale: 8,
        cx: 0, cy: 12,     // offset so the butterfly is centred
    },
    rossler: {
        label: 'Rössler',
        icon: '🌀',
        color: '#a78bfa',   // violet
        deriv: (x,y,z) => [-(y+z), x+0.2*y, 0.2+z*(x-5.7)],
        init: [0.1, 0, 0],
        dt: 0.01,
        scale: 14,
        cx: 0, cy: 0,
    },
    thomas: {
        label: 'Thomas',
        icon: '⚛️',
        color: '#34d399',   // emerald
        deriv: (x,y,z) => [Math.sin(y)-0.19*x, Math.sin(z)-0.19*y, Math.sin(x)-0.19*z],
        init: [0.1, 0, 0],
        dt: 0.05,
        scale: 55,
        cx: 0, cy: 0,
    },
};

export default function AttractorPage() {
    const [attractorKey, setAttractorKey]     = useState('lorenz');
    const [trailLength, setTrailLength]       = useState(2000);
    const [speed, setSpeed]                   = useState(3);
    const [autoRotate, setAutoRotate]         = useState(true);
    const [showScience, setShowScience]       = useState(false);

    const stateRef = useRef(null);
    if (!stateRef.current) {
        stateRef.current = {
            trail: [],
            x: 0.1, y: 0, z: 0,
            angle: 0,
            attractorKey: 'lorenz',
            trailLength: 2000,
            speed: 3,
            autoRotate: true,
            frames: 0,
            lastTime: performance.now(),
        };
    }
    const s = stateRef.current;

    // Keep mutable refs in sync with React state
    s.attractorKey  = attractorKey;
    s.trailLength   = trailLength;
    s.speed         = speed;
    s.autoRotate    = autoRotate;

    const resetAttractor = (key) => {
        const a = ATTRACTORS[key];
        s.trail = [];
        [s.x, s.y, s.z] = [...a.init];
        s.angle = 0;
    };

    const init = (engine, width, height) => { resetAttractor('lorenz'); };

    const update = (dt, engine) => {
        const a = ATTRACTORS[s.attractorKey];
        // Step the ODE several times per frame for speed
        for (let i = 0; i < s.speed * 5; i++) {
            const [nx, ny, nz] = rk4(s.x, s.y, s.z, a.dt, a.deriv);
            s.x = nx; s.y = ny; s.z = nz;
            s.trail.push([nx, ny, nz]);
        }
        if (s.trail.length > s.trailLength) {
            s.trail.splice(0, s.trail.length - s.trailLength);
        }
        if (s.autoRotate) s.angle += 0.004;
    };

    const draw = (ctx, engine, width, height) => {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 0, width, height);

        const a    = ATTRACTORS[s.attractorKey];
        const cx   = width / 2 + a.cx * a.scale;
        const cy   = height / 2 - a.cy * a.scale;
        const cos  = Math.cos(s.angle);
        const sin  = Math.sin(s.angle);
        const len  = s.trail.length;
        if (len < 2) return;

        // Perspective project: rotate around Y, then project to 2D
        const project = ([px, py, pz]) => {
            const rx = px * cos - pz * sin;
            const rz = px * sin + pz * cos;
            const persp = 600 / (600 + rz);
            return [cx + rx * a.scale * persp, cy - py * a.scale * persp];
        };

        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        for (let i = 1; i < len; i++) {
            const t    = i / len;
            const alpha = t * 0.85 + 0.05;
            const base = a.color;
            ctx.strokeStyle = base + Math.floor(alpha * 255).toString(16).padStart(2,'0');
            const [x0, y0] = project(s.trail[i-1]);
            const [x1, y1] = project(s.trail[i]);
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.stroke();
        }

        // Glow dot at head
        const [hx, hy] = project(s.trail[len-1]);
        const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
        grd.addColorStop(0, a.color + 'ff');
        grd.addColorStop(1, a.color + '00');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(hx, hy, 10, 0, Math.PI*2);
        ctx.fill();
    };

    const switchAttractor = (key) => {
        setAttractorKey(key);
        resetAttractor(key);
    };

    // ── UI ─────────────────────────────────────────────────────────────────────
    const attractorOptions = Object.entries(ATTRACTORS).map(([key, a]) => ({ value: key, label: a.label }));

    return (
        <SimShell
            slug="attractor"
            subtitle="Chaos theory · RK4 integration"
            onScience={() => setShowScience(true)}
            peek={<Segmented label="Attractor" value={attractorKey} onChange={switchAttractor} options={attractorOptions} />}
            panel={
                <>
                    <Group label="Integration">
                        <Slider label="Trail length" value={trailLength} min={200} max={6000} step={100} onChange={setTrailLength} format={(v) => v.toLocaleString()} />
                        <Slider label="Speed" value={speed} min={1} max={8} step={1} onChange={setSpeed} format={(v) => `${v}×`} />
                    </Group>
                    <Group label="View">
                        <Switch label="Auto-rotate" checked={autoRotate} onChange={setAutoRotate} />
                    </Group>
                    <ActionButton icon={Icons.reset} onClick={() => resetAttractor(attractorKey)}>Reset trail</ActionButton>
                </>
            }
        >
            <CanvasSimulation
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
            />
            {showScience && (
                <ScienceModal
                    title="Strange Attractors — Chaos Theory"
                    accentClass="text-orange-400 border-orange-400/30 bg-orange-400/10"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "What is a Strange Attractor?",
                            text: "A strange attractor is a set of points in phase space toward which a chaotic dynamical system evolves. Despite being deterministic, trajectories never repeat and are exquisitely sensitive to initial conditions — the hallmark of chaos. The Lorenz butterfly is the most famous example, discovered while modelling atmospheric convection.",
                        },
                        {
                            heading: "The Lorenz Equations",
                            text: "Edward Lorenz (1963) derived three coupled ODEs for convective fluid flow. With σ=10, ρ=28, β=8/3 the system produces a chaotic double-lobe 'butterfly' orbit that never closes.",
                            equations: [
                                { label: "dx/dt", value: "σ(y − x)       σ=10" },
                                { label: "dy/dt", value: "x(ρ − z) − y   ρ=28" },
                                { label: "dz/dt", value: "xy − βz         β=8/3" },
                            ],
                        },
                        {
                            heading: "RK4 Numerical Integration",
                            text: "The simulation uses fourth-order Runge-Kutta integration. RK4 evaluates the derivative 4 times per step and combines them with Simpson-weighted averaging, giving O(dt⁵) local error — far more accurate than Euler for the same step size.",
                            code:
`// One RK4 step for the Lorenz system
function rk4(x, y, z, dt, deriv) {
  const k1 = deriv(x, y, z);
  const k2 = deriv(x+dt/2*k1[0], y+dt/2*k1[1], z+dt/2*k1[2]);
  const k3 = deriv(x+dt/2*k2[0], y+dt/2*k2[1], z+dt/2*k2[2]);
  const k4 = deriv(x+dt*k3[0],   y+dt*k3[1],   z+dt*k3[2]);
  return [
    x + dt/6*(k1[0]+2*k2[0]+2*k3[0]+k4[0]),
    y + dt/6*(k1[1]+2*k2[1]+2*k3[1]+k4[1]),
    z + dt/6*(k1[2]+2*k2[2]+2*k3[2]+k4[2]),
  ];
}`
                        },
                        {
                            heading: "Sensitive Dependence on Initial Conditions",
                            text: "Two trajectories starting 0.0001 apart diverge exponentially, quantified by the Lyapunov exponent λ≈0.905 for Lorenz. This means predictability is lost after ~1/λ ≈ 1.1 time units — weather is chaotic for exactly this reason.",
                            equations: [
                                { label: "Divergence", value: "|δZ(t)| ≈ e^(λt) · |δZ₀|" },
                                { label: "Lorenz λ",   value: "λ ≈ 0.905" },
                            ],
                        },
                    ]}
                />
            )}
        </SimShell>
    );
}
