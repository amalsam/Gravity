"use client";
import { useState, useRef, useEffect } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { Group, Segmented, Slider, Switch } from "@/components/controls";

// Real orbital data: [name, color, semi-major axis AU, period years, size px]
const PLANETS = [
    { name: 'Mercury', color: '#a8a8a8', a: 0.387, period: 0.241, size: 3 },
    { name: 'Venus',   color: '#e8c572', a: 0.723, period: 0.615, size: 4 },
    { name: 'Earth',   color: '#4fa3e0', a: 1.000, period: 1.000, size: 4.5 },
    { name: 'Mars',    color: '#c1440e', a: 1.524, period: 1.881, size: 3.5 },
    { name: 'Jupiter', color: '#c88b3a', a: 5.203, period: 11.86, size: 9 },
    { name: 'Saturn',  color: '#e4d191', a: 9.537, period: 29.46, size: 7.5 },
    { name: 'Uranus',  color: '#7de8e8', a: 19.19, period: 84.01, size: 6 },
    { name: 'Neptune', color: '#5b7fde', a: 30.07, period: 164.8, size: 5.5 },
];

export default function SolarPage() {
    const canvasRef = useRef(null);
    const animRef   = useRef(null);
    const tRef      = useRef(0);

    const [timeSpeed,    setTimeSpeed]    = useState(50);
    const [showOrbits,   setShowOrbits]   = useState(true);
    const [showLabels,   setShowLabels]   = useState(true);
    const [followPlanet, setFollowPlanet] = useState(-1);  // -1 = sun centred
    const [showScience,  setShowScience]  = useState(false);
    const settingsRef = useRef({});
    settingsRef.current = { timeSpeed, showOrbits, showLabels, followPlanet };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();

        let lastTime = performance.now();
        const loop = (now) => {
            animRef.current = requestAnimationFrame(loop);
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            const s = settingsRef.current;
            tRef.current += dt * s.timeSpeed * 0.01; // years

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000008';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Scale: 1 AU = scale pixels
            const scale = Math.min(canvas.width, canvas.height) * 0.42 / 30.07;
            let cx = canvas.width/2, cy = canvas.height/2;

            // If following a planet, offset canvas origin
            const fp = s.followPlanet;
            if (fp >= 0 && fp < PLANETS.length) {
                const p = PLANETS[fp];
                const ang = (tRef.current / p.period) * Math.PI * 2;
                cx -= Math.cos(ang) * p.a * scale;
                cy -= Math.sin(ang) * p.a * scale;
            }

            // Stars (static)
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            // draw a few fixed stars based on canvas size
            const starSeed = 42;
            for (let i = 0; i < 120; i++) {
                const sx = ((i * 137.508 * starSeed) % canvas.width);
                const sy = ((i * 97.31 * starSeed + 50) % canvas.height);
                ctx.fillRect(sx, sy, 1, 1);
            }

            // Draw orbits
            if (s.showOrbits) {
                PLANETS.forEach(p => {
                    ctx.beginPath();
                    ctx.ellipse(cx, cy, p.a * scale, p.a * scale, 0, 0, Math.PI*2);
                    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            }

            // Sun
            const sunGrd = ctx.createRadialGradient(cx, cy, 2, cx, cy, 18);
            sunGrd.addColorStop(0, '#fff7aa'); sunGrd.addColorStop(0.4, '#fde68a'); sunGrd.addColorStop(1, '#f97316' + '00');
            ctx.fillStyle = sunGrd;
            ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fde68a';
            ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.fill();

            // Planets
            PLANETS.forEach(p => {
                const ang = (tRef.current / p.period) * Math.PI * 2;
                const px = cx + Math.cos(ang) * p.a * scale;
                const py = cy + Math.sin(ang) * p.a * scale;

                // Glow
                const grd = ctx.createRadialGradient(px, py, 0, px, py, p.size*2.5);
                grd.addColorStop(0, p.color); grd.addColorStop(1, p.color + '00');
                ctx.fillStyle = grd;
                ctx.beginPath(); ctx.arc(px, py, p.size*2.5, 0, Math.PI*2); ctx.fill();

                // Planet dot
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2); ctx.fill();

                // Saturn ring
                if (p.name === 'Saturn') {
                    ctx.beginPath();
                    ctx.ellipse(px, py, p.size*2.2, p.size*0.7, 0.3, 0, Math.PI*2);
                    ctx.strokeStyle = p.color + '80'; ctx.lineWidth = 2.5; ctx.stroke();
                }

                if (s.showLabels) {
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                    ctx.fillText(p.name, px, py - p.size - 5);
                }
            });
        };
        loop(performance.now());
        return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current); };
    }, []);

    const followOptions = [{ value: -1, label: "Sun", swatch: "#fbbf24" }, ...PLANETS.map((p, i) => ({ value: i, label: p.name, swatch: p.color }))];

    return (
        <SimShell
            slug="solar"
            subtitle="Kepler's laws · real orbital periods"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-3">
                    <div className="flex-1"><Slider label="Time speed" value={timeSpeed} min={1} max={500} step={1} onChange={setTimeSpeed} format={(v) => `${v}×`} /></div>
                </div>
            }
            panel={
                <>
                    <Group label="Follow">
                        <Segmented label="Follow" value={followPlanet} onChange={setFollowPlanet} options={followOptions} columns={3} />
                    </Group>
                    <Group label="Display">
                        <Switch label="Orbit paths" checked={showOrbits} onChange={setShowOrbits} />
                        <Switch label="Planet labels" checked={showLabels} onChange={setShowLabels} />
                    </Group>
                </>
            }
        >
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none" style={{ width: "100vw", height: "100vh" }} />
            {showScience && (
                <ScienceModal title="Solar System — Orbital Mechanics" accentClass="text-violet-400 border-violet-400/30 bg-violet-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Kepler's Three Laws", text: "Johannes Kepler (1609–1619) described planetary motion empirically. Newton later derived all three laws from his universal law of gravitation.", equations: [{ label: "1st Law", value: "Planets orbit in ellipses with the Sun at one focus" }, { label: "2nd Law", value: "Equal areas swept in equal times (conserves angular momentum)" }, { label: "3rd Law", value: "T² ∝ a³  →  T² = a³ (in years/AU)" }] },
                        { heading: "Orbital Period", text: "Kepler's Third Law states that the square of a planet's orbital period is proportional to the cube of its semi-major axis. Earth (1 AU, 1 year) is the reference. Jupiter at 5.2 AU takes √(5.2³) ≈ 11.86 years — exactly as observed.", equations: [{ label: "Period", value: "T = a^(3/2)  years  (a in AU)" }, { label: "Jupiter", value: "T = 5.2^(3/2) ≈ 11.86 yr ✓" }] },
                        { heading: "Why Ellipses?", text: "Under inverse-square gravity, the only closed orbits are ellipses (conic sections with e < 1). Parabolic (e=1) and hyperbolic (e>1) paths are escape trajectories. All planetary orbits have near-zero eccentricity — nearly circular — because high-eccentricity orbits tend to be unstable over billions of years." },
                    ]} />
            )}
        </SimShell>
    );
}
