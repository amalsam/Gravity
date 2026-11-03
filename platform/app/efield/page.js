"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Stats, Switch } from "@/components/controls";

export default function EfieldPage() {
    const canvasRef = useRef(null);
    const [charges, setCharges] = useState([]);
    const chargesRef = useRef([]);
    const [mode, setMode] = useState('+'); // '+' or '-'
    const [showFieldLines, setShowFieldLines] = useState(true);
    const [showEquipotential, setShowEquipotential] = useState(true);
    const [showScience, setShowScience] = useState(false);
    const settingsRef = useRef({ showFieldLines: true, showEquipotential: true });
    settingsRef.current = { showFieldLines, showEquipotential };

    const drawField = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cs = chargesRef.current;
        const s = settingsRef.current;
        const K = 5000;

        const fieldAt = (x, y) => {
            let ex = 0, ey = 0;
            for (const c of cs) {
                const dx = x - c.x, dy = y - c.y;
                const r2 = dx*dx + dy*dy;
                if (r2 < 100) continue;
                const r = Math.sqrt(r2);
                const mag = K * c.q / r2;
                ex += mag * dx/r; ey += mag * dy/r;
            }
            return [ex, ey];
        };

        // Field lines
        if (s.showFieldLines) {
            const numLines = 16;
            for (const c of cs) {
                if (c.q <= 0) continue;
                for (let a = 0; a < numLines; a++) {
                    const angle = (a / numLines) * Math.PI * 2;
                    let x = c.x + Math.cos(angle) * 20;
                    let y = c.y + Math.sin(angle) * 20;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    for (let step = 0; step < 300; step++) {
                        const [ex, ey] = fieldAt(x, y);
                        const mag = Math.sqrt(ex*ex + ey*ey);
                        if (mag < 0.1) break;
                        x += (ex/mag) * 5; y += (ey/mag) * 5;
                        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) break;
                        // stop near negative charge
                        let nearNeg = false;
                        for (const nc of cs) { if (nc.q < 0 && Math.hypot(x-nc.x, y-nc.y) < 18) { nearNeg=true; break; } }
                        if (nearNeg) break;
                        ctx.lineTo(x, y);
                    }
                    ctx.strokeStyle = 'rgba(251,191,36,0.5)';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            }
        }

        // Equipotential lines
        if (s.showEquipotential) {
            const potAt = (x, y) => {
                let v = 0;
                for (const c of cs) {
                    const r = Math.hypot(x-c.x, y-c.y);
                    if (r < 5) continue;
                    v += K * c.q / r;
                }
                return v;
            };
            const W = canvas.width, H = canvas.height;
            const levels = [-400,-200,-100,-50,50,100,200,400];
            for (const level of levels) {
                const color = level > 0 ? 'rgba(96,165,250,0.35)' : 'rgba(248,113,113,0.35)';
                // Simple marching squares (just paint pixels)
                ctx.beginPath();
                for (let x = 0; x < W; x += 6) {
                    for (let y = 0; y < H; y += 6) {
                        const v = potAt(x, y);
                        const vr = potAt(x+6, y);
                        const vd = potAt(x, y+6);
                        if ((v - level) * (vr - level) < 0 || (v - level) * (vd - level) < 0) {
                            ctx.moveTo(x, y); ctx.lineTo(x+1, y);
                        }
                    }
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Draw charges
        for (const c of cs) {
            const color = c.q > 0 ? '#fbbf24' : '#f87171';
            const grd = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 18);
            grd.addColorStop(0, color); grd.addColorStop(1, color + '00');
            ctx.fillStyle = grd;
            ctx.beginPath(); ctx.arc(c.x, c.y, 18, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI*2);
            ctx.fillStyle = color; ctx.fill();
            ctx.fillStyle = '#000'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(c.q > 0 ? '+' : '−', c.x, c.y);
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; drawField(); };
        window.addEventListener('resize', resize); resize();
        const handleClick = (e) => {
            if (e.target.closest('.ui-panel') || e.target.closest('nav')) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left, y = e.clientY - rect.top;
            chargesRef.current = [...chargesRef.current, { x, y, q: mode === '+' ? 1 : -1 }];
            setCharges([...chargesRef.current]);
            drawField();
        };
        canvas.addEventListener('click', handleClick);
        return () => { window.removeEventListener('resize', resize); canvas.removeEventListener('click', handleClick); };
    }, [mode, drawField]);

    useEffect(() => { drawField(); }, [showFieldLines, showEquipotential, drawField]);

    const clearAll = () => { chargesRef.current = []; setCharges([]); drawField(); };

    const chargeOptions = [
        { value: "+", label: "Positive", swatch: "#facc15" },
        { value: "-", label: "Negative", swatch: "#f87171" },
    ];

    return (
        <SimShell
            slug="efield"
            subtitle="Coulomb's law · superposition"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-3">
                    <div className="flex-1"><Segmented label="Charge to place" value={mode} onChange={setMode} options={chargeOptions} /></div>
                    <Stats items={[{ label: "Charges", value: charges.length }]} />
                </div>
            }
            panel={
                <>
                    <Group label="Place charge">
                        <Hint>Click or tap the canvas to place a charge of the selected sign.</Hint>
                    </Group>
                    <Group label="Display">
                        <Switch label="Field lines" checked={showFieldLines} onChange={setShowFieldLines} />
                        <Switch label="Equipotential lines" checked={showEquipotential} onChange={setShowEquipotential} />
                    </Group>
                    <ActionButton tone="danger" icon={Icons.clear} onClick={clearAll}>Clear charges</ActionButton>
                </>
            }
        >
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none cursor-crosshair" style={{ width: "100vw", height: "100vh" }} />
            {showScience && (
                <ScienceModal title="Electric Field — Coulomb's Law" accentClass="text-yellow-400 border-yellow-400/30 bg-yellow-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Coulomb's Law", text: "The electrostatic force between two point charges is proportional to the product of their charges and inversely proportional to the square of the distance between them. This is mathematically identical to Newton's gravitational law, but can be both attractive and repulsive.", equations: [{ label: "Force", value: "F = kq₁q₂ / r²   k ≈ 8.99×10⁹ N·m²/C²" }, { label: "Field", value: "E = F/q = kQ / r²" }] },
                        { heading: "Superposition Principle", text: "The total electric field at any point is the vector sum of the fields from all individual charges. This means field lines from multiple charges can be computed independently then summed — which is exactly how this simulation works per pixel.", code: `let Ex = 0, Ey = 0;\nfor (const charge of charges) {\n  const dx = x - charge.x, dy = y - charge.y;\n  const r2 = dx*dx + dy*dy;\n  const mag = K * charge.q / r2;\n  Ex += mag * dx/Math.sqrt(r2);\n  Ey += mag * dy/Math.sqrt(r2);\n}` },
                        { heading: "Field Lines & Equipotentials", text: "Electric field lines show the direction a positive test charge would move. They start on positive charges, end on negative ones, and never cross. Equipotential lines (same electric potential V = kQ/r) are always perpendicular to field lines — like contour lines on a map." },
                    ]} />
            )}
        </SimShell>
    );
}
