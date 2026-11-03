"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import { Group, Hint, Stats } from "@/components/controls";

export default function BlackHoleSimulationPage() {
    const containerRef = useRef(null);
    const [stats, setStats] = useState({ 
        fps: 0, 
        consumed: 0,
        particles: 10000 
    });
    const [showScience, setShowScience] = useState(false);

    // Refs for simulation state to prevent React re-renders from destroying WebGL context
    const simState = useRef({
        consumed: 0,
        frames: 0,
        lastTime: performance.now()
    });

    useEffect(() => {
        if (!containerRef.current) return;
        let rafId;
        let animationId;
        let cleanupFn = null;

        // Defer init by one rAF so Next.js SPA navigation has time to
        // fully lay out the container before we read its clientWidth/Height
        rafId = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        // --- CONSTANTS ---
        const G = 1.0;
        const M = 5e6;
        const DT = 0.005;
        const EVENT_HORIZON_RADIUS = 50.0;
        const CONSTANT_PARTICLES = 10000;
        const RE = 52.0;

        // --- SETUP ---
        const scene = new THREE.Scene();
        // Fallback to window size if container hasn't been laid out yet
        const W = () => containerRef.current?.clientWidth  || window.innerWidth;
        const H = () => containerRef.current?.clientHeight || (window.innerHeight - 64);

        const camera = new THREE.PerspectiveCamera(60, W() / H(), 1, 5000);
        camera.position.set(0, 150, 600);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(W(), H());
        renderer.setClearColor(0x000000, 1);
        
        // Append child specifically to our container
        containerRef.current.appendChild(renderer.domElement);

        const setUIOpacity = (val) => {
            document.querySelectorAll('.ui-panel').forEach(p => {
                p.style.opacity = val;
                p.style.pointerEvents = val === '0' ? 'none' : 'auto';
            });
        };

        const onInteractStart = () => setUIOpacity('0');
        const onInteractEnd = () => setUIOpacity('1');
        
        renderer.domElement.addEventListener('mousedown', onInteractStart);
        renderer.domElement.addEventListener('touchstart', onInteractStart, {passive: true});
        window.addEventListener('mouseup', onInteractEnd);
        window.addEventListener('touchend', onInteractEnd);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 2000;
        controls.minDistance = 100;

        // --- DATA ---
        const particleData = new Float32Array(CONSTANT_PARTICLES * 7);
        const positions = new Float32Array(CONSTANT_PARTICLES * 3);
        const velocities = new Float32Array(CONSTANT_PARTICLES * 3);

        const spawnParticle = (index, isInitial) => {
            let angle = Math.random() * 2 * Math.PI;
            let maxR = isInitial ? 1500 : 400;
            let minR = isInitial ? 100 : 51.5;
            let r = minR + Math.pow(Math.random(), isInitial ? 1.0 : 2.5) * (maxR - minR);
            
            let px = Math.cos(angle) * r;
            let thickness = (r / maxR) * 10.0 + 2.0; 
            let py = (Math.random() - 0.5) * thickness; 
            let pz = Math.sin(angle) * r;

            let orbitSpeed = Math.sqrt((G * M) / r) * (isInitial ? 0.7 : 1.0);
            let velAngle = angle + (Math.PI / 2);
            
            let mass = 2.0;
            let mx = Math.cos(velAngle) * orbitSpeed * mass;
            let my = (Math.random() - 0.5) * (orbitSpeed * 0.1);
            let mz = Math.sin(velAngle) * orbitSpeed * mass;

            mx *= (0.98 + Math.random() * 0.04);
            mz *= (0.98 + Math.random() * 0.04);

            let offset = index * 7;
            particleData[offset] = px;
            particleData[offset+1] = py;
            particleData[offset+2] = pz;
            particleData[offset+3] = mx;
            particleData[offset+4] = my;
            particleData[offset+5] = mz;
            particleData[offset+6] = 0; // consumed status
        };

        for (let i = 0; i < CONSTANT_PARTICLES; i++) spawnParticle(i, true);

        // --- SHADERS ---
        const vertexShader = `
            uniform float r_einstein;
            uniform float r_shadow;
            uniform float isSecondary;

            attribute vec3 velocity;
            varying vec3 vVelocity;
            varying float vDoppler;
            varying float vIntensity;

            void main() {
                vVelocity = velocity;

                vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
                float depth = max(-viewPos.z, 0.1); 
                
                vec4 bhViewPos = viewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                float bhDepth = -bhViewPos.z;

                vec2 u = viewPos.xy - bhViewPos.xy; 
                float ratio = bhDepth / depth;
                vec2 u_lens = u * ratio;
                
                float beta = length(u_lens);
                beta = max(beta, 0.001); 
                vec2 dir = u_lens / beta;
                
                float r = beta;
                vIntensity = 1.0;

                if (isSecondary > 0.5) {
                    if (depth > bhDepth) { 
                        r = 0.5 * (sqrt(beta*beta + 4.0 * r_einstein * r_einstein) - beta);
                        r *= 0.98;
                        dir = -dir; 
                        vIntensity = 0.3;
                        if (r < r_shadow * 0.95) vIntensity = 0.0;
                    } else vIntensity = 0.0; 
                } else {
                    if (depth > bhDepth) {
                        r = 0.5 * (beta + sqrt(beta*beta + 4.0 * r_einstein * r_einstein));
                    }
                }

                vec2 finalXY = bhViewPos.xy + dir * r;
                vec4 finalViewPos = vec4(finalXY, bhViewPos.z, 1.0);

                vec3 viewVel = normalize(normalMatrix * velocity);
                vDoppler = viewVel.z; 

                gl_Position = projectionMatrix * finalViewPos;
                gl_PointSize = 4.0 * (1000.0 / depth);
            }
        `;

        const fragmentShader = `
            varying float vDoppler;
            varying float vIntensity;

            void main() {
                if (vIntensity <= 0.01) discard;

                vec3 color = vec3(1.0, 0.6, 0.2); 
                float dopplerEffect = vDoppler * 2.5; 
                float brightness = clamp(1.0 + dopplerEffect, 0.05, 5.0);

                if (dopplerEffect > 0.0) {
                    color = mix(color, vec3(0.8, 0.9, 1.0), dopplerEffect * 0.9);
                } else {
                    color = mix(color, vec3(0.5, 0.1, 0.0), -dopplerEffect * 0.9);
                }

                vec2 coord = gl_PointCoord - vec2(0.5);
                float distSq = dot(coord, coord);
                if(distSq > 0.25) discard;
                
                float alpha = exp(-distSq * 10.0) * brightness * vIntensity;
                gl_FragColor = vec4(color, alpha);
            }
        `;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const materialPrimary = new THREE.ShaderMaterial({
            uniforms: { r_einstein: { value: RE }, r_shadow: { value: EVENT_HORIZON_RADIUS }, isSecondary: { value: 0.0 } },
            vertexShader,
            fragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
            transparent: true
        });

        const materialSecondary = new THREE.ShaderMaterial({
            uniforms: { r_einstein: { value: RE }, r_shadow: { value: EVENT_HORIZON_RADIUS }, isSecondary: { value: 1.0 } },
            vertexShader,
            fragmentShader,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
            transparent: true
        });

        const pointsPrimary = new THREE.Points(geometry, materialPrimary);
        const pointsSecondary = new THREE.Points(geometry, materialSecondary);
        scene.add(pointsPrimary);
        scene.add(pointsSecondary);

        // --- SHADOW ---
        const shadowGeo = new THREE.SphereGeometry(EVENT_HORIZON_RADIUS * 0.95, 32, 32);
        const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false, depthWrite: false });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.renderOrder = -1; 
        pointsPrimary.renderOrder = 1;
        pointsSecondary.renderOrder = 2;
        scene.add(shadowMesh);

        // --- GLOW SPRITE ---
        const canvasGlow = document.createElement('canvas');
        canvasGlow.width = 256; canvasGlow.height = 256;
        const ctxGlow = canvasGlow.getContext('2d');
        const gradient = ctxGlow.createRadialGradient(128, 128, 50, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); 
        gradient.addColorStop(0.1, 'rgba(255, 200, 100, 0.4)');
        gradient.addColorStop(0.4, 'rgba(100, 50, 200, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctxGlow.fillStyle = gradient;
        ctxGlow.fillRect(0, 0, 256, 256);

        const glowTex = new THREE.CanvasTexture(canvasGlow);
        const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true });
        const glowSprite = new THREE.Sprite(glowMat);
        glowSprite.scale.set(EVENT_HORIZON_RADIUS * 4.5, EVENT_HORIZON_RADIUS * 4.5, 1);
        glowSprite.renderOrder = -2;
        scene.add(glowSprite);

        // --- UPDATE LOOP ---
        let animationId;
        const updatePhysics = () => {
            let posArr = geometry.attributes.position.array;
            let velArr = geometry.attributes.velocity.array;
            let mass = 2.0;

            for (let i = 0; i < CONSTANT_PARTICLES; i++) {
                let offset = i * 7;
                if (particleData[offset+6]) continue;

                let px = particleData[offset], py = particleData[offset+1], pz = particleData[offset+2];
                let mx = particleData[offset+3], my = particleData[offset+4], mz = particleData[offset+5];
                let distSq = px*px + py*py + pz*pz;
                let hyp = Math.sqrt(distSq);

                if (hyp < EVENT_HORIZON_RADIUS) {
                    particleData[offset+6] = 1; 
                    simState.current.consumed++;
                    spawnParticle(i, false);
                    continue;
                }

                let force = (G * mass * M) / distSq;
                let dx = -px / hyp, dy = -py / hyp, dz = -pz / hyp;

                mx += force * dx * DT;
                my += force * dy * DT;
                mz += force * dz * DT;
                px += (mx / mass) * DT;
                py += (my / mass) * DT;
                pz += (mz / mass) * DT;

                particleData[offset] = px; particleData[offset+1] = py; particleData[offset+2] = pz;
                particleData[offset+3] = mx; particleData[offset+4] = my; particleData[offset+5] = mz;

                let pOffset = i * 3;
                posArr[pOffset] = px; posArr[pOffset+1] = py; posArr[pOffset+2] = pz;
                velArr[pOffset] = mx / mass; velArr[pOffset+1] = my / mass; velArr[pOffset+2] = mz / mass;
            }

            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.velocity.needsUpdate = true;
        };

        const animate = () => {
            animationId = requestAnimationFrame(animate);
            updatePhysics();
            controls.update();
            renderer.render(scene, camera);

            // FPS
            simState.current.frames++;
            let now = performance.now();
            if (now - simState.current.lastTime >= 1000) {
                setStats({
                    fps: simState.current.frames,
                    consumed: simState.current.consumed,
                    particles: CONSTANT_PARTICLES
                });
                simState.current.frames = 0;
                simState.current.lastTime = now;
            }
        };

        const onResize = () => {
            camera.aspect = W() / H();
            camera.updateProjectionMatrix();
            renderer.setSize(W(), H());
        };
        window.addEventListener('resize', onResize);
        onResize(); // sync camera AR + renderer size before first frame
        
        // Start loop
        animate();

        // Store cleanup so outer effect return can call it
        cleanupFn = () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(animationId);
            containerRef.current?.removeChild(renderer.domElement);
            renderer.dispose();
            geometry.dispose();
            materialPrimary.dispose();
            materialSecondary.dispose();
            shadowMat.dispose();
            glowTex.dispose();
        };
        }); // end rAF

        return () => {
            cancelAnimationFrame(rafId);
            if (typeof cleanupFn === 'function') cleanupFn();
        };
    }, []);

    return (
        <SimShell
            slug="blackhole"
            subtitle="Lensing · Doppler beaming · event horizon"
            onScience={() => setShowScience(true)}
            peek={
                <Stats items={[
                    { label: "Particles", value: stats.particles.toLocaleString() },
                    { label: "Eaten", value: stats.consumed.toLocaleString(), tone: "accent" },
                    { label: "FPS", value: stats.fps, tone: stats.fps && stats.fps < 30 ? "bad" : undefined },
                ]} />
            }
            panel={
                <>
                    <Group label="Black hole">
                        <div className="flex items-baseline justify-between text-[13px]">
                            <span className="text-ink-2">Mass</span>
                            <span className="font-mono tabular text-ink">5,000,000</span>
                        </div>
                        <Hint>Consumed particles respawn at the outer edge of the accretion disk.</Hint>
                    </Group>
                    <Group label="Camera">
                        <Hint>Drag to orbit and scroll to zoom. On touch screens, use one finger to orbit and pinch to zoom.</Hint>
                    </Group>
                </>
            }
        >
            <div ref={containerRef} className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto" />
            {showScience && (
                <ScienceModal
                    title="3D Black Hole — Relativistic Simulation"
                    accentClass="text-purple-400 border-purple-400/30 bg-purple-400/10"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "Schwarzschild Radius & Event Horizon",
                            text: "The event horizon is the point of no return around a black hole. Any particle crossing it cannot escape. The radius is given by the Schwarzschild formula and depends only on mass — not charge or spin. In this simulation, particles within radius R_s = 50 units are consumed.",
                            equations: [
                                { label: "Sch. Radius", value: "R_s = 2GM / c²" },
                                { label: "In sim",      value: "EVENT_HORIZON_RADIUS = 50 units" },
                            ]
                        },
                        {
                            heading: "Accretion Disk & Particle Orbits",
                            text: "The glowing disk of matter spiralling into a black hole is called an accretion disk. Particles are attracted by Newtonian gravity and given initial tangential velocities to form orbits. The orange/white glow is from the primary particles; cyan/blue from secondary stream particles on a tighter orbit.",
                            code:
`// Gravitational force on each particle
const dx = -p.position.x,   // towards origin
      dy = -p.position.y,
      dz = -p.position.z;
const r2 = dx*dx + dy*dy + dz*dz;
const r  = Math.sqrt(r2);
const a  = G * M / r2;       // |a| = GM/r²

p.velocity.x += (dx/r) * a * DT;
p.velocity.y += (dy/r) * a * DT;
p.velocity.z += (dz/r) * a * DT;`
                        },
                        {
                            heading: "Gravitational Lensing Approximation",
                            text: "Real black holes bend light around them — the famous 'Einstein ring'. This simulation approximates the lensing effect visually via a custom glow texture and a Schwarzschild-radius-based shadow sphere with a rim-lighting material. True general-relativistic ray tracing requires GPU shaders and is computationally intensive."
                        },
                        {
                            heading: "Relativistic Doppler Beaming",
                            text: "Matter moving towards you in an accretion disk appears brighter and bluer (blueshift); matter moving away appears dimmer and redder (redshift). This is called relativistic Doppler beaming. The warm-orange vs cool-cyan colour split across the disk approximates this effect, just as depicted in Interstellar's Gargantua."
                        }
                    ]}
                />
            )}
        </SimShell>
    );
}
