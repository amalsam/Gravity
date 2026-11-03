"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import StoryToasts from "@/components/StoryToasts";
import { ActionButton, Group, Hint, Icons, Segmented, Slider, Switch } from "@/components/controls";
import { useToasts } from "@/shared/useToasts";
import { track } from "@/shared/track";
import { Collision, PRESETS, DEFAULT_PARAMS, MAX_STEPS, DT, MYR_PER_UNIT, encodeParams, decodeParams } from "@/core/galaxy";

const fmtTime = (steps) => {
    const myr = steps * DT * MYR_PER_UNIT;
    return myr >= 1000 ? `${(myr / 1000).toFixed(2)} Gyr` : `${Math.round(myr)} Myr`;
};

function dotTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export default function GalaxyPage() {
    const mountRef = useRef(null);
    const [params, setParams] = useState(DEFAULT_PARAMS);
    const [playing, setPlaying] = useState(true);
    const [speed, setSpeed] = useState(3);
    const [autoRotate, setAutoRotate] = useState(true);
    const [step, setStep] = useState(0);
    const [stars, setStars] = useState(0);
    const [webgl, setWebgl] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showScience, setShowScience] = useState(false);
    const { items: toastItems, push: pushToast, clear: clearToasts } = useToasts({ max: 3, ttl: 6000 });

    const sim = useRef(null);
    const ctl = useRef({ playing: true, speed: 3, seekTo: null, lastEvent: 0, autoRotate: true, rebuild: null });

    useEffect(() => { ctl.current.playing = playing; }, [playing]);
    useEffect(() => { ctl.current.speed = speed; }, [speed]);
    useEffect(() => { ctl.current.autoRotate = autoRotate; }, [autoRotate]);

    // Read a shared collision from the URL hash once on load
    useEffect(() => {
        const fromHash = decodeParams(window.location.hash);
        if (fromHash) setParams(fromHash);
    }, []);

    // Build / rebuild the simulation whenever the setup changes
    useEffect(() => {
        ctl.current.rebuild?.(params);
        if (params.preset !== "antennae" || window.location.hash) {
            history.replaceState(null, "", `#${encodeParams(params)}`);
        }
    }, [params]);

    // ── Three.js scene ───────────────────────────────────────────────────────
    useEffect(() => {
        const mount = mountRef.current;
        const k0 = ctl.current;
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        } catch {
            setWebgl(false);
            return;
        }
        const small = window.matchMedia("(max-width: 767px)").matches;
        const perGalaxy = small ? 3500 : 8000;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 1);
        mount.appendChild(renderer.domElement);
        renderer.domElement.style.touchAction = "none";

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
        camera.position.set(0, small ? 12 : 8, small ? 14 : 10);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 2;
        controls.maxDistance = 60;
        controls.autoRotateSpeed = 0.35;

        const sprite = dotTexture();
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            size: small ? 0.085 : 0.07,
            map: sprite,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        });
        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        scene.add(points);

        const coreMat = new THREE.SpriteMaterial({ map: sprite, color: 0xfff1d6, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
        const cores = [new THREE.Sprite(coreMat), new THREE.Sprite(coreMat)];
        cores.forEach((c) => { c.scale.set(0.9, 0.9, 1); scene.add(c); });

        // Background stars
        const bg = new THREE.BufferGeometry();
        const bgPos = new Float32Array(1500 * 3);
        for (let i = 0; i < 1500; i++) {
            const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40);
            bgPos.set([v.x, v.y, v.z], i * 3);
        }
        bg.setAttribute("position", new THREE.BufferAttribute(bgPos, 3));
        scene.add(new THREE.Points(bg, new THREE.PointsMaterial({ size: 0.25, color: 0x8a8a9a, transparent: true, opacity: 0.6, depthWrite: false })));

        const build = (p) => {
            const c = new Collision(p, perGalaxy);
            sim.current = c;
            geometry.setAttribute("position", new THREE.BufferAttribute(c.pos, 3).setUsage(THREE.DynamicDrawUsage));
            // Colour: galaxy A cool white-blue, galaxy B warm; cores golden
            const colors = new Float32Array(c.n * 2 * 3);
            const a0 = new THREE.Color("#fde7b0"), a1 = new THREE.Color("#7cb8ff");
            const b0 = new THREE.Color("#ffd2a6"), b1 = new THREE.Color("#f08bd8");
            const tmp = new THREE.Color();
            for (let i = 0; i < c.n * 2; i++) {
                const t = Math.min(1, c.radius0[i] * 1.1);
                if (c.owner[i] === 0) tmp.copy(a0).lerp(a1, t); else tmp.copy(b0).lerp(b1, t);
                const k = 0.55 + 0.45 * (1 - t);
                colors.set([tmp.r * k, tmp.g * k, tmp.b * k], i * 3);
            }
            geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
            ctl.current.lastEvent = 0;
            ctl.current.seekTo = null;
            clearToasts();
            setStep(0);
            setStars(c.n * 2);
        };
        ctl.current.rebuild = build;
        build(params);

        const resize = () => {
            const w = mount.clientWidth, h = mount.clientHeight;
            renderer.setSize(w, h, false);
            renderer.domElement.style.width = "100%";
            renderer.domElement.style.height = "100%";
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(mount);

        let raf = 0, frame = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const c = sim.current;
            const k = ctl.current;
            if (k.seekTo != null) {
                if (k.seekTo < c.steps) c.reset();
                const chunk = Math.min(400, k.seekTo - c.steps);
                for (let i = 0; i < chunk; i++) c.step();
                if (c.steps >= k.seekTo) {
                    k.seekTo = null;
                    k.lastEvent = c.events.length; // don't replay old announcements
                }
                geometry.attributes.position.needsUpdate = true;
            } else if (k.playing && c.steps < MAX_STEPS) {
                for (let i = 0; i < k.speed; i++) c.step();
                geometry.attributes.position.needsUpdate = true;
                while (k.lastEvent < c.events.length) pushToast(c.events[k.lastEvent++].text);
                if (c.steps >= MAX_STEPS) setPlaying(false);
            }
            cores[0].position.set(c.core[0].x, c.core[0].y, c.core[0].z);
            cores[1].position.set(c.core[1].x, c.core[1].y, c.core[1].z);
            cores[1].visible = !c.merged;
            controls.autoRotate = k.autoRotate && k.seekTo == null;
            controls.update();
            renderer.render(scene, camera);
            if (++frame % 6 === 0) setStep(c.steps);
        };
        loop();

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            controls.dispose();
            geometry.dispose(); bg.dispose(); material.dispose(); coreMat.dispose(); sprite.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            k0.rebuild = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const update = (patch) => setParams((p) => ({ ...p, ...patch, preset: "custom" }));
    const choosePreset = (key) => {
        setParams({ ...PRESETS[key], preset: key });
        setPlaying(true);
        track("galaxy_preset", { preset: key });
    };
    const restart = () => { ctl.current.rebuild?.(params); setPlaying(true); };
    const seek = (v) => { ctl.current.seekTo = v; setStep(v); };

    const share = useCallback(async () => {
        const url = `${window.location.origin}${window.location.pathname}#${encodeParams(params)}`;
        try {
            if (navigator.share && window.matchMedia("(pointer: coarse)").matches) await navigator.share({ title: "My galaxy collision", url });
            else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
            track("galaxy_share", { preset: params.preset });
        } catch { /* dismissed */ }
    }, [params]);

    const presetOptions = Object.entries(PRESETS).map(([k, p]) => ({ value: k, label: p.short || p.name }));

    return (
        <SimShell
            slug="galaxy"
            subtitle={params.preset === "custom" ? "Custom collision" : PRESETS[params.preset]?.name}
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => (step >= MAX_STEPS ? restart() : setPlaying((p) => !p))}
                        aria-label={playing ? "Pause" : "Play"}
                        className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[#0a0a0c]">
                        {playing ? Icons.pause : Icons.play}
                    </button>
                    <div className="min-w-0 flex-1">
                        <Slider label="Time" value={step} min={0} max={MAX_STEPS} step={50} onChange={seek} format={fmtTime} />
                    </div>
                </div>
            }
            panel={
                <>
                    <Group label="Presets">
                        <Segmented label="Preset" value={params.preset} onChange={choosePreset} options={presetOptions} columns={2} />
                    </Group>
                    <Group label="Your collision">
                        <Slider label="Mass ratio" value={params.q} min={0.2} max={1} step={0.05} onChange={(q) => update({ q })} format={(v) => `1 : ${v.toFixed(2)}`} />
                        <Slider label="Closest approach" value={params.rp} min={0.6} max={3} step={0.1} onChange={(rp) => update({ rp })} format={(v) => `${Math.round(v * 15)} kpc`} />
                        <Slider label="Tilt · galaxy A" value={params.ia} min={0} max={90} step={5} onChange={(ia) => update({ ia })} format={(v) => `${v}°`} />
                        <Slider label="Tilt · galaxy B" value={params.ib} min={0} max={90} step={5} onChange={(ib) => update({ ib })} format={(v) => `${v}°`} />
                        <Switch label="Galaxy A spins backwards" description="Retrograde disks form weaker tails" checked={params.sa === -1} onChange={(on) => update({ sa: on ? -1 : 1 })} />
                        <Switch label="Galaxy B spins backwards" checked={params.sb === -1} onChange={(on) => update({ sb: on ? -1 : 1 })} />
                    </Group>
                    <Group label="Playback">
                        <Slider label="Speed" value={speed} min={1} max={14} step={1} onChange={setSpeed} format={(v) => `${v}×`} />
                        <Switch label="Auto-rotate camera" checked={autoRotate} onChange={setAutoRotate} />
                        <Hint>{stars.toLocaleString()} stars. Drag to orbit, scroll or pinch to zoom.</Hint>
                    </Group>
                    <div className="grid grid-cols-2 gap-2">
                        <ActionButton icon={Icons.reset} onClick={restart}>Restart</ActionButton>
                        <ActionButton tone="accent" onClick={share}>{copied ? "Link copied" : "Share"}</ActionButton>
                    </div>
                </>
            }
        >
            <div ref={mountRef} className="absolute inset-0" />
            {!webgl && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-ink-2">
                    This simulation needs WebGL, which isn&rsquo;t available in this browser.
                </div>
            )}
            <StoryToasts items={toastItems} />
            {showScience && (
                <ScienceModal
                    title="Galaxy Collider — How Galaxies Merge"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "The Toomre experiment",
                            text: "In 1972 Alar and Juri Toomre showed that the strange tails and bridges of interacting galaxies are simply gravity at work. They modelled each galaxy as a heavy core with a disk of massless test stars, let two of them pass close by, and reproduced shapes like the Antennae and the Mice. This simulation uses the same idea, in real time.",
                        },
                        {
                            heading: "Equations of motion",
                            text: "The two cores attract each other. Every star feels both cores but no other star — which is why thousands of stars can be simulated live. A small softening length keeps forces finite at close range.",
                            equations: [
                                { label: "Star", value: "a = Σ G·Mᵢ·(Rᵢ − r) / (|Rᵢ − r|² + ε²)^{3/2}" },
                                { label: "Cores", value: "a_A = G·M_B·(R_B − R_A) / (|R_B − R_A|² + ε²)^{3/2}" },
                                { label: "Disk", value: "v_circ = √(G·M·r² / (r² + ε²)^{3/2})" },
                            ],
                        },
                        {
                            heading: "Why the cores merge",
                            text: "Real galaxies sit inside massive dark-matter halos. As one plows through the other, it drags a wake of matter behind it that pulls it back — dynamical friction. Here it is approximated by a drag on the cores' relative velocity that only acts when they are close, so they slow down on each pass and finally merge.",
                        },
                        {
                            heading: "Prograde vs retrograde",
                            text: "A disk spinning the same way as the encounter (prograde) stays in step with the passing galaxy's pull for longer, so its outer stars are flung into long tails. A retrograde disk sees the pull sweep past too quickly and keeps most of its stars. Flip a galaxy's spin to see the difference.",
                        },
                        {
                            heading: "Time scale",
                            text: "With a disk radius of 15 kpc and a mass of 10¹¹ suns, one simulation time unit is about 87 million years, so a full collision plays out over a few billion years.",
                        },
                    ]}
                />
            )}
        </SimShell>
    );
}
