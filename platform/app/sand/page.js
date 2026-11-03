"use client";
import { simTop } from "@/core/viewport";
import { useState, useRef, useEffect } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Hint, Icons, Segmented, Slider } from "@/components/controls";

// Cell types
const EMPTY = 0, SAND = 1, WATER = 2, STONE = 3, FIRE = 4, SMOKE = 5;

const COLORS = {
    [EMPTY]: null,
    [SAND]:  '#d97706',
    [WATER]: '#3b82f6',
    [STONE]: '#6b7280',
    [FIRE]:  '#ef4444',
    [SMOKE]: '#9ca3af',
};

const MATERIAL_LABELS = [
    { id: SAND,  label: 'Sand',  icon: '🏖',  color: 'text-amber-400',  bg: 'bg-amber-500/20 border-amber-500/40' },
    { id: WATER, label: 'Water', icon: '💧',  color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/40' },
    { id: FIRE,  label: 'Fire',  icon: '🔥',  color: 'text-red-400',    bg: 'bg-red-500/20 border-red-500/40' },
    { id: STONE, label: 'Stone', icon: '🪨',  color: 'text-gray-400',   bg: 'bg-gray-500/20 border-gray-500/40' },
    { id: EMPTY, label: 'Erase', icon: '🧹',  color: 'text-gray-500',   bg: 'bg-white/5 border-white/20' },
];

const CELL = 4; // px per cell

export default function SandPage() {
    const canvasRef  = useRef(null);
    const animRef    = useRef(null);
    const gridRef    = useRef(null);
    const colsRef    = useRef(0);
    const rowsRef    = useRef(0);
    const brushRef   = useRef(4);
    const materialRef = useRef(SAND);

    const [material,  setMaterial]  = useState(SAND);
    const [brushSize, setBrushSize] = useState(4);
    const [showScience, setShowScience]  = useState(false);

    materialRef.current = material;
    brushRef.current = brushSize;

    const initGrid = (cols, rows) => {
        const g = new Uint8Array(cols * rows);
        return g;
    };

    const idx = (c, r) => r * colsRef.current + c;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            const cols = Math.floor(canvas.width / CELL);
            const rows = Math.floor(canvas.height / CELL);
            colsRef.current = cols;
            rowsRef.current = rows;
            gridRef.current = initGrid(cols, rows);
        };
        window.addEventListener('resize', resize); resize();

        const paint = (ex, ey) => {
            if (!gridRef.current) return;
            const cx = Math.floor(ex / CELL);
            const cy = Math.floor((ey - simTop()) / CELL);
            const b  = brushRef.current;
            const cols = colsRef.current, rows = rowsRef.current;
            for (let dr = -b; dr <= b; dr++) {
                for (let dc = -b; dc <= b; dc++) {
                    if (dc*dc + dr*dr > b*b) continue;
                    const nc = cx+dc, nr = cy+dr;
                    if (nc>=0 && nc<cols && nr>=0 && nr<rows) {
                        gridRef.current[idx(nc, nr)] = materialRef.current;
                    }
                }
            }
        };

        let painting = false;
        const onDown = (e) => {
            if (e.target.closest('.ui-panel') || e.target.closest('nav')) return;
            painting = true;
            paint(e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY);
        };
        const onMove = (e) => {
            if (!painting) return;
            const cx = e.clientX || (e.touches && e.touches[0].clientX);
            const cy = e.clientY || (e.touches && e.touches[0].clientY);
            if (cx !== undefined) paint(cx, cy);
        };
        const onUp = () => { painting = false; };

        canvas.addEventListener('mousedown', onDown);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('touchstart', onDown, { passive: true });
        canvas.addEventListener('touchmove',  onMove, { passive: true });
        window.addEventListener('mouseup',   onUp);
        window.addEventListener('touchend',  onUp);

        const ctx = canvas.getContext('2d');

        const step = () => {
            const g = gridRef.current;
            if (!g) return;
            const cols = colsRef.current, rows = rowsRef.current;
            // Bottom-to-top, random column order for fairness
            for (let r = rows-2; r >= 0; r--) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                for (let ci = 0; ci < cols; ci++) {
                    const c = ci;
                    const cell = g[idx(c, r)];
                    if (cell === EMPTY) continue;

                    if (cell === SAND) {
                        if (g[idx(c, r+1)] === EMPTY) { g[idx(c,r+1)]=SAND; g[idx(c,r)]=EMPTY; }
                        else if (g[idx(c, r+1)] === WATER) { g[idx(c,r+1)]=SAND; g[idx(c,r)]=WATER; }
                        else {
                            const l = c-dir, r2 = c+dir;
                            if (l>=0 && g[idx(l,r+1)]===EMPTY) { g[idx(l,r+1)]=SAND; g[idx(c,r)]=EMPTY; }
                            else if (r2<cols && g[idx(r2,r+1)]===EMPTY) { g[idx(r2,r+1)]=SAND; g[idx(c,r)]=EMPTY; }
                        }
                    } else if (cell === WATER) {
                        if (r+1<rows && g[idx(c,r+1)]===EMPTY) { g[idx(c,r+1)]=WATER; g[idx(c,r)]=EMPTY; }
                        else {
                            const l = c-1, r2 = c+1;
                            const canL = l>=0 && g[idx(l,r)]===EMPTY;
                            const canR = r2<cols && g[idx(r2,r)]===EMPTY;
                            if (canL && canR) { const s2=dir>0; if(s2){g[idx(l,r)]=WATER;}else{g[idx(r2,r)]=WATER;} g[idx(c,r)]=EMPTY; }
                            else if (canL) { g[idx(l,r)]=WATER; g[idx(c,r)]=EMPTY; }
                            else if (canR) { g[idx(r2,r)]=WATER; g[idx(c,r)]=EMPTY; }
                        }
                    } else if (cell === FIRE) {
                        // Fire rises and spreads
                        if (Math.random() < 0.05) { g[idx(c,r)]=SMOKE; }
                        if (r>0 && g[idx(c,r-1)]===EMPTY && Math.random()<0.3) { g[idx(c,r-1)]=FIRE; }
                        // Ignite neighbours
                        if (r+1<rows && g[idx(c,r+1)]===SAND && Math.random()<0.02) g[idx(c,r+1)]=FIRE;
                        if (c+1<cols && g[idx(c+1,r)]===SAND && Math.random()<0.02) g[idx(c+1,r)]=FIRE;
                        if (c-1>=0  && g[idx(c-1,r)]===SAND && Math.random()<0.02) g[idx(c-1,r)]=FIRE;
                        // Extinguish water
                        if (r+1<rows && g[idx(c,r+1)]===WATER) g[idx(c,r)]=SMOKE;
                    } else if (cell === SMOKE) {
                        if (r>0 && g[idx(c,r-1)]===EMPTY && Math.random()<0.4) { g[idx(c,r-1)]=SMOKE; g[idx(c,r)]=EMPTY; }
                        else if (Math.random()<0.02) g[idx(c,r)]=EMPTY;
                    }
                }
            }
        };

        const draw = () => {
            const g = gridRef.current;
            if (!g) return;
            const cols = colsRef.current, rows = rowsRef.current;
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = g[idx(c,r)];
                    if (cell === EMPTY) continue;
                    let color = COLORS[cell];
                    if (cell === FIRE) {
                        const t = Math.random();
                        color = t > 0.5 ? '#f97316' : '#ef4444';
                    }
                    if (cell === SMOKE) {
                        const a = Math.floor(Math.random()*80+100).toString(16);
                        color = '#9ca3af' + a;
                    }
                    if (cell === SAND) {
                        const v = Math.floor(Math.random()*20);
                        color = `rgb(${217+v},${119+v},${6})`;
                    }
                    ctx.fillStyle = color;
                    ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
                }
            }
        };

        let lastStep = 0;
        const loop = (now) => {
            animRef.current = requestAnimationFrame(loop);
            if (now - lastStep > 16) { step(); lastStep = now; }
            draw();
        };
        loop(0);

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

    const clear = () => {
        if (gridRef.current) gridRef.current.fill(EMPTY);
    };

    const materialOptions = MATERIAL_LABELS.map((m) => ({ value: m.id, label: m.label, swatch: COLORS[m.id] || undefined }));

    return (
        <SimShell
            slug="sand"
            subtitle="Cellular automata"
            onScience={() => setShowScience(true)}
            peek={<Segmented label="Material" value={material} onChange={setMaterial} options={materialOptions} columns={5} dense />}
            panel={
                <>
                    <Group label="Brush">
                        <Hint>Drag on the canvas to paint with the selected material.</Hint>
                        <Slider label="Brush size" value={brushSize} min={1} max={15} step={1} onChange={setBrushSize} />
                    </Group>
                    <ActionButton tone="danger" icon={Icons.clear} onClick={clear}>Clear canvas</ActionButton>
                </>
            }
        >
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none cursor-crosshair" style={{ width: "100vw", height: "100vh" }} />
            {showScience && (
                <ScienceModal title="Falling Sand — Cellular Automata" accentClass="text-amber-400 border-amber-400/30 bg-amber-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Cellular Automata", text: "A cellular automaton is a grid of cells, each in a discrete state. Each frame, every cell updates its state based purely on the states of its immediate neighbours and a small set of rules. Despite the simplicity, extraordinarily complex emergent behaviour arises — from snowflake formation to fluid flow to Conway's Game of Life." },
                        { heading: "Per-Material Rules", equations: [{ label: "Sand", value: "Falls down. Slides diagonally if blocked. Displaces water." }, { label: "Water", value: "Falls down. Spreads sideways. Extinguishes fire." }, { label: "Fire", value: "Rises upward. Spreads to adjacent sand. Becomes smoke." }, { label: "Stone", value: "Immovable. Deflects all other materials." }] },
                        { heading: "State Machine per Cell", code: `// Sand update rule (bottom-to-top scan)
if (grid[c][r] === SAND) {
  if (grid[c][r+1] === EMPTY)        { swap(r, r+1); }
  else if (grid[c][r+1] === WATER)   { swap(r, r+1); } // sinks
  else if (grid[c±1][r+1] === EMPTY) { slide diagonally; }
}` },
                        { heading: "Why Scan Bottom-to-Top?", text: "Updating from bottom to top prevents particles from 'teleporting' — if we updated top-to-bottom, a falling particle could be processed twice in one frame, appearing to skip cells. Bottom-up ensures each particle moves at most one cell per frame, giving physically consistent results." },
                    ]} />
            )}
        </SimShell>
    );
}
