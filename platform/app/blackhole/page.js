"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { AdBanner } from "@/shared/ads";

export default function BlackHoleSimulationPage() {
    const containerRef = useRef(null);
    const [stats, setStats] = useState({ 
        fps: 0, 
        consumed: 0,
        particles: 10000 
    });

    // Refs for simulation state to prevent React re-renders from destroying WebGL context
    const simState = useRef({
        consumed: 0,
        frames: 0,
        lastTime: performance.now()
    });

    useEffect(() => {
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
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 5000);
        camera.position.set(0, 150, 600);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 1);
        
        // Append child specifically to our container
        containerRef.current.appendChild(renderer.domElement);

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
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);
        
        // Start loop
        animate();

        return () => {
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
    }, []);

    return (
        <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden">
            <div ref={containerRef} className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto" />
            
            {/* Glowing ambient background orb for the dashboard */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="absolute top-6 right-6 bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 text-sm text-white min-w-[320px] pointer-events-auto shadow-2xl">
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🕳️</span>
                    <h2 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Gargantua</h2>
                </div>
                <p className="text-xs text-gray-400 tracking-wider mb-6 pb-4 border-b border-white/10 uppercase font-semibold">RELATIVISTIC RENDERING</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                        <span className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">PARTICLES</span>
                        <span className="text-white font-mono text-xl">{stats.particles}</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-3">
                        <span className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">EATEN</span>
                        <span className="text-purple-400 font-mono text-xl">{stats.consumed}</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                        <span className="text-xs font-bold tracking-wider text-gray-500">BLACK HOLE MASS</span>
                        <span className="text-pink-400 font-mono text-sm tracking-widest">5,000,000</span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 mt-2">
                        <span className="text-xs font-bold tracking-wider text-gray-500">ENGINE FPS</span>
                        <span className={`font-mono text-sm tracking-widest ${stats.fps < 30 ? 'text-red-400' : 'text-emerald-400'}`}>{stats.fps}</span>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl flex flex-col gap-2">
                            <p className="text-xs text-purple-200"><strong className="text-white">Desktop:</strong> Drag to orbit, Scroll to zoom.</p>
                            <p className="text-xs text-purple-200"><strong className="text-white">Mobile:</strong> 1 Finger to orbit, 2 Fingers to pinch.</p>
                        </div>
                    </div>
                </div>
            </div>

            <AdBanner className="absolute bottom-4 left-0 right-0 z-10 pointer-events-none" />
        </div>
    );
}
