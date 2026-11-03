"use client";

import { simTop } from "@/core/viewport";
import { useState, useRef } from "react";
import CanvasSimulation from "@/components/CanvasSimulation";
import { applyGravity, handleCollision3D } from "@/core/physics";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { ActionButton, Group, Icons, Segmented, Slider, Stats } from "@/components/controls";

export default function NParticleSimulationPage() {
    const [stats, setStats] = useState({ particles: 0, fps: 0 });
    const [settings, setSettings] = useState({ speed: 1.0, size: 10, mode: 'single', camX: 0, camY: 0, camZ: 1500, panX: 0, panY: 0 });
    const [showScience, setShowScience] = useState(false);

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
        mouseX: 0,
        mouseY: 0,
        showCrosshair: false,
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

    const getSpawnPos = (screenX, screenY, width, height, c) => {
        const nx = screenX - width / 2;
        const ny = screenY - height / 2;

        let rayDirX = nx * c.right.x + ny * c.up.x + c.fov * c.fwd.x;
        let rayDirY = nx * c.right.y + ny * c.up.y + c.fov * c.fwd.y;
        let rayDirZ = nx * c.right.z + ny * c.up.z + c.fov * c.fwd.z;
        
        let rayMag = Math.sqrt(rayDirX**2 + rayDirY**2 + rayDirZ**2);
        rayDirX /= rayMag; rayDirY /= rayMag; rayDirZ /= rayMag;

        // Dynamic Depth: Spawn particles exactly at the camera's focal plane distance
        let t = c.camRadius; 

        return {
            x: c.cam.x + t * rayDirX,
            y: c.cam.y + t * rayDirY,
            z: c.cam.z + t * rayDirZ
        };
    };

    const handlePlacement = (screenX, screenY, width, height, mode, radius) => {
        const pos = getSpawnPos(screenX, screenY, width, height, s.current);

        if (mode === 'single') attemptAdd(new Particle3D(pos.x, pos.y, pos.z, radius));
        else {
            for(let i=0; i<10; i++) attemptAdd(new Particle3D(
                pos.x + (Math.random()-0.5)*40,
                pos.y + (Math.random()-0.5)*40,
                pos.z + (Math.random()-0.5)*40,
                radius
            ));
        }
    };

    const init = (engine, w, h) => {
        const canvas = engine.ctx.canvas;
        
        const setUIOpacity = (val) => {
            document.querySelectorAll('.ui-panel').forEach(p => {
                p.style.opacity = val;
                p.style.pointerEvents = val === '0' ? 'none' : 'auto';
            });
        };

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        canvas.addEventListener('mouseleave', () => {
            s.current.showCrosshair = false;
            setUIOpacity('1');
        });

        // Desktop Wheel Zoom
        canvas.addEventListener('wheel', (e) => {
            const currentSettings = s.current.settingsRef;
            e.preventDefault();
            currentSettings.camZ += e.deltaY;
            currentSettings.camZ = Math.max(200, Math.min(6000, currentSettings.camZ));
        }, { passive: false });

        let mouseStartX = 0, mouseStartY = 0;
        let mouseStartTime = 0;
        let isActivelyDraggingMouse = false;

        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName !== 'CANVAS') return;
            s.current.isDraggingCamera = true;
            isActivelyDraggingMouse = false;
            s.current.lastMouseX = e.clientX;
            s.current.lastMouseY = e.clientY - simTop();
            mouseStartX = e.clientX;
            mouseStartY = e.clientY - simTop();
            mouseStartTime = performance.now();
            s.current.mouseButton = e.button; // 0=left, 1=middle, 2=right
        });

        window.addEventListener('mousemove', (e) => {
            if (e.target.tagName === 'CANVAS') {
                s.current.mouseX = e.clientX;
                s.current.mouseY = e.clientY - simTop();
                s.current.showCrosshair = true;
            } else {
                s.current.showCrosshair = false;
            }

            if (s.current.isDraggingCamera && e.target.tagName === 'CANVAS') {
                const currentSettings = s.current.settingsRef;
                let my = e.clientY - simTop();
                
                let dist = Math.hypot(e.clientX - mouseStartX, my - mouseStartY);
                if (dist > 5 && !isActivelyDraggingMouse) {
                    isActivelyDraggingMouse = true;
                    setUIOpacity('0');
                }

                if (s.current.mouseButton === 0) {
                    // Orbit
                    currentSettings.camX -= (e.clientX - s.current.lastMouseX) * 0.005;
                    currentSettings.camY += (my - s.current.lastMouseY) * 0.005;
                    currentSettings.camY = Math.max(-1.5, Math.min(1.5, currentSettings.camY));
                } else if (s.current.mouseButton === 2 || s.current.mouseButton === 1) {
                    // Pan
                    currentSettings.panX -= (e.clientX - s.current.lastMouseX) * 2;
                    currentSettings.panY -= (my - s.current.lastMouseY) * 2;
                }
                s.current.lastMouseX = e.clientX;
                s.current.lastMouseY = my;
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (s.current.isDraggingCamera) {
                const currentSettings = s.current.settingsRef;
                let my = e.clientY - simTop();
                let dist = Math.hypot(e.clientX - mouseStartX, my - mouseStartY);
                let time = performance.now() - mouseStartTime;

                if (dist < 5 && time < 300) {
                    // Quick click -> Spawn
                    handlePlacement(e.clientX, my, canvas.width, canvas.height, currentSettings.mode, currentSettings.size);
                }
                s.current.isDraggingCamera = false;
                isActivelyDraggingMouse = false;
                setUIOpacity('1');
            }
        });

        let activeTouchId = null, lx = 0, ly = 0;
        let touchStartX = 0, touchStartY = 0;
        let touchStartTime = 0;
        let isPanning = false;
        let isOrbiting = false;
        let isActivelyDraggingTouch = false;
        let lastPanX = 0, lastPanY = 0;
        
        canvas.addEventListener('touchstart', (e) => {
            if (e.target.tagName !== 'CANVAS') return;
            e.preventDefault();
            isActivelyDraggingTouch = false;

            if (e.touches.length === 1) {
                let touch = e.touches[0];
                activeTouchId = touch.identifier;
                lx = touch.clientX;
                ly = touch.clientY - simTop();
                touchStartX = lx;
                touchStartY = ly;
                touchStartTime = performance.now();
                
                s.current.mouseX = lx;
                s.current.mouseY = ly;
                s.current.showCrosshair = true;
                
                isOrbiting = true;
                isPanning = false;
            } else if (e.touches.length === 2) {
                s.current.showCrosshair = false;
                isOrbiting = false;
                isPanning = true;
                activeTouchId = null;
                let dx = e.touches[0].clientX - e.touches[1].clientX;
                let dy = e.touches[0].clientY - e.touches[1].clientY;
                s.current.lastPinchDist = Math.hypot(dx, dy);
                
                lastPanX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                lastPanY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - simTop();
            }
        }, {passive: false});

        canvas.addEventListener('touchmove', (e) => {
            if (e.target.tagName !== 'CANVAS') return;
            e.preventDefault();
            const currentSettings = s.current.settingsRef;

            if (e.touches.length === 1 && isOrbiting) {
                let touch = e.touches[0];
                if (touch.identifier === activeTouchId) {
                    let ty = touch.clientY - simTop();
                    
                    let dist = Math.hypot(touch.clientX - touchStartX, ty - touchStartY);
                    if (dist > 10 && !isActivelyDraggingTouch) {
                        isActivelyDraggingTouch = true;
                        setUIOpacity('0');
                    }

                    s.current.mouseX = touch.clientX;
                    s.current.mouseY = ty;
                    
                    currentSettings.camX -= (touch.clientX - lx) * 0.01;
                    currentSettings.camY += (ty - ly) * 0.01;
                    currentSettings.camY = Math.max(-1.5, Math.min(1.5, currentSettings.camY));
                    lx = touch.clientX; ly = ty;
                }
            } else if (e.touches.length === 2 && isPanning) {
                if (!isActivelyDraggingTouch) {
                    isActivelyDraggingTouch = true;
                    setUIOpacity('0');
                }

                let dx = e.touches[0].clientX - e.touches[1].clientX;
                let dy = e.touches[0].clientY - e.touches[1].clientY;
                let dist = Math.hypot(dx, dy);
                
                // Zoom
                let diff = s.current.lastPinchDist - dist;
                currentSettings.camZ += diff * 5; 
                currentSettings.camZ = Math.max(200, Math.min(6000, currentSettings.camZ));
                s.current.lastPinchDist = dist;

                // Pan
                let panX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                let panY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - simTop();
                
                currentSettings.panX -= (panX - lastPanX) * 2;
                currentSettings.panY -= (panY - lastPanY) * 2;
                
                lastPanX = panX;
                lastPanY = panY;
            }
        }, {passive: false});
        
        const endTouch = (e) => {
            const currentSettings = s.current.settingsRef;
            if (e.changedTouches.length > 0) {
                let touch = e.changedTouches[0];
                if (touch.identifier === activeTouchId && isOrbiting) {
                    let ty = touch.clientY - simTop();
                    let dist = Math.hypot(touch.clientX - touchStartX, ty - touchStartY);
                    let time = performance.now() - touchStartTime;
                    
                    if (dist < 10 && time < 300) {
                        // Quick tap -> Spawn
                        handlePlacement(touch.clientX, ty, canvas.width, canvas.height, currentSettings.mode, currentSettings.size);
                    }
                }
            }
            if (e.touches.length === 0) {
                activeTouchId = null;
                isOrbiting = false;
                isPanning = false;
                isActivelyDraggingTouch = false;
                s.current.showCrosshair = false;
                setUIOpacity('1');
            } else if (e.touches.length === 1) {
                let touch = e.touches[0];
                activeTouchId = touch.identifier;
                lx = touch.clientX;
                ly = touch.clientY - simTop();
                s.current.mouseX = lx;
                s.current.mouseY = ly;
                s.current.showCrosshair = true;
                isOrbiting = true;
                isPanning = false;
            }
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
        
        let targetX = (width/2) + currentSettings.panX;
        let targetY = (height/2) + currentSettings.panY;
        let targetZ = 1000;

        c.cam.x = targetX + radius * Math.cos(c.cameraAngleY) * Math.sin(c.cameraAngleX);
        c.cam.y = targetY + radius * Math.sin(c.cameraAngleY);
        c.cam.z = targetZ + radius * Math.cos(c.cameraAngleY) * Math.cos(c.cameraAngleX);

        c.fwd.x = targetX - c.cam.x; c.fwd.y = targetY - c.cam.y; c.fwd.z = targetZ - c.cam.z;
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

        // Draw Crosshair Indicator 
        if (c.showCrosshair) {
            let crossPos = getSpawnPos(c.mouseX, c.mouseY, width, height, c);
            let dx = crossPos.x - c.cam.x, dy = crossPos.y - c.cam.y, dz = crossPos.z - c.cam.z;
            let depth = dx * c.fwd.x + dy * c.fwd.y + dz * c.fwd.z;
            
            if (depth >= 10) {
                let scale = c.fov / depth;
                let projX = dx * c.right.x + dy * c.right.y + dz * c.right.z;
                let projY = dx * c.up.x    + dy * c.up.y    + dz * c.up.z;
                
                let drawnX = width / 2 + projX * scale;
                let drawnY = height / 2 + projY * scale;
                
                // Scale the crosshair based on depth to show 3D perspective
                let crossSize = 18 * scale;
                
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)'; // Emerald text color match
                ctx.lineWidth = 1.5;
                
                // Draw inner dot
                ctx.beginPath();
                ctx.arc(drawnX, drawnY, Math.max(1, 2 * scale), 0, Math.PI * 2);
                ctx.stroke();

                // Draw bounding reticle pieces
                ctx.beginPath();
                ctx.moveTo(drawnX - crossSize * 1.5, drawnY);
                ctx.lineTo(drawnX - crossSize * 0.5, drawnY);
                ctx.moveTo(drawnX + crossSize * 0.5, drawnY);
                ctx.lineTo(drawnX + crossSize * 1.5, drawnY);
                
                ctx.moveTo(drawnX, drawnY - crossSize * 1.5);
                ctx.lineTo(drawnX, drawnY - crossSize * 0.5);
                ctx.moveTo(drawnX, drawnY + crossSize * 0.5);
                ctx.lineTo(drawnX, drawnY + crossSize * 1.5);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1.0;
    };

    const setMode = (mode) => setSettings((p) => ({ ...p, mode }));
    const clearSwarm = () => { s.current.particles = []; setStats((p) => ({ ...p, particles: 0 })); };

    return (
        <SimShell
            slug="nparticle"
            subtitle="O(N²) gravity · 3D swarm"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <Segmented label="Spawn type" value={settings.mode} onChange={setMode} options={[
                            { value: "single", label: "Single" },
                            { value: "circle", label: "Burst" },
                        ]} />
                    </div>
                    <Stats items={[
                        { label: "Particles", value: stats.particles.toLocaleString() },
                        { label: "FPS", value: stats.fps, tone: stats.fps && stats.fps < 30 ? "bad" : undefined },
                    ]} />
                </div>
            }
            panel={
                <>
                    <Group label="Particles">
                        <Slider label="Size and mass" value={settings.size} min={2} max={30} step={1} onChange={(v) => setSettings((p) => ({ ...p, size: v }))} />
                        <Slider label="Time dilation" value={settings.speed} min={0.1} max={5.0} step={0.1} onChange={(v) => setSettings((p) => ({ ...p, speed: v }))} format={(v) => `${v.toFixed(1)}×`} />
                    </Group>
                    <Group label="Camera">
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                            <dt className="text-ink-3">Spawn</dt><dd className="text-ink-2">Quick tap or click</dd>
                            <dt className="text-ink-3">Orbit</dt><dd className="text-ink-2">Drag, or left-click drag</dd>
                            <dt className="text-ink-3">Pan</dt><dd className="text-ink-2">Two-finger drag, or right-click drag</dd>
                            <dt className="text-ink-3">Zoom</dt><dd className="text-ink-2">Pinch or scroll</dd>
                        </dl>
                    </Group>
                    <ActionButton tone="danger" icon={Icons.clear} onClick={clearSwarm}>Clear swarm</ActionButton>
                </>
            }
        >
            <CanvasSimulation
                initSimulation={init}
                updateSimulation={update}
                drawSimulation={draw}
            />
            {showScience && (
                <ScienceModal
                    title="N-Particle Sandbox — N-Body Simulation"
                    accentClass="text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "O(N²) N-Body Gravitational Simulation",
                            text: "In an N-body simulation, every particle exerts a gravitational force on every other particle. With N particles, that's N × (N-1) / 2 unique pairs to evaluate each frame — hence O(N²) computational complexity. This is the most accurate brute-force approach, making it expensive but perfectly faithful to the physics.",
                            equations: [
                                { label: "Pairs",    value: "N × (N-1) / 2 per frame" },
                                { label: "Force",    value: "F_ij = G·m_i·m_j / r²" },
                                { label: "Net accel",value: "a_i = Σ F_ij / m_i  (j ≠ i)" },
                            ]
                        },
                        {
                            heading: "Pairwise Force Calculation",
                            text: "Each frame, all pairs (i, j) are iterated. The force on particle i from particle j is computed and applied equally and oppositely (Newton's 3rd Law), halving the computation.",
                            code:
`for (let i = 0; i < N; i++) {
  for (let j = i + 1; j < N; j++) {
    const dx = p[j].x - p[i].x;
    const dy = p[j].y - p[i].y;
    const dz = p[j].z - p[i].z;
    const r2 = dx*dx + dy*dy + dz*dz + ε; // ε softens close encounters
    const r  = Math.sqrt(r2);
    const f  = G * p[i].mass * p[j].mass / r2;

    // Apply equal and opposite forces (Newton 3rd Law)
    p[i].vx += (dx/r) * f / p[i].mass * DT;
    p[j].vx -= (dx/r) * f / p[j].mass * DT;
    // ... similarly for vy, vz
  }
}`
                        },
                        {
                            heading: "Emergent Behaviour & Cluster Formation",
                            text: "Despite simple rules (gravity between pairs), complex structures emerge: particles clump into clusters, clusters orbit each other, and smaller groups get ejected at high speed via gravitational slingshot. This is the same physics driving galaxy formation — structure emerges purely from initial conditions and N-body gravity, with no explicit rules for clustering."
                        },
                        {
                            heading: "Softening Parameter (ε)",
                            text: "When two particles come very close (r → 0), raw Newtonian gravity diverges to infinity. A softening term ε is added to r² in the denominator to prevent unrealistic extreme forces at close range, making the simulation numerically stable: F = GM/(r² + ε)."
                        }
                    ]}
                />
            )}
        </SimShell>
    );
}
