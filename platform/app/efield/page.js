"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AdBanner } from "@/shared/ads";
import ScienceModal from "@/components/ScienceModal";

export default function EfieldPage() {
    const canvasRef = useRef(null);
    const [charges, setCharges] = useState([]);
    const chargesRef = useRef([]);
    const [mode, setMode] = useState('+'); // '+' or '-'
    const [showFieldLines, setShowFieldLines] = useState(true);
    const [showEquipotential, setShowEquipotential] = useState(true);
    const [showScience, setShowScience] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);
    const swipeRef = useRef({ startY: 0, startX: 0 });
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

    const renderPanelContent = () => (
        <>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">⚡</span>
                <h2 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-400">Electric Field</h2>
            </div>
            <p className="text-[10px] text-gray-400 tracking-wider mb-3 pb-2 border-b border-white/10 uppercase font-semibold">Coulomb's Law</p>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                <div>
                    <p className="text-[9px] text-gray-500 font-bold tracking-wider mb-2">PLACE CHARGE</p>
                    <div className="flex gap-2">
                        {['+', '-'].map(q => (
                            <button key={q} onClick={() => setMode(q)}
                                className={`flex-1 py-2.5 rounded-xl text-lg font-bold transition-all border ${mode===q ? (q==='+' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-red-500/20 border-red-500/40 text-red-300') : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="bg-black/30 p-2 rounded-xl border border-white/5 grid grid-cols-2 gap-2">
                    <div className="flex flex-col"><span className="text-gray-500 text-[9px] font-bold tracking-wider">CHARGES</span><span className="text-white font-mono text-lg">{charges.length}</span></div>
                    <div className="flex flex-col border-l border-white/10 pl-2"><span className="text-gray-500 text-[9px] font-bold tracking-wider">MODE</span><span className={`font-mono text-lg ${mode==='+' ? 'text-yellow-400' : 'text-red-400'}`}>{mode==='+'?'Positive':'Negative'}</span></div>
                </div>
                <div className="space-y-1.5">
                    <button onClick={() => setShowFieldLines(f => !f)}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${showFieldLines ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        〰 FIELD LINES {showFieldLines ? 'ON' : 'OFF'}
                    </button>
                    <button onClick={() => setShowEquipotential(f => !f)}
                        className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${showEquipotential ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                        ○ EQUIPOTENTIAL {showEquipotential ? 'ON' : 'OFF'}
                    </button>
                </div>
                <div className="pt-2 border-t border-white/10 space-y-2">
                    <button onClick={clearAll} className="w-full py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        CLEAR CHARGES
                    </button>
                    <button onClick={() => setShowScience(true)} className="w-full py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl text-[10px] font-bold hover:bg-yellow-500/20 transition-all flex items-center justify-center gap-1.5">
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
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-lg">⚡</span>
                    <div>
                        <div className="text-sm font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-400 leading-none">Electric Field</div>
                        <div className="text-[8px] text-gray-500 tracking-widest uppercase">Coulomb's Law</div>
                    </div>
                </div>
                <div className="flex gap-1.5 ml-auto shrink-0">
                    <div className="flex flex-col items-center bg-black/40 border border-white/5 rounded-lg px-2.5 py-1">
                        <span className="text-[8px] text-gray-500 font-bold tracking-wider">CHG</span>
                        <span className="text-white font-mono text-xs leading-none">{charges.length}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2 mt-2.5">
                {['+', '-'].map(q => (
                    <button key={q} onClick={() => setMode(q)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-lg font-bold transition-all border ${mode===q ? (q==='+' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-red-500/20 border-red-500/40 text-red-300') : 'bg-white/5 text-gray-400 border-white/10'}`}>
                        {q} {q==='+' ? 'Positive' : 'Negative'}
                    </button>
                ))}
            </div>
            {isMobileExpanded && (
                <div className="mt-3 space-y-2.5 overflow-y-auto pr-0.5 custom-scrollbar" style={{maxHeight:'calc(65vh - 130px)'}}>
                    <div className="pt-1 border-t border-white/10 space-y-1.5">
                        <button onClick={() => setShowFieldLines(f => !f)} className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${showFieldLines ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>〰 FIELD LINES {showFieldLines ? 'ON' : 'OFF'}</button>
                        <button onClick={() => setShowEquipotential(f => !f)} className={`w-full py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border ${showEquipotential ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>○ EQUIPOTENTIAL {showEquipotential ? 'ON' : 'OFF'}</button>
                        <button onClick={clearAll} className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            CLEAR CHARGES
                        </button>
                        <button onClick={() => setShowScience(true)} className="w-full py-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5">
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
                <ScienceModal title="Electric Field — Coulomb's Law" accentClass="text-yellow-400 border-yellow-400/30 bg-yellow-400/10" onClose={() => setShowScience(false)}
                    sections={[
                        { heading: "Coulomb's Law", text: "The electrostatic force between two point charges is proportional to the product of their charges and inversely proportional to the square of the distance between them. This is mathematically identical to Newton's gravitational law, but can be both attractive and repulsive.", equations: [{ label: "Force", value: "F = kq₁q₂ / r²   k ≈ 8.99×10⁹ N·m²/C²" }, { label: "Field", value: "E = F/q = kQ / r²" }] },
                        { heading: "Superposition Principle", text: "The total electric field at any point is the vector sum of the fields from all individual charges. This means field lines from multiple charges can be computed independently then summed — which is exactly how this simulation works per pixel.", code: `let Ex = 0, Ey = 0;\nfor (const charge of charges) {\n  const dx = x - charge.x, dy = y - charge.y;\n  const r2 = dx*dx + dy*dy;\n  const mag = K * charge.q / r2;\n  Ex += mag * dx/Math.sqrt(r2);\n  Ey += mag * dy/Math.sqrt(r2);\n}` },
                        { heading: "Field Lines & Equipotentials", text: "Electric field lines show the direction a positive test charge would move. They start on positive charges, end on negative ones, and never cross. Equipotential lines (same electric potential V = kQ/r) are always perpendicular to field lines — like contour lines on a map." },
                    ]} />
            )}
            <canvas ref={canvasRef} className="block w-full h-full bg-black touch-none cursor-crosshair" style={{width:'100vw',height:'100vh'}} />
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-yellow-900/10 rounded-full blur-[120px] pointer-events-none" />
            <button onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)} className="hidden md:flex absolute top-6 right-6 z-50 bg-white/5 backdrop-blur-xl border border-white/20 p-3 rounded-full shadow-2xl text-white items-center justify-center ui-panel hover:bg-white/10">
                <svg className={`w-5 h-5 transition-transform duration-300 ${isDesktopPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
            <div className={`ui-panel hidden md:block absolute top-6 right-20 bg-white/5 backdrop-blur-3xl p-4 rounded-2xl border border-white/10 text-sm text-white w-[280px] shadow-2xl transition-all duration-300 z-40 ${isDesktopPanelOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-[120%] opacity-0 invisible pointer-events-none'}`}>{renderPanelContent()}</div>
            <div className={`ui-panel md:hidden fixed bottom-0 left-0 right-0 w-full bg-black/70 backdrop-blur-3xl border-t border-white/15 rounded-t-3xl z-40 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileExpanded ? 'h-[65vh]' : 'h-[110px]'}`}
                onTouchStart={e => { swipeRef.current.startY = e.touches[0].clientY; swipeRef.current.startX = e.touches[0].clientX; }}
                onTouchEnd={e => { const dy = swipeRef.current.startY - e.changedTouches[0].clientY; const dx = Math.abs(swipeRef.current.startX - e.changedTouches[0].clientX); if (Math.abs(dy) > 40 && Math.abs(dy) > dx) setIsMobileExpanded(dy > 0); }}>
                <div className="w-full flex flex-col items-center pt-2 pb-1 cursor-pointer gap-1" onClick={() => setIsMobileExpanded(!isMobileExpanded)}>
                    <div className={`w-10 h-1 rounded-full transition-colors duration-300 ${isMobileExpanded ? 'bg-yellow-400/50' : 'bg-white/30'}`} />
                    {!isMobileExpanded && <span className="text-[9px] text-white/30 tracking-widest uppercase animate-bounce">swipe up</span>}
                </div>
                <div className="px-4 pb-4">{renderMobilePanelContent()}</div>
            </div>
            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
