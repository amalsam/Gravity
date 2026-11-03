"use client";

import { useEffect, useRef, useState } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Slider } from "@/components/controls";

// ── Materials ────────────────────────────────────────────────────────────────
const EMPTY = 0, SAND = 1, WATER = 2, STONE = 3, FIRE = 4, SMOKE = 5, WOOD = 6, STEAM = 7, EMBER = 8;
const CELL = 4; // screen px per cell

const MATERIALS = [
    { id: SAND, label: "Sand", swatch: "#d9a75e" },
    { id: WATER, label: "Water", swatch: "#3b82f6" },
    { id: WOOD, label: "Wood", swatch: "#8b5a2b" },
    { id: FIRE, label: "Fire", swatch: "#f97316" },
    { id: STONE, label: "Stone", swatch: "#78716c" },
    { id: EMPTY, label: "Erase" },
];

// Base RGB per material; each grain gets a stable random shade on creation
const BASE = {
    [SAND]: [214, 168, 96],
    [WATER]: [37, 99, 235],
    [STONE]: [110, 104, 100],
    [WOOD]: [124, 78, 38],
    [SMOKE]: [120, 120, 130],
    [STEAM]: [190, 200, 215],
};
const BG = [6, 7, 12];

export default function SandPage() {
    const canvasRef = useRef(null);
    const [material, setMaterial] = useState(SAND);
    const [brushSize, setBrushSize] = useState(4);
    const [showScience, setShowScience] = useState(false);
    const ui = useRef({ material: SAND, brush: 4, scene: null, clear: null });

    useEffect(() => { ui.current.material = material; }, [material]);
    useEffect(() => { ui.current.brush = brushSize; }, [brushSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const u = ui.current;
        const buf = document.createElement("canvas");
        const bctx = buf.getContext("2d");
        let cols = 0, rows = 0, grid, shade, life, stamp, img, tick = 0, raf = 0;
        let emitters = [];

        const at = (c, r) => r * cols + c;
        const set = (i, m) => {
            grid[i] = m;
            shade[i] = (Math.random() * 40) | 0;
            life[i] = m === FIRE ? 30 + ((Math.random() * 40) | 0)
                : m === EMBER ? 120 + ((Math.random() * 120) | 0)
                : m === SMOKE || m === STEAM ? 80 + ((Math.random() * 80) | 0) : 0;
        };
        const swap = (a, b) => {
            let t = grid[a]; grid[a] = grid[b]; grid[b] = t;
            t = shade[a]; shade[a] = shade[b]; shade[b] = t;
            t = life[a]; life[a] = life[b]; life[b] = t;
            stamp[a] = stamp[b] = tick & 255;
        };

        const allocate = () => {
            const r = canvas.getBoundingClientRect();
            const visH = r.width < 768 ? r.height - 140 : r.height;
            cols = Math.max(20, Math.floor(r.width / CELL));
            rows = Math.max(20, Math.floor(visH / CELL));
            grid = new Uint8Array(cols * rows);
            shade = new Uint8Array(cols * rows);
            life = new Uint8Array(cols * rows);
            stamp = new Uint8Array(cols * rows);
            buf.width = cols;
            buf.height = rows;
            img = bctx.createImageData(cols, rows);
            canvas.width = Math.round(r.width);
            canvas.height = Math.round(r.height);
        };

        // ── Opening scene: ramps, a basin, a wooden frame, and two spouts ──────
        const rect = (c0, r0, w, h, m) => {
            for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) if (c >= 0 && c < cols && r >= 0 && r < rows) set(at(c, r), m);
        };
        const ramp = (c0, r0, len, dir, m) => {
            for (let k = 0; k < len; k++) rect(c0 + k * dir, r0 + Math.floor(k * 0.45), 2, 3, m);
        };
        const scene = () => {
            grid.fill(EMPTY);
            const W = cols, Hh = rows;
            const usable = window.innerWidth >= 1024 ? W - Math.round(340 / CELL) : W; // keep clear of the desktop panel
            ramp(Math.round(usable * 0.06), Math.round(Hh * 0.22), Math.round(usable * 0.3), 1, STONE);
            ramp(Math.round(usable * 0.72), Math.round(Hh * 0.38), Math.round(usable * 0.24), -1, STONE);
            // basin
            rect(Math.round(usable * 0.38), Hh - 4, Math.round(usable * 0.34), 4, STONE);
            rect(Math.round(usable * 0.38), Hh - Math.round(Hh * 0.22), 3, Math.round(Hh * 0.22), STONE);
            rect(Math.round(usable * 0.72), Hh - Math.round(Hh * 0.22), 3, Math.round(Hh * 0.22), STONE);
            // wooden frame on the right, waiting for fire
            const fx = Math.round(usable * 0.8), fy = Hh - Math.round(Hh * 0.3);
            rect(fx, fy, 3, Math.round(Hh * 0.3), WOOD);
            rect(fx + Math.round(usable * 0.12), fy, 3, Math.round(Hh * 0.3), WOOD);
            rect(fx - 2, fy - 3, Math.round(usable * 0.12) + 7, 3, WOOD);
            // a sand dune on the left
            for (let c = 0; c < Math.round(usable * 0.28); c++) {
                const h = Math.round((Math.sin((c / (usable * 0.28)) * Math.PI) * Hh) * 0.12);
                rect(c, Hh - h, 1, h, SAND);
            }
            emitters = [
                { c: Math.round(usable * 0.12), r: 2, m: SAND, until: 60 * 14 },
                { c: Math.round(usable * 0.86), r: 2, m: WATER, until: 60 * 11 },
            ];
            tick = 0;
        };
        u.scene = scene;
        u.clear = () => { grid.fill(EMPTY); emitters = []; };

        // ── Rules ──────────────────────────────────────────────────────────────
        const empty = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows && grid[at(c, r)] === EMPTY;
        const isAt = (c, r, m) => c >= 0 && c < cols && r >= 0 && r < rows && grid[at(c, r)] === m;

        const step = () => {
            tick++;
            for (const e of emitters) {
                if (tick > e.until) continue;
                for (let k = -2; k <= 2; k++) if (Math.random() < 0.6 && empty(e.c + k, e.r)) set(at(e.c + k, e.r), e.m);
            }
            const t8 = tick & 255;
            for (let r = rows - 1; r >= 0; r--) {
                const ltr = (tick + r) & 1;
                for (let k = 0; k < cols; k++) {
                    const c = ltr ? k : cols - 1 - k;
                    const i = at(c, r);
                    const m = grid[i];
                    if (m === EMPTY || m === STONE || m === WOOD || stamp[i] === t8) continue;
                    const d = Math.random() < 0.5 ? 1 : -1;

                    if (m === SAND) {
                        if (r + 1 < rows) {
                            const below = grid[at(c, r + 1)];
                            if (below === EMPTY || below === WATER || below === SMOKE || below === STEAM) { swap(i, at(c, r + 1)); continue; }
                            if (empty(c + d, r + 1) || isAt(c + d, r + 1, WATER)) { swap(i, at(c + d, r + 1)); continue; }
                            if (empty(c - d, r + 1) || isAt(c - d, r + 1, WATER)) { swap(i, at(c - d, r + 1)); continue; }
                        }
                    } else if (m === WATER) {
                        if (empty(c, r + 1)) { swap(i, at(c, r + 1)); continue; }
                        if (empty(c + d, r + 1)) { swap(i, at(c + d, r + 1)); continue; }
                        if (empty(c - d, r + 1)) { swap(i, at(c - d, r + 1)); continue; }
                        // spread sideways up to 4 cells
                        let moved = false;
                        for (const dir of [d, -d]) {
                            let target = -1;
                            for (let s = 1; s <= 4; s++) { if (empty(c + dir * s, r)) target = at(c + dir * s, r); else break; }
                            if (target >= 0) { swap(i, target); moved = true; break; }
                        }
                        if (moved) continue;
                    } else if (m === EMBER) {
                        // Burning wood: stays put, throws flames upward, spreads through wood, burns out
                        let doused = false;
                        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, -1]]) {
                            const nc = c + dc, nr = r + dr;
                            if (isAt(nc, nr, WOOD) && Math.random() < 0.035) set(at(nc, nr), EMBER);
                            if (isAt(nc, nr, WATER)) { set(at(nc, nr), STEAM); doused = true; }
                        }
                        if (doused) { set(i, WOOD); continue; }
                        if (Math.random() < 0.18 && empty(c, r - 1)) set(at(c, r - 1), FIRE);
                        if (life[i]-- <= 1) set(i, Math.random() < 0.3 ? SMOKE : EMPTY);
                        continue;
                    } else if (m === FIRE) {
                        // ignite wood, boil water, rise and flicker out
                        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                            const nc = c + dc, nr = r + dr;
                            if (isAt(nc, nr, WOOD) && Math.random() < 0.3) set(at(nc, nr), EMBER);
                            if (isAt(nc, nr, WATER)) { set(at(nc, nr), STEAM); set(i, STEAM); break; }
                        }
                        if (grid[i] !== FIRE) continue;
                        if (life[i]-- <= 1) { set(i, Math.random() < 0.5 ? SMOKE : EMPTY); continue; }
                        const fc = c + (Math.random() < 0.5 ? 1 : -1);
                        if (Math.random() < 0.6 && empty(fc, r - 1)) { swap(i, at(fc, r - 1)); continue; }
                    } else if (m === SMOKE || m === STEAM) {
                        if (life[i]-- <= 1) { grid[i] = EMPTY; continue; }
                        const nc = c + (Math.random() < 0.5 ? 1 : -1);
                        if (Math.random() < 0.7 && empty(nc, r - 1)) { swap(i, at(nc, r - 1)); continue; }
                        if (empty(c, r - 1)) { swap(i, at(c, r - 1)); continue; }
                        if (m === STEAM && life[i] < 20 && Math.random() < 0.02) { set(i, WATER); continue; } // condenses
                    }
                }
            }
        };

        // ── Render through a pixel buffer, upscaled crisp ──────────────────────
        const draw = () => {
            const data = img.data;
            const n = cols * rows;
            const tw = tick * 0.08;
            for (let i = 0; i < n; i++) {
                const m = grid[i];
                const o = i * 4;
                if (m === EMPTY) {
                    data[o] = BG[0]; data[o + 1] = BG[1]; data[o + 2] = BG[2]; data[o + 3] = 255;
                    continue;
                }
                let r, g, b;
                if (m === FIRE) {
                    const f = Math.random();
                    r = 255; g = 90 + f * 140; b = 20 + f * 40;
                } else if (m === EMBER) {
                    const f = Math.random();
                    r = 200 + f * 55; g = 50 + f * 50; b = 15;
                } else if (m === WATER) {
                    const w = Math.sin(tw + (i % cols) * 0.3 + shade[i] * 0.2) * 14;
                    r = 37 + w * 0.3; g = 110 + w; b = 235;
                } else {
                    const base = BASE[m];
                    const s = shade[i] - 20;
                    r = base[0] + s; g = base[1] + s; b = base[2] + s * 0.6;
                    if (m === SMOKE || m === STEAM) {
                        const a = Math.min(1, life[i] / 120);
                        r = BG[0] + (r - BG[0]) * a; g = BG[1] + (g - BG[1]) * a; b = BG[2] + (b - BG[2]) * a;
                    }
                }
                data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
            }
            bctx.putImageData(img, 0, 0);
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = "#06070c";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(buf, 0, 0, cols * CELL, rows * CELL);
        };

        // ── Painting ───────────────────────────────────────────────────────────
        let painting = null;
        const paint = (x, y) => {
            const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
            const b = u.brush;
            for (let dr = -b; dr <= b; dr++) for (let dc = -b; dc <= b; dc++) {
                if (dc * dc + dr * dr > b * b) continue;
                const c = cx + dc, r = cy + dr;
                if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
                const i = at(c, r);
                if (u.material === EMPTY) { grid[i] = EMPTY; continue; }
                // Loose materials are sprinkled so they fall naturally; solids are solid
                if ((u.material === SAND || u.material === WATER || u.material === FIRE) && Math.random() < 0.45) continue;
                if (grid[i] === EMPTY || u.material === STONE || u.material === WOOD) set(i, u.material);
            }
        };
        const local = (e) => {
            const r = canvas.getBoundingClientRect();
            return [e.clientX - r.left, e.clientY - r.top];
        };
        const onDown = (e) => {
            canvas.setPointerCapture(e.pointerId);
            painting = { id: e.pointerId, pos: local(e) };
            emitters = []; // the visitor has taken over
        };
        const onMove = (e) => { if (painting && painting.id === e.pointerId) painting.pos = local(e); };
        const onUp = (e) => { if (painting && painting.id === e.pointerId) painting = null; };

        allocate();
        scene();
        const ro = new ResizeObserver(() => {
            const r = canvas.getBoundingClientRect();
            if (Math.abs(Math.round(r.width / CELL) - cols) > 2) { allocate(); scene(); }
        });
        ro.observe(canvas);
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);

        const loop = () => {
            raf = requestAnimationFrame(loop);
            if (painting) paint(...painting.pos);
            step();
            step();
            draw();
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

    const materialOptions = MATERIALS.map((m) => ({ value: m.id, label: m.label, swatch: m.swatch }));

    return (
        <SimShell
            slug="sand"
            subtitle="Cellular automata"
            onScience={() => setShowScience(true)}
            peek={<Segmented label="Material" value={material} onChange={setMaterial} options={materialOptions} columns={3} />}
            panel={
                <>
                    <Group label="Brush">
                        <Hint>Drag to paint. Try setting fire to the wooden frame, or pouring water on the flames.</Hint>
                        <Slider label="Brush size" value={brushSize} min={1} max={15} step={1} onChange={setBrushSize} />
                    </Group>
                    <Group label="What each material does">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                            <dt className="text-ink-2">Sand</dt><dd className="text-ink-3">Falls, piles up, sinks through water</dd>
                            <dt className="text-ink-2">Water</dt><dd className="text-ink-3">Flows and levels out; boils into steam on fire</dd>
                            <dt className="text-ink-2">Wood</dt><dd className="text-ink-3">Solid until it catches fire</dd>
                            <dt className="text-ink-2">Fire</dt><dd className="text-ink-3">Rises, spreads through wood, burns out to smoke</dd>
                            <dt className="text-ink-2">Stone</dt><dd className="text-ink-3">Never moves</dd>
                        </dl>
                    </Group>
                    <div className="grid grid-cols-2 gap-2">
                        <ActionButton icon={Icons.reset} onClick={() => ui.current.scene?.()}>Demo scene</ActionButton>
                        <ActionButton tone="danger" icon={Icons.clear} onClick={() => ui.current.clear?.()}>Clear</ActionButton>
                    </div>
                </>
            }
        >
            <canvas ref={canvasRef} className="block h-full w-full touch-none" style={{ cursor: "crosshair" }} role="img"
                aria-label="Falling sand sandbox. Drag to paint with the selected material." />
            {showScience && (
                <ScienceModal
                    title="Falling Sand — Cellular Automata"
                    onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Cellular Automata", text: "A cellular automaton is a grid of cells, each in a discrete state. Each frame, every cell updates its state based purely on the states of its immediate neighbours and a small set of rules. Despite the simplicity, extraordinarily complex emergent behaviour arises — from snowflake formation to fluid flow to Conway's Game of Life." },
                        { heading: "Per-Material Rules", equations: [
                            { label: "Sand", value: "Falls down. Slides diagonally if blocked. Sinks through water." },
                            { label: "Water", value: "Falls, then spreads sideways up to 4 cells. Boils to steam beside fire." },
                            { label: "Wood", value: "Immovable. Catches fire from a burning neighbour." },
                            { label: "Fire", value: "Rises and flickers. Sets wood beside it burning, then burns out to smoke." },
                            { label: "Embers", value: "Burning wood stays in place, throws flames upward and spreads to neighbouring wood until it is gone — or water puts it out." },
                            { label: "Steam", value: "Rises, fades, and sometimes condenses back into water." },
                            { label: "Stone", value: "Immovable. Deflects all other materials." },
                        ] },
                        { heading: "State Machine per Cell", code: `// Sand update rule (bottom-to-top scan)
if (cell === SAND) {
  if (below is EMPTY or WATER)        swap(cell, below);   // falls, sinks
  else if (diagonal below is free)    swap(cell, diagonal); // slides
}` },
                        { heading: "Why Scan Bottom-to-Top?", text: "Updating from the bottom up means a falling grain moves into a cell that has already been processed this frame, so it can't be moved twice. Each cell is also stamped when it moves, and the scan direction alternates every row so piles don't lean to one side." },
                    ]}
                />
            )}
        </SimShell>
    );
}
