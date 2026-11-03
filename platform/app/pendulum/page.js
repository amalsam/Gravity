"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Slider } from "@/components/controls";

// Magnet positions (equilateral triangle centred on canvas)
const getMagnetPositions = (cx, cy, count) => {
    const r = 100;
    const positions = [];
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 - Math.PI / 2;
        positions.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return positions;
};

const MAGNET_COLORS = ['#22d3ee', '#38bdf8', '#7dd3fc', '#a78bfa', '#fb7185'];

export default function PendulumPage() {
    const canvasRef  = useRef(null);
    const workerRef  = useRef(null);
    const drawingRef = useRef(false);

    const [magnetCount,  setMagnetCount]  = useState(3);
    const [damping,      setDamping]      = useState(0.3);
    const [strength,     setStrength]     = useState(1.0);
    const [resolution,   setResolution]   = useState(2);   // pixel block size: 2,3,5
    const [computing,    setComputing]    = useState(false);
    const [showScience,  setShowScience]  = useState(false);

    const compute = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || drawingRef.current) return;
        drawingRef.current = true;
        setComputing(true);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2, cy = canvas.height / 2;
        const magnets = getMagnetPositions(cx, cy, magnetCount);
        const d = damping, s = strength;
        const block = resolution;
        const W = canvas.width, H = canvas.height;

        // Simulate the pendulum from each starting position
        const DT = 0.05, MAX_STEPS = 500;
        const simulate = (x0, y0) => {
            // Pendulum hangs from (cx,cy), initial position offset by (x0-cx, y0-cy)/scale
            let px = (x0-cx)*0.008, py = (y0-cy)*0.008;
            let vx = 0, vy = 0;
            for (let t = 0; t < MAX_STEPS; t++) {
                let fx = -d*vx - px*0.2;  // spring + damping
                let fy = -d*vy - py*0.2;
                for (const m of magnets) {
                    const dx = (m.x-cx)*0.008 - px;
                    const dy = (m.y-cy)*0.008 - py;
                    const r2 = dx*dx+dy*dy+0.01;
                    const r  = Math.sqrt(r2);
                    const f  = s / (r2*r);
                    fx += dx*f; fy += dy*f;
                }
                vx += fx*DT; vy += fy*DT;
                px += vx*DT; py += vy*DT;
                // Check if settled near a magnet
                for (let i = 0; i < magnets.length; i++) {
                    const m = magnets[i];
                    const dx = (m.x-cx)*0.008-px, dy = (m.y-cy)*0.008-py;
                    if (Math.sqrt(dx*dx+dy*dy) < 0.05) return i;
                }
            }
            return -1; // didn't settle
        };

        // Draw in chunks to not block UI
        let x = 0;
        const drawChunk = () => {
            const end = Math.min(x + 20*block, W);
            for (; x < end; x += block) {
                for (let y = 0; y < H; y += block) {
                    const m = simulate(x, y);
                    const color = m >= 0 ? MAGNET_COLORS[m] : '#1a1a2e';
                    const bright = Math.random()*0.3+0.7;
                    ctx.fillStyle = color;
                    ctx.globalAlpha = bright;
                    ctx.fillRect(x, y, block, block);
                }
            }
            ctx.globalAlpha = 1;
            // Draw magnets on top
            const mx2 = getMagnetPositions(cx, cy, magnetCount);
            mx2.forEach((m, i) => {
                ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, Math.PI*2);
                ctx.fillStyle = MAGNET_COLORS[i]; ctx.fill();
                ctx.beginPath(); ctx.arc(m.x, m.y, 6, 0, Math.PI*2);
                ctx.fillStyle = '#fff'; ctx.fill();
            });
            if (x < W) { requestAnimationFrame(drawChunk); }
            else { drawingRef.current = false; setComputing(false); }
        };
        requestAnimationFrame(drawChunk);
    }, [magnetCount, damping, strength, resolution]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; compute(); };
        window.addEventListener('resize', resize); resize();
        return () => window.removeEventListener('resize', resize);
    }, [compute]);

    const magnetOptions = [3, 4, 5].map((n) => ({ value: n, label: `${n} magnets` }));

    return (
        <SimShell
            slug="pendulum"
            subtitle="Fractal basins of attraction"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-2">
                    <div className="flex-1"><Segmented label="Magnet count" value={magnetCount} onChange={setMagnetCount} options={magnetOptions} /></div>
                </div>
            }
            panel={
                <>
                    <Group label="Physics">
                        <Slider label="Damping" value={damping} min={0.05} max={1.0} step={0.05} onChange={setDamping} format={(v) => v.toFixed(2)} />
                        <Slider label="Magnet strength" value={strength} min={0.2} max={3.0} step={0.1} onChange={setStrength} format={(v) => v.toFixed(2)} />
                    </Group>
                    <Group label="Resolution">
                        <Segmented label="Resolution" value={resolution} onChange={setResolution} options={[
                            { value: 5, label: "Low" },
                            { value: 3, label: "Medium" },
                            { value: 2, label: "High" },
                            { value: 1, label: "Max" },
                        ]} />
                        <Hint>Higher resolutions are sharper but take longer to compute.</Hint>
                    </Group>
                    <ActionButton tone="accent" icon={Icons.reset} onClick={compute} disabled={computing}>
                        {computing ? "Computing…" : "Recompute fractal"}
                    </ActionButton>
                </>
            }
        >
            <canvas ref={canvasRef} className="block w-full h-full bg-black" style={{ width: "100vw", height: "100vh" }} />
            {showScience && (
                <ScienceModal title="Magnetic Pendulum — Fractal Chaos" accentClass="text-cyan-400 border-cyan-400/30 bg-cyan-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "The Magnetic Pendulum System", text: "A pendulum swings freely above N fixed magnets embedded in a surface below. The competing attractive forces from each magnet and the restoring spring force of the pendulum rod create a surprisingly complex system. Even infinitesimally different starting positions can lead to dramatically different final magnets — a hallmark of chaos." },
                        { heading: "Basin of Attraction", text: "The colour map you see is called a basin-of-attraction diagram. Every pixel represents a starting position. Its colour is determined by which magnet the pendulum eventually settles above. At smooth boundaries between colour regions, the system is well-behaved. But where all three colours meet, the boundary is fractal — infinitely detailed at every zoom level.", equations: [{ label: "Pendulum ODE", value: "ẍ = -d·ẋ - k·x + Σ f_i(x,y)" }, { label: "Magnet force", value: "f_i = s·(m_i - x) / |m_i - x|³" }] },
                        { heading: "Sensitive Dependence", text: "Points on the fractal boundary never truly settle — they are the chaotic regime where arbitrarily small uncertainties in initial position lead to completely different outcomes. This is why long-range weather prediction is fundamentally impossible: the atmosphere is governed by similar chaotic equations." },
                    ]} />
            )}
        </SimShell>
    );
}
