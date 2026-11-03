"use client";

import { useEffect, useRef, useState } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import StoryToasts from "@/components/StoryToasts";
import { useToasts } from "@/shared/useToasts";
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
        diverge: 15,
        view: (x, y, z) => [x, z - 25, y],   // classic x–z butterfly
        extent: 27,
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
        diverge: 8,
        view: (x, y, z) => [x, z * 0.7 - 6, y],
        extent: 13,
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
        diverge: 2,
        view: (x, y, z) => [x, y, z],
        extent: 4.6,
    },
};

export default function AttractorPage() {
    const [attractorKey, setAttractorKey]     = useState('lorenz');
    const [trailLength, setTrailLength]       = useState(2000);
    const [speed, setSpeed]                   = useState(3);
    const [autoRotate, setAutoRotate]         = useState(true);
    const [showScience, setShowScience]       = useState(false);

    const [butterfly, setButterfly] = useState(true);
    const { items: toastItems, push: pushToast, clear: clearToasts } = useToasts({ max: 2, ttl: 6500 });

    // Mutable simulation state shared with the render loop (held in state, mutated in place)
    const sRef = useRef({
            tracers: [],
            ghost: { key: null, pts: [] },
            angle: 0,
            attractorKey: 'lorenz',
            trailLength: 2000,
            speed: 3,
            autoRotate: true,
            butterfly: true,
            diverged: false,
            steps: 0,
    });

    // Keep the loop's copy of the settings in sync with React state
    useEffect(() => {
        Object.assign(sRef.current, { attractorKey, trailLength, speed, autoRotate, butterfly });
    }, [attractorKey, trailLength, speed, autoRotate, butterfly]);

    const TRACER_COLORS = ['#ffffff', '#38bdf8', '#f472b6'];

    // The full shape, integrated once per attractor and drawn faintly behind the live paths
    const buildGhost = (key) => {
        const s = sRef.current;
        const a = ATTRACTORS[key];
        let [x, y, z] = a.init;
        for (let i = 0; i < 1500; i++) [x, y, z] = rk4(x, y, z, a.dt, a.deriv); // skip the transient
        const pts = [];
        for (let i = 0; i < 14000; i++) { [x, y, z] = rk4(x, y, z, a.dt, a.deriv); pts.push([x, y, z]); }
        s.ghost = { key, pts };
    };

    const resetAttractor = (key) => {
        const s = sRef.current;
        const a = ATTRACTORS[key];
        // Three starts 0.001 apart: sensitive dependence on initial conditions, made visible
        s.tracers = [0, 1, 2].map((k) => ({ x: a.init[0] + k * 0.001, y: a.init[1], z: a.init[2], trail: [] }));
        s.angle = 0;
        s.diverged = false;
        s.steps = 0;
        if (s.ghost.key !== key) buildGhost(key);
        clearToasts();
    };

    const init = () => { resetAttractor('lorenz'); };

    const update = () => {
        const s = sRef.current;
        const a = ATTRACTORS[s.attractorKey];
        if (s.ghost.key !== s.attractorKey) buildGhost(s.attractorKey);
        const live = s.butterfly ? s.tracers : s.tracers.slice(0, 1);
        for (let i = 0; i < s.speed * 5; i++) {
            s.steps++;
            for (const t of live) {
                const nx = rk4(t.x, t.y, t.z, a.dt, a.deriv);
                t.x = nx[0]; t.y = nx[1]; t.z = nx[2];
                t.trail.push([t.x, t.y, t.z]);
            }
        }
        for (const t of s.tracers) if (t.trail.length > s.trailLength) t.trail.splice(0, t.trail.length - s.trailLength);
        if (s.autoRotate) s.angle += 0.004;

        // Announce the butterfly effect once the paths have separated
        if (s.butterfly && !s.diverged && s.tracers.length === 3) {
            const [p, q] = [s.tracers[0], s.tracers[1]];
            const d = Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
            if (d > a.diverge) {
                s.diverged = true;
                const secs = (s.steps * a.dt).toFixed(1);
                pushToast(`The three paths started 0.001 apart. After ${secs} time units they are on opposite sides of the attractor — the butterfly effect.`);
            }
        }
    };

    const draw = (ctx, engine, width, height) => {
        const s = sRef.current;
        ctx.fillStyle = '#05060a';
        ctx.fillRect(0, 0, width, height);

        const a    = ATTRACTORS[s.attractorKey];
        // Fit to the area the controls don't cover
        const visW = window.innerWidth >= 1024 ? width - 340 : width;
        const visH = (window.innerWidth < 768 ? height - 140 : height) - 64;
        const sc   = (0.42 * Math.min(visW, visH)) / a.extent;
        const cx   = visW / 2;
        const cy   = visH / 2;
        const cos  = Math.cos(s.angle);
        const sin  = Math.sin(s.angle);

        const project = (x, y, z) => {
            const [px, py, pz] = a.view(x, y, z);
            const rx = px * cos - pz * sin;
            const rz = px * sin + pz * cos;
            const persp = 600 / (600 + rz * sc * 0.6);
            return [cx + rx * sc * persp, cy - py * sc * persp];
        };

        // Ghost of the whole attractor
        const g = s.ghost.pts;
        if (g.length) {
            ctx.strokeStyle = a.color + '2e';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let [x0, y0] = project(...g[0]);
            ctx.moveTo(x0, y0);
            for (let i = 1; i < g.length; i++) { const [x1, y1] = project(...g[i]); ctx.lineTo(x1, y1); }
            ctx.stroke();
        }

        // Live paths, fading toward the tail (drawn in a few alpha buckets)
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const live = s.butterfly ? s.tracers : s.tracers.slice(0, 1);
        live.forEach((t, ti) => {
            const len = t.trail.length;
            if (len < 2) return;
            const color = s.butterfly ? TRACER_COLORS[ti] : a.color;
            const buckets = 8;
            ctx.lineWidth = 1.8;
            for (let bk = 0; bk < buckets; bk++) {
                const start = Math.floor((bk / buckets) * (len - 1));
                const end = Math.floor(((bk + 1) / buckets) * (len - 1));
                ctx.strokeStyle = color + Math.floor((0.12 + 0.88 * ((bk + 1) / buckets)) * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                const [sx, sy] = project(...t.trail[start]);
                ctx.moveTo(sx, sy);
                for (let i = start + 1; i <= end; i++) { const [x1, y1] = project(...t.trail[i]); ctx.lineTo(x1, y1); }
                ctx.stroke();
            }
            const [hx, hy] = project(...t.trail[len - 1]);
            const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, 12);
            grd.addColorStop(0, color + 'ff');
            grd.addColorStop(1, color + '00');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(hx, hy, 12, 0, Math.PI * 2);
            ctx.fill();
        });
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
                        <Switch label="Butterfly effect" description="Three paths that start 0.001 apart" checked={butterfly} onChange={(v) => { setButterfly(v); resetAttractor(attractorKey); }} />
                        <Switch label="Auto-rotate" checked={autoRotate} onChange={setAutoRotate} />
                    </Group>
                    <ActionButton icon={Icons.reset} onClick={() => resetAttractor(attractorKey)}>Restart paths</ActionButton>
                </>
            }
        >
            <CanvasSimulation
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
                background="#05060a"
            />
            <StoryToasts items={toastItems} />
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
