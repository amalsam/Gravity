"use client";

import { useState, useRef } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import { applyGravity, handleCollision3D } from "@/core/physics";
import { AdBanner } from "@/shared/ads";

export default function NParticleSimulationPage() {
    const [stats, setStats] = useState({ particles: 0, fps: 0 });
    const [settings, setSettings] = useState({ speed: 1.0, size: 10, mode: 'single', interactionMode: 'spawn', camX: 0, camY: 0, camZ: 1500 });
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Mutable simulation state container
    const s = useRef({
        G: 1.0,
        M: 10e7,
        currentDT: 0.0003,
        BASE_DT: 0.0003,
        MAX_PARTICLES: 1500,
        particles: [],
        cam: { x: 0, y: 0, z: 0 },
        cameraAngleX: 0,
        cameraAngleY: 0,
        camRadius: 1500,
        fwd: { x: 0, y: 0, z: 0 },
        right: { x: 1, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        fov: 800,
        isDraggingCamera: false,
        lastMouseX: 0,
        lastMouseY: 0,
        lastPinchDist: 0,
        lastFpsTime: performance.now(),
        framesThisSecond: 0,
        COLORS: ['rgb(255, 0, 0)', 'rgb(0, 255, 0)', 'rgb(0, 0, 255)'],
        settingsRef: null // Will hold latest settings
    });

    s.current.settingsRef = settings; // Always keep the latest react state accessible to event listeners

    class Particle3D {
        constructor(x, y, z, radius) {
            this.x = x; this.y = y; this.z = z;
            this.radius = radius;
            this.mass = (radius / 10) * 2;
            this.mx = 0; this.my = 0; this.mz = 0;
            this.color = s.current.COLORS[Math.floor(Math.random() * s.current.COLORS.length)];
            this.distToCam = 0;
        }
        step(dt) {
            const drag = 0.9995;
            this.mx *= drag; this.my *= drag; this.mz *= drag;
            this.x += (this.mx / this.mass) * dt;
            this.y += (this.my / this.mass) * dt;
            this.z += (this.mz / this.mass) * dt;
        }
    }

    const attemptAdd = (p) => {
        if (s.current.particles.length > s.current.MAX_PARTICLES) {
            s.current.particles.shift();
        }
        s.current.particles.push(p);
    };

    const handlePlacement = (screenX, screenY, width, height, mode, radius) => {
        const nx = screenX - width / 2;
        const ny = screenY - height / 2;
        const c = s.current;

        let rayDirX = nx * c.right.x + ny * c.up.x + c.fov * c.fwd.x;
        let rayDirY = nx * c.right.y + ny * c.up.y + c.fov * c.fwd.y;
        let rayDirZ = nx * c.right.z + ny * c.up.z + c.fov * c.fwd.z;
        
        let rayMag = Math.sqrt(rayDirX**2 + rayDirY**2 + rayDirZ**2);
        rayDirX /= rayMag; rayDirY /= rayMag; rayDirZ /= rayMag;

        let t = (1000 - c.cam.z) / rayDirZ;
        if (t < 0 || Math.abs(rayDirZ) < 0.001) t = 1000;

        let worldX = c.cam.x + t * rayDirX;
        let worldY = c.cam.y + t * rayDirY;
        let worldZ = c.cam.z + t * rayDirZ;

        if (mode === 'single') attemptAdd(new Particle3D(worldX, worldY, worldZ, radius));
        else {
            for(let i=0; i<10; i++) attemptAdd(new Particle3D(
                worldX + (Math.random()-0.5)*40,
                worldY + (Math.random()-0.5)*40,
                worldZ + (Math.random()-0.5)*40,
                radius
            ));
        }
    };

    const init = (engine, w, h) => {
        const canvas = engine.ctx.canvas;
        
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Desktop Wheel Zoom
        canvas.addEventListener('wheel', (e) => {
            const currentSettings = s.current.settingsRef;
            if (currentSettings.interactionMode === 'camera') {
                e.preventDefault();
                currentSettings.camZ += e.deltaY;
                currentSettings.camZ = Math.max(200, Math.min(6000, currentSettings.camZ));
            }
        }, { passive: false });

        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName !== 'CANVAS') return;
            const currentSettings = s.current.settingsRef;
            
            if (currentSettings.interactionMode === 'spawn') {
                handlePlacement(e.clientX, e.clientY - 64, canvas.width, canvas.height, currentSettings.mode, currentSettings.size);
                s.current.isDraggingCamera = true; // REUSED FLAG FOR DRAG SPAWNING
            } else if (currentSettings.interactionMode === 'camera') {
                s.current.isDraggingCamera = true;
                s.current.lastMouseX = e.clientX;
                s.current.lastMouseY = e.clientY - 64;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (s.current.isDraggingCamera && e.target.tagName === 'CANVAS') {
                const currentSettings = s.current.settingsRef;
                if (currentSettings.interactionMode === 'spawn') {
                    handlePlacement(e.clientX, e.clientY - 64, canvas.width, canvas.height, currentSettings.mode, currentSettings.size);
                } else if (currentSettings.interactionMode === 'camera') {
                    currentSettings.camX -= (e.clientX - s.current.lastMouseX) * 0.005;
                    currentSettings.camY += (e.clientY - 64 - s.current.lastMouseY) * 0.005;
                    currentSettings.camY = Math.max(-1.5, Math.min(1.5, currentSettings.camY));
                    s.current.lastMouseX = e.clientX;
                    s.current.lastMouseY = e.clientY - 64;
                }
            }
        });
        window.addEventListener('mouseup', () => s.current.isDraggingCamera = false);

        let activeTouchId = null, lx = 0, ly = 0;
        
        canvas.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'CANVAS') return;
            e.preventDefault();
            const currentSettings = s.current.settingsRef;

            if (e.touches.length === 1) {
                let touch = e.touches[0];
                let ty = touch.clientY - 64;
                activeTouchId = touch.identifier;
                lx = touch.clientX;
                ly = ty;
                
                if (currentSettings.interactionMode === 'spawn') {
                    handlePlacement(touch.clientX, ty, canvas.width, canvas.height, currentSettings.mode, currentSettings.size);
                }
            } else if (e.touches.length === 2 && currentSettings.interactionMode === 'camera') {
                activeTouchId = null;
                let dx = e.touches[0].clientX - e.touches[1].clientX;
                let dy = e.touches[0].clientY - e.touches[1].clientY;
                s.current.lastPinchDist = Math.hypot(dx, dy);
            }
        }, {passive: false});

        canvas.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'CANVAS') return;
            e.preventDefault();
            const currentSettings = s.current.settingsRef;

            if (e.touches.length === 1 && activeTouchId !== null) {
                let touch = e.touches[0];
                if (touch.identifier === activeTouchId) {
                    let ty = touch.clientY - 64;
                    if (currentSettings.interactionMode === 'spawn') {
                        handlePlacement(touch.clientX, ty, canvas.width, canvas.height, currentSettings.mode, currentSettings.size);
                    } else if (currentSettings.interactionMode === 'camera') {
                        currentSettings.camX -= (touch.clientX - lx) * 0.01;
                        currentSettings.camY += (ty - ly) * 0.01;
                        currentSettings.camY = Math.max(-1.5, Math.min(1.5, currentSettings.camY));
                        lx = touch.clientX; ly = ty;
                    }
                }
            } else if (e.touches.length === 2 && currentSettings.interactionMode === 'camera') {
                let dx = e.touches[0].clientX - e.touches[1].clientX;
                let dy = e.touches[0].clientY - e.touches[1].clientY;
                let dist = Math.hypot(dx, dy);
                let diff = s.current.lastPinchDist - dist;
                currentSettings.camZ += diff * 5; 
                currentSettings.camZ = Math.max(200, Math.min(6000, currentSettings.camZ));
                s.current.lastPinchDist = dist;
            }
        }, {passive: false});
        
        const endTouch = (e) => {
            if (e.touches.length === 0) activeTouchId = null;
        };
        canvas.addEventListener('touchend', endTouch);
        canvas.addEventListener('touchcancel', endTouch);
    };

    const update = (dt, engine) => {
        const c = s.current;
        const currentSettings = s.current.settingsRef;
        c.framesThisSecond++;
        let now = performance.now();
        if (now - c.lastFpsTime >= 1000) {
            setStats({ particles: c.particles.length, fps: c.framesThisSecond });
            c.framesThisSecond = 0;
            c.lastFpsTime = now;
        }

        // Apply sliders to camera
        c.cameraAngleX = currentSettings.camX;
        c.cameraAngleY = currentSettings.camY;
        c.camRadius = currentSettings.camZ;

        // Apply updated React state to physics engine
        c.currentDT = c.BASE_DT * currentSettings.speed;

        let len = c.particles.length;
        for (let i = 0; i < len; i++) {
            let p1 = c.particles[i];
            for (let j = i + 1; j < len; j++) {
                let p2 = c.particles[j];
                applyGravity(p1, p2, c.G, c.M, c.currentDT);
                applyGravity(p2, p1, c.G, c.M, c.currentDT);
                handleCollision3D(p1, p2, 0.8);
            }
        }

        // Camera math
        const width = engine.ctx.canvas.width;
        const height = engine.ctx.canvas.height;
        let radius = c.camRadius;
        
        c.cam.x = (width/2) + radius * Math.cos(c.cameraAngleY) * Math.sin(c.cameraAngleX);
        c.cam.y = (height/2) + radius * Math.sin(c.cameraAngleY);
        c.cam.z = 1000 + radius * Math.cos(c.cameraAngleY) * Math.cos(c.cameraAngleX);

        c.fwd.x = (width/2) - c.cam.x; c.fwd.y = (height/2) - c.cam.y; c.fwd.z = 1000 - c.cam.z;
        let fMag = Math.hypot(c.fwd.x, c.fwd.y, c.fwd.z);
        c.fwd.x /= fMag; c.fwd.y /= fMag; c.fwd.z /= fMag;

        let tempUpY = -1; // Y is down in canvas
        c.right.x = tempUpY * c.fwd.z; c.right.y = 0; c.right.z = -tempUpY * c.fwd.x;
        let rMag = Math.hypot(c.right.x, c.right.z);
        if(rMag > 0) { c.right.x /= rMag; c.right.z /= rMag; }

        c.up.x = c.fwd.y * c.right.z - c.fwd.z * c.right.y;
        c.up.y = c.fwd.z * c.right.x - c.fwd.x * c.right.z;
        c.up.z = c.fwd.x * c.right.y - c.fwd.y * c.right.x;

        for (let i = 0; i < len; i++) {
            let p = c.particles[i];
            p.step(c.currentDT);
            p.distToCam = Math.hypot(p.x-c.cam.x, p.y-c.cam.y, p.z-c.cam.z);
        }
        
        c.particles.sort((a, b) => b.distToCam - a.distToCam);
    };

    const draw = (ctx, engine, width, height) => {
        const c = s.current;
        for (let i = 0; i < c.particles.length; i++) {
            let p = c.particles[i];
            let dx = p.x - c.cam.x, dy = p.y - c.cam.y, dz = p.z - c.cam.z;
            
            let depth = dx * c.fwd.x + dy * c.fwd.y + dz * c.fwd.z;
            if (depth < 10) continue;
            
            let scale = c.fov / depth; 
            let drawnRadius = p.radius * scale;
            if (drawnRadius < 0.2) continue;
            
            let projX = dx * c.right.x + dy * c.right.y + dz * c.right.z;
            let projY = dx * c.up.x    + dy * c.up.y    + dz * c.up.z;

            let drawnX = width / 2 + projX * scale;
            let drawnY = height / 2 + projY * scale;

            ctx.globalAlpha = Math.max(0.1, Math.min(1.0, 1.2 - (depth / 3000))); 
            ctx.beginPath();
            ctx.arc(drawnX, drawnY, Math.max(drawnRadius, 1), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    };

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden">
            <CanvasSimulation 
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
            />

            {/* Glowing ambient background orb for the dashboard */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-900/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="md:hidden absolute top-6 right-6 z-50 bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-xl shadow-2xl text-white flex items-center gap-2"
            >
                <div className="w-5 h-5 flex flex-col justify-center gap-1">
                    <div className={`h-0.5 bg-white transition-all ${isPanelOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                    <div className={`h-0.5 bg-white transition-all ${isPanelOpen ? 'opacity-0' : ''}`}></div>
                    <div className={`h-0.5 bg-white transition-all ${isPanelOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
                </div>
            </button>

            <div className={`absolute top-6 right-6 md:right-6 md:top-6 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 text-sm text-white w-[320px] pointer-events-auto shadow-2xl transition-all duration-300 z-40 ${isPanelOpen ? 'opacity-100 translate-y-16 md:translate-y-0 visible' : 'opacity-0 md:opacity-100 invisible md:visible pointer-events-none md:pointer-events-auto'}`}>
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🐝</span>
                    <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">N-Particle</h2>
                </div>
                <p className="text-xs text-gray-400 tracking-wider mb-6 pb-4 border-b border-white/10 uppercase font-semibold">O(N²) 3D Swarm</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">PARTICLES</span>
                        <span className="text-white font-mono text-xl">{stats.particles}</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-3">
                        <span className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">FPS</span>
                        <span className={`font-mono text-xl ${stats.fps < 30 ? 'text-red-400' : 'text-emerald-400'}`}>{stats.fps}</span>
                    </div>
                </div>

                <div className="space-y-4 max-h-[60vh] md:max-h-none overflow-y-auto pr-2 custom-scrollbar">
                    
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-xl flex mb-4 relative z-0">
                        {/* Selected background pill */}
                        <div 
                            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg transition-transform duration-300 ease-out z-[-1] ${settings.interactionMode === 'camera' ? 'translate-x-[calc(100%+0.375rem)]' : 'translate-x-0'}`}
                        />
                        <button 
                            onClick={() => setSettings(p => ({...p, interactionMode: 'spawn'}))} 
                            className={`flex-1 py-2 text-xs font-bold transition-all ${settings.interactionMode === 'spawn' ? 'text-white' : 'text-emerald-400/50 hover:text-emerald-300'}`}
                        >
                            ✨ SPAWN
                        </button>
                        <button 
                            onClick={() => setSettings(p => ({...p, interactionMode: 'camera'}))} 
                            className={`flex-1 py-2 text-xs font-bold transition-all ${settings.interactionMode === 'camera' ? 'text-white' : 'text-emerald-400/50 hover:text-emerald-300'}`}
                        >
                            🎥 CAMERA
                        </button>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl mb-4">
                        <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                            {settings.interactionMode === 'spawn' 
                                ? "Screen touches will inject fresh particles." 
                                : "Screen touches will orbit and zoom the universe."}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-gray-400 text-[10px] font-bold tracking-wider">SPAWN TYPE</label>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setSettings(p => ({...p, mode: 'single'}))} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${settings.mode === 'single' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}>SINGLE</button>
                            <button onClick={() => setSettings(p => ({...p, mode: 'circle'}))} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${settings.mode === 'circle' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}>BURST</button>
                        </div>

                        <div className="pt-2 border-t border-white/10 space-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-gray-400 text-[10px] font-bold tracking-wider">PARTICLE SIZE / MASS</label>
                                    <span className="text-[10px] font-mono text-emerald-400">{settings.size}</span>
                                </div>
                                <input type="range" min="2" max="30" value={settings.size} onChange={(e) => setSettings(prev => ({...prev, size: parseInt(e.target.value)}))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-emerald-500 cursor-pointer" />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <label className="text-gray-400 text-[10px] font-bold tracking-wider">TIME DIALATION</label>
                                    <span className="text-[10px] font-mono text-emerald-400">{settings.speed.toFixed(1)}x</span>
                                </div>
                                <input type="range" min="0.1" max="5.0" step="0.1" value={settings.speed} onChange={(e) => setSettings(prev => ({...prev, speed: parseFloat(e.target.value)}))} className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none accent-emerald-500 cursor-pointer" />
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => { s.current.particles = []; setStats(p => ({...p, particles: 0})); }}
                        className="w-full mt-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold hover:bg-red-500/20 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        CLEAR SWARM
                    </button>
                </div>
            </div>

            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
