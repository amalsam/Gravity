"use client";

import { useEffect, useRef, useState } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Stats, Switch } from "@/components/controls";
import { track } from "@/shared/track";

const K = 5000;
const POS = "#facc15";
const NEG = "#60a5fa";
const HIT = 20; // px radius for grabbing a charge

// Arrangements placed around the centre of the visible area (cx, cy), scaled by u
const PRESETS = {
    dipole: { label: "Dipole", make: (cx, cy, u) => [{ x: cx - u, y: cy, q: 1 }, { x: cx + u, y: cy, q: -1 }] },
    like: { label: "Like charges", make: (cx, cy, u) => [{ x: cx - u, y: cy, q: 1 }, { x: cx + u, y: cy, q: 1 }] },
    quad: {
        label: "Quadrupole",
        make: (cx, cy, u) => [
            { x: cx - u, y: cy - u, q: 1 }, { x: cx + u, y: cy - u, q: -1 },
            { x: cx - u, y: cy + u, q: -1 }, { x: cx + u, y: cy + u, q: 1 },
        ],
    },
    capacitor: {
        label: "Capacitor",
        make: (cx, cy, u) => {
            const out = [];
            for (let i = -3; i <= 3; i++) {
                out.push({ x: cx + i * u * 0.32, y: cy - u * 0.7, q: 1 });
                out.push({ x: cx + i * u * 0.32, y: cy + u * 0.7, q: -1 });
            }
            return out;
        },
    },
    triangle: {
        label: "Triangle",
        make: (cx, cy, u) => [
            { x: cx, y: cy - u, q: 1 }, { x: cx - u * 0.9, y: cy + u * 0.6, q: -1 }, { x: cx + u * 0.9, y: cy + u * 0.6, q: 1 },
        ],
    },
};

export default function EfieldPage() {
    const canvasRef = useRef(null);
    const [mode, setMode] = useState("+");
    const [preset, setPreset] = useState("dipole");
    const [count, setCount] = useState(0);
    const [showFieldLines, setShowFieldLines] = useState(true);
    const [showPotential, setShowPotential] = useState(true);
    const [showFlow, setShowFlow] = useState(true);
    const [showScience, setShowScience] = useState(false);

    const st = useRef({
        charges: [], mode: "+", dirty: true, view: { w: 0, h: 0, cx: 0, cy: 0, u: 100 },
        opts: { lines: true, potential: true, flow: true }, applyPreset: null,
    });

    useEffect(() => { st.current.mode = mode; }, [mode]);
    useEffect(() => {
        st.current.opts = { lines: showFieldLines, potential: showPotential, flow: showFlow };
        st.current.dirty = true;
    }, [showFieldLines, showPotential, showFlow]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const s = st.current;
        const layer = document.createElement("canvas"); // static field image, rebuilt when charges change
        const lctx = layer.getContext("2d");
        const heat = document.createElement("canvas");
        const hctx = heat.getContext("2d");
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let dpr = 1, raf = 0, tracers = [];

        const fieldAt = (x, y) => {
            let ex = 0, ey = 0;
            for (const c of s.charges) {
                const dx = x - c.x, dy = y - c.y;
                const r2 = dx * dx + dy * dy + 25;
                const r = Math.sqrt(r2);
                const m = (K * c.q) / r2;
                ex += (m * dx) / r;
                ey += (m * dy) / r;
            }
            return [ex, ey];
        };
        const potAt = (x, y) => {
            let v = 0;
            for (const c of s.charges) v += (K * c.q) / Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2 + 25);
            return v;
        };

        const resize = () => {
            const r = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = layer.width = Math.round(r.width * dpr);
            canvas.height = layer.height = Math.round(r.height * dpr);
            const desktop = r.width >= 1024;
            const visH = r.width < 768 ? r.height - 140 : r.height;
            const visW = desktop ? r.width - 340 : r.width;
            s.view = { w: r.width, h: r.height, cx: visW / 2, cy: visH / 2, u: Math.min(visW, visH) * 0.2 };
            s.dirty = true;
        };

        s.applyPreset = (key) => {
            const { cx, cy, u } = s.view;
            s.charges = PRESETS[key].make(cx, cy, u);
            tracers = [];
            s.dirty = true;
            setCount(s.charges.length);
        };

        const rebuild = () => {
            const { w, h } = s.view;
            lctx.setTransform(1, 0, 0, 1, 0, 0);
            lctx.fillStyle = "#04050a";
            lctx.fillRect(0, 0, layer.width, layer.height);
            lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (!s.charges.length) return;

            // Potential map: low-res diverging colour field with contour bands, upscaled smoothly
            if (s.opts.potential) {
                const step = 5;
                const gw = Math.ceil(w / step), gh = Math.ceil(h / step);
                heat.width = gw; heat.height = gh;
                const img = hctx.createImageData(gw, gh);
                for (let j = 0; j < gh; j++) {
                    for (let i = 0; i < gw; i++) {
                        const v = potAt(i * step, j * step);
                        const t = Math.tanh(v / 260); // −1 … 1
                        const band = Math.abs(((v / 70) % 1 + 1) % 1 - 0.5) < 0.06 ? 1 : 0; // contour lines
                        const a = Math.abs(t);
                        const o = (j * gw + i) * 4;
                        if (t > 0) { img.data[o] = 250 * a; img.data[o + 1] = 190 * a; img.data[o + 2] = 40 * a; }
                        else { img.data[o] = 50 * a; img.data[o + 1] = 120 * a; img.data[o + 2] = 250 * a; }
                        const glow = 0.28 + band * 0.5 * (0.4 + a);
                        img.data[o + 3] = Math.min(255, (a * 0.55 + band * 0.25) * 255 * glow * 2.2);
                    }
                }
                hctx.putImageData(img, 0, 0);
                lctx.imageSmoothingEnabled = true;
                lctx.drawImage(heat, 0, 0, w, h);
            }

            // Field lines from each positive charge (or from negatives, traced backwards, if there are none)
            if (s.opts.lines) {
                const sources = s.charges.some((c) => c.q > 0) ? s.charges.filter((c) => c.q > 0) : s.charges;
                const sign = s.charges.some((c) => c.q > 0) ? 1 : -1;
                lctx.strokeStyle = "rgba(255,255,255,0.32)";
                lctx.lineWidth = 1.1;
                for (const c of sources) {
                    const n = 18;
                    for (let k = 0; k < n; k++) {
                        const a = (k / n) * Math.PI * 2 + 0.1;
                        let x = c.x + Math.cos(a) * 12, y = c.y + Math.sin(a) * 12;
                        lctx.beginPath();
                        lctx.moveTo(x, y);
                        for (let i = 0; i < 420; i++) {
                            const [ex, ey] = fieldAt(x, y);
                            const m = Math.hypot(ex, ey);
                            if (m < 1e-3) break;
                            x += (sign * ex / m) * 4;
                            y += (sign * ey / m) * 4;
                            if (x < -50 || x > w + 50 || y < -50 || y > h + 50) break;
                            lctx.lineTo(x, y);
                            if (s.charges.some((o) => o.q === -sign * Math.abs(o.q) && (x - o.x) ** 2 + (y - o.y) ** 2 < 100)) break;
                        }
                        lctx.stroke();
                    }
                }
            }
            s.dirty = false;
        };

        const spawnTracer = () => {
            const pos = s.charges.filter((c) => c.q > 0);
            if (pos.length) {
                const c = pos[(Math.random() * pos.length) | 0];
                const a = Math.random() * Math.PI * 2;
                return { x: c.x + Math.cos(a) * 14, y: c.y + Math.sin(a) * 14, life: 1 };
            }
            return { x: Math.random() * s.view.w, y: Math.random() * s.view.h, life: 1 };
        };

        const drawCharges = () => {
            for (const c of s.charges) {
                const color = c.q > 0 ? POS : NEG;
                const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 30);
                g.addColorStop(0, color);
                g.addColorStop(1, color + "00");
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(c.x, c.y, 30, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = color;
                ctx.beginPath(); ctx.arc(c.x, c.y, 11, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#0a0a0c"; ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(c.x - 5, c.y); ctx.lineTo(c.x + 5, c.y);
                if (c.q > 0) { ctx.moveTo(c.x, c.y - 5); ctx.lineTo(c.x, c.y + 5); }
                ctx.stroke();
            }
        };

        const frame = () => {
            raf = requestAnimationFrame(frame);
            if (s.dirty) rebuild();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(layer, 0, 0);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Test charges drifting along the field: the field, made visible as motion
            if (s.opts.flow && !reduce && s.charges.length) {
                const target = Math.min(500, 90 * s.charges.length);
                while (tracers.length < target) tracers.push(spawnTracer());
                ctx.globalCompositeOperation = "lighter";
                ctx.strokeStyle = "rgba(255,255,255,0.75)";
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                for (let i = 0; i < tracers.length; i++) {
                    const p = tracers[i];
                    const [ex, ey] = fieldAt(p.x, p.y);
                    const m = Math.hypot(ex, ey) || 1;
                    const sp = Math.min(6, 1.2 + Math.sqrt(m) * 0.5);
                    const nx = p.x + (ex / m) * sp, ny = p.y + (ey / m) * sp;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(nx, ny);
                    p.x = nx; p.y = ny;
                    p.life -= 0.004;
                    const sink = s.charges.some((c) => c.q < 0 && (nx - c.x) ** 2 + (ny - c.y) ** 2 < 140);
                    if (sink || p.life <= 0 || nx < -20 || ny < -20 || nx > s.view.w + 20 || ny > s.view.h + 20) tracers[i] = spawnTracer();
                }
                ctx.stroke();
                ctx.globalCompositeOperation = "source-over";
            }
            drawCharges();
        };

        // Pointer: drag a charge to move it, tap a charge to remove it, tap empty space to add one
        let drag = null;
        const local = (e) => {
            const r = canvas.getBoundingClientRect();
            return [e.clientX - r.left, e.clientY - r.top];
        };
        const onDown = (e) => {
            const [x, y] = local(e);
            const hit = s.charges.find((c) => (c.x - x) ** 2 + (c.y - y) ** 2 < HIT * HIT);
            canvas.setPointerCapture(e.pointerId);
            if (hit) {
                drag = { c: hit, moved: false, x0: x, y0: y, id: e.pointerId };
            } else {
                const c = { x, y, q: s.mode === "+" ? 1 : -1 };
                s.charges.push(c);
                drag = { c, moved: true, id: e.pointerId, added: true };
                s.dirty = true;
                setCount(s.charges.length);
                track("efield_add", { q: c.q });
            }
        };
        const onMove = (e) => {
            const [x, y] = local(e);
            canvas.style.cursor = s.charges.some((c) => (c.x - x) ** 2 + (c.y - y) ** 2 < HIT * HIT) ? "grab" : "crosshair";
            if (!drag || drag.id !== e.pointerId) return;
            if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > 4) drag.moved = true;
            if (drag.moved) {
                drag.c.x = x; drag.c.y = y;
                s.dirty = true;
                canvas.style.cursor = "grabbing";
            }
        };
        const onUp = (e) => {
            if (!drag || drag.id !== e.pointerId) return;
            if (!drag.moved && !drag.added) {
                s.charges = s.charges.filter((c) => c !== drag.c);
                s.dirty = true;
                setCount(s.charges.length);
            }
            drag = null;
        };

        resize();
        s.applyPreset("dipole");
        const ro = new ResizeObserver(() => { resize(); });
        ro.observe(canvas);
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);
        raf = requestAnimationFrame(frame);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onUp);
        };
    }, []);

    const choosePreset = (key) => {
        setPreset(key);
        st.current.applyPreset?.(key);
        track("efield_preset", { preset: key });
    };
    const clearAll = () => {
        st.current.charges = [];
        st.current.dirty = true;
        setCount(0);
        setPreset(null);
    };

    const chargeOptions = [
        { value: "+", label: "Positive", swatch: POS },
        { value: "-", label: "Negative", swatch: NEG },
    ];

    return (
        <SimShell
            slug="efield"
            subtitle="Coulomb's law · superposition"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-3">
                    <div className="flex-1"><Segmented label="Charge to place" value={mode} onChange={setMode} options={chargeOptions} /></div>
                    <Stats items={[{ label: "Charges", value: count }]} />
                </div>
            }
            panel={
                <>
                    <Group label="Arrangements">
                        <Segmented label="Arrangement" value={preset} onChange={choosePreset} columns={2}
                            options={Object.entries(PRESETS).map(([k, p]) => ({ value: k, label: p.label }))} />
                    </Group>
                    <Group label="Interact">
                        <Hint>Tap empty space to add a charge of the selected sign. Drag a charge to move it and watch the field follow. Tap a charge to remove it.</Hint>
                    </Group>
                    <Group label="Display">
                        <Switch label="Flowing test charges" description="Tiny positive charges carried along the field" checked={showFlow} onChange={setShowFlow} />
                        <Switch label="Field lines" checked={showFieldLines} onChange={setShowFieldLines} />
                        <Switch label="Potential map" description="Gold is positive potential, blue is negative; bright rings are equipotentials" checked={showPotential} onChange={setShowPotential} />
                    </Group>
                    <ActionButton tone="danger" icon={Icons.clear} onClick={clearAll}>Clear charges</ActionButton>
                </>
            }
        >
            <canvas ref={canvasRef} className="block h-full w-full touch-none" style={{ cursor: "crosshair" }} role="img"
                aria-label="Electric field of the placed charges, with field lines, potential map and moving test charges." />
            {showScience && (
                <ScienceModal
                    title="Electric Field — Coulomb's Law"
                    onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Coulomb's Law", text: "The electrostatic force between two point charges is proportional to the product of their charges and inversely proportional to the square of the distance between them. This is mathematically identical to Newton's gravitational law, but can be both attractive and repulsive.", equations: [{ label: "Force", value: "F = kq₁q₂ / r²   k ≈ 8.99×10⁹ N·m²/C²" }, { label: "Field", value: "E = F/q = kQ / r²" }] },
                        { heading: "Superposition Principle", text: "The total electric field at any point is the vector sum of the fields from all individual charges. Field lines, the potential map and the moving test charges are all computed from this sum.", code: `let Ex = 0, Ey = 0;\nfor (const charge of charges) {\n  const dx = x - charge.x, dy = y - charge.y;\n  const r2 = dx*dx + dy*dy;\n  const mag = K * charge.q / r2;\n  Ex += mag * dx/Math.sqrt(r2);\n  Ey += mag * dy/Math.sqrt(r2);\n}` },
                        { heading: "Field Lines & Equipotentials", text: "Electric field lines show the direction a positive test charge would move. They start on positive charges, end on negative ones, and never cross. Equipotential lines (same electric potential V = kQ/r) are always perpendicular to field lines — like contour lines on a map. In the potential map they are the bright rings.", equations: [{ label: "Potential", value: "V(r) = Σ k·qᵢ / |r − rᵢ|" }, { label: "Field", value: "E = −∇V" }] },
                        { heading: "The moving test charges", text: "Each moving streak is a tiny positive test charge pushed along E. They pour out of positive charges and drain into negative ones. Their motion is drawn along the field direction (not with real inertia) so the shape of the field stays easy to read." },
                    ]}
                />
            )}
        </SimShell>
    );
}
