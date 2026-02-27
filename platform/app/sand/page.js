"use client";
import { useState, useRef, useEffect } from "react";
import { AdBanner } from "@/shared/ads";
import ScienceModal from "@/components/ScienceModal";

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
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const swipeRef = useRef({ startY: 0, startX: 0 });

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
            const cy = Math.floor((ey - 64) / CELL);
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

    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1"><span className="text-xl">🏖</span><h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">Falling Sand</h2></div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Cellular Automata</p>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="bg-amber-500/5 border border-amber-500/15 p-2.5 rounded-xl">
                    <p className="text-[10px] text-amber-200"><strong className="text-white">Drag</strong> to paint. Select material below.</p>
                </div>
                <div>
                    <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">MATERIAL</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {MATERIAL_LABELS.map(m => (
                            <button key={m.id} onClick={() => setMaterial(m.id)}
                                className={`py-2 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 border ${material===m.id ? m.bg : 'bg-white/5 border-white/10 text-gray-400'} ${material===m.id ? m.color : ''}`}>
                                <span>{m.icon}</span>{m.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">BRUSH SIZE</label><span className="text-[9px] font-mono text-amber-400">{brushSize}</span></div>
                    <input type="range" min="1" max="15" step="1" value={brushSize} onChange={e => setBrushSize(+e.target.value)} className="w-full h-1 bg-gray-700 rounded-lg appearance-none accent-amber-500 cursor-pointer" />
                </div>
                <div className="pt-2 border-t border-white/10 space-y-2">
                    <button onClick={clear} className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        CLEAR CANVAS
                    </button>
                    <button onClick={() => setShowScience(true)} className="w-full py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-bold hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                        THE SCIENCE
                    </button>
                </div>
            </div>
        </>
    );

    const renderMobilePanelContent = () => (
        <>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 shrink-0"><span className="text-lg">🏖</span>
                    <div><div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 leading-none">Falling Sand</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Cellular Automata</div></div>
                </div>
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">MAT</span>
                        <span className="font-mono text-xs leading-none">{MATERIAL_LABELS.find(m => m.id === material)?.icon}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
                {MATERIAL_LABELS.map(m => (
                    <button key={m.id} onClick={() => setMaterial(m.id)}
                        className={`flex-1 min-w-[60px] flex items-center justify-center gap-1 py-2 rounded-xl text-[9px] font-bold transition-all border ${material===m.id ? `${m.bg} ${m.color}` : 'bg-white/5 text-gray-400 border-white/10'}`}>
                        {m.icon}
                    </button>
                ))}
            </div>
            {isMobileExpanded && (
                <div className="mt-3 space-y-3 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight:'calc(65vh - 130px)'}}>
                    <div className="pt-1 border-t border-white/10 space-y-2">
                        <div className="space-y-1">
                            <div className="flex justify-between"><label className="text-gray-400 text-[9px] font-bold tracking-wider">BRUSH SIZE</label><span className="text-[9px] font-mono text-amber-400">{brushSize}</span></div>
                            <input type="range" min="1" max="15" step="1" value={brushSize} onChange={e => setBrushSize(+e.target.value)} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-amber-500 cursor-pointer" />
                        </div>
                        <button onClick={clear} className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            CLEAR CANVAS
                        </button>
                        <button onClick={() => setShowScience(true)} className="w-full py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                            THE SCIENCE
                        </button>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden select-none">
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
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none cursor-crosshair" style={{width:'100vw', height:'100vh'}} />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />
            <button onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)} className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center ui-panel hover:bg-white/10">
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>{renderPanelContent()}</div>
            <div className={`ui-panel md:hidden fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-3xl border-t border-white/15 rounded-t-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileExpanded ? 'h-[65vh]' : 'h-[110px]'}`}
                onTouchStart={e => { swipeRef.current.startY = e.touches[0].clientY; swipeRef.current.startX = e.touches[0].clientX; }}
                onTouchEnd={e => { const dy = swipeRef.current.startY - e.changedTouches[0].clientY; const dx = Math.abs(swipeRef.current.startX - e.changedTouches[0].clientX); if (Math.abs(dy) > 40 && Math.abs(dy) > dx) setIsMobileExpanded(dy > 0); }}>
                <div className="w-full flex flex-col items-center pt-2 pb-1 cursor-pointer gap-1" onClick={() => setIsMobileExpanded(!isMobileExpanded)}>
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-amber-400/50' : 'bg-white/30'}`} />
                    {!isMobileExpanded && <span className="text-[9px] text-white/30 tracking-widest uppercase animate-bounce">swipe up</span>}
                </div>
                <div className="px-4 pb-4">{renderMobilePanelContent()}</div>
            </div>
            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
