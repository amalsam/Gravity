"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import StoryToasts from "@/components/StoryToasts";
import LineChart from "@/components/LineChart";
import { ActionButton, Group, Hint, Icons, Segmented, Slider, Stats, Switch } from "@/components/controls";
import { useToasts } from "@/shared/useToasts";
import { track } from "@/shared/track";
import { World, GENES, radiusOf } from "@/core/evolution";

const PRED_COLOR = "#f87171";
const MIN_AREA = 640000; // small screens simulate a larger world, drawn scaled down

const POP_SERIES = [
    { key: "prey", label: "Prey", color: "#2dd4bf", format: (v) => v },
    { key: "pred", label: "Predators", color: PRED_COLOR, format: (v) => v },
    { key: "food", label: "Food", color: "rgba(163,230,53,0.55)", width: 1.25 },
];
const TRAIT_SERIES = [
    { key: "speed", label: "Speed", color: "#fbbf24", max: GENES.speed.max, format: (v) => v.toFixed(2) },
    { key: "size", label: "Size", color: "#c084fc", max: GENES.size.max, format: (v) => v.toFixed(2) },
    { key: "sense", label: "Sense", color: "#60a5fa", max: GENES.sense.max, format: (v) => Math.round(v) },
];

const TOAST_COLORS = { predators: PRED_COLOR, extinct: PRED_COLOR, famine: "#fbbf24", trait: "#2dd4bf", record: "#fbbf24" };

// Map a gene to a hue: low = blue, high = magenta (keeps clear of green food and red predators)
const hueFor = (c, key) => {
    const g = GENES[key];
    const t = Math.min(1, Math.max(0, (c.g[key] - g.min) / (g.max - g.min)));
    return 195 + t * 135;
};
const SPEEDS = [1, 3, 12];

export default function EvolutionPage() {
    const canvasRef = useRef(null);
    const worldRef = useRef(null);
    const viewRef = useRef({ k: 1 });
    const [speed, setSpeed] = useState(3);
    const [colorBy, setColorBy] = useState("speed");
    const [food, setFood] = useState(1);
    const [mutation, setMutation] = useState(0.08);
    const [autoPred, setAutoPred] = useState(true);
    const [snapshot, setSnapshot] = useState({ prey: 0, pred: 0, gen: 0, history: [] });
    const [selected, setSelected] = useState(null);
    const [showScience, setShowScience] = useState(false);
    const [runId, setRunId] = useState(0);
    const { items: toastItems, push: pushToast, clear: clearToasts } = useToasts({ max: 3, ttl: 6000 });

    const ui = useRef({ speed: 3, colorBy: "speed", selectedId: null, lastEvent: 0 });
    useEffect(() => { ui.current.speed = speed; }, [speed]);
    useEffect(() => { ui.current.colorBy = colorBy; }, [colorBy]);
    useEffect(() => { if (worldRef.current) worldRef.current.opts.food = food; }, [food]);
    useEffect(() => { if (worldRef.current) worldRef.current.opts.mutation = mutation; }, [mutation]);
    useEffect(() => { if (worldRef.current) worldRef.current.opts.autoPredators = autoPred; }, [autoPred]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let raf = 0, dpr = 1, frame = 0;

        const dims = () => {
            const r = canvas.getBoundingClientRect();
            const usableH = r.width < 768 ? r.height - 140 : r.height; // keep clear of the phone sheet
            const k = Math.max(1, Math.sqrt(MIN_AREA / (r.width * usableH)));
            return { cssW: r.width, cssH: r.height, k, w: Math.round(r.width * k), h: Math.round(usableH * k) };
        };

        const resize = () => {
            const d = dims();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(d.cssW * dpr);
            canvas.height = Math.round(d.cssH * dpr);
            viewRef.current = d;
            if (!worldRef.current) {
                worldRef.current = new World(d.w, d.h, { food, mutation, autoPredators: autoPred });
            } else {
                worldRef.current.resize(d.w, d.h);
            }
        };
        worldRef.current = null;
        ui.current.lastEvent = 0;
        ui.current.selectedId = null;
        setSelected(null);
        clearToasts();
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        const draw = () => {
            const W = worldRef.current;
            const { k } = viewRef.current;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = "#06090a";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const s = dpr / k;
            ctx.setTransform(s, 0, 0, s, 0, 0);

            ctx.fillStyle = "rgba(163,230,53,0.75)";
            for (const f of W.food) ctx.fillRect(f.x - 1.6, f.y - 1.6, 3.2, 3.2);

            const key = ui.current.colorBy;
            for (const c of W.prey) {
                ctx.fillStyle = `hsl(${hueFor(c, key)} 80% 62%)`;
                ctx.beginPath();
                ctx.arc(c.x, c.y, radiusOf(c), 0, Math.PI * 2);
                ctx.fill();
            }
            for (const p of W.pred) {
                const r = radiusOf(p) + 2;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.a);
                ctx.fillStyle = p.digest > 0 ? "rgba(248,113,113,0.55)" : PRED_COLOR;
                ctx.beginPath();
                ctx.moveTo(r * 1.4, 0); ctx.lineTo(-r, r * 0.9); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r, -r * 0.9);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            // Followed creature
            const id = ui.current.selectedId;
            if (id) {
                const c = W.prey.find((x) => x.id === id) || W.pred.find((x) => x.id === id);
                if (c) {
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 2 * k;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, radiusOf(c) + 7 * k, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.strokeStyle = "rgba(255,255,255,0.18)";
                    ctx.lineWidth = 1 * k;
                    ctx.beginPath();
                    ctx.arc(c.x, c.y, c.g.sense, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        };

        const loop = () => {
            raf = requestAnimationFrame(loop);
            const W = worldRef.current;
            for (let i = 0; i < ui.current.speed; i++) W.step();
            draw();
            for (const e of W.events) {
                if (e.seq <= ui.current.lastEvent) continue;
                ui.current.lastEvent = e.seq;
                pushToast(e.text, TOAST_COLORS[e.type]);
            }
            if (++frame % 15 === 0) {
                const id = ui.current.selectedId;
                const c = id ? W.prey.find((x) => x.id === id) || W.pred.find((x) => x.id === id) : null;
                setSelected((prev) => {
                    if (!id) return null;
                    if (c) return { ...c, g: { ...c.g }, alive: true };
                    return prev ? { ...prev, alive: false } : null;
                });
                setSnapshot({ prey: W.prey.length, pred: W.pred.length, gen: W.maxGen, history: W.history.slice() });
            }
        };
        loop();

        const onDown = (e) => {
            const r = canvas.getBoundingClientRect();
            const { k } = viewRef.current;
            const c = worldRef.current.findAt((e.clientX - r.left) * k, (e.clientY - r.top) * k, 22 * k);
            ui.current.selectedId = c ? c.id : null;
            if (c) track("evolution_follow", { kind: c.kind });
        };
        canvas.addEventListener("pointerdown", onDown);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener("pointerdown", onDown);
        };
        // A new run (Restart) rebuilds the world; settings are applied live via opts
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runId]);

    const restart = () => { setRunId((n) => n + 1); track("evolution_restart", {}); };
    const famine = () => { worldRef.current?.famine(20); track("evolution_famine", {}); };
    const releasePredators = () => { worldRef.current?.addPredators(6); track("evolution_predators", {}); };
    const followChild = useCallback(() => {
        const W = worldRef.current;
        if (!W || !selected) return;
        const kid = [...W.prey, ...W.pred].find((c) => c.parentId === selected.id);
        ui.current.selectedId = kid ? kid.id : null;
    }, [selected]);

    return (
        <SimShell
            slug="evolution"
            subtitle="Natural selection · predator–prey"
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center justify-between gap-3">
                    <Stats items={[
                        { label: "Generation", value: snapshot.gen },
                        { label: "Prey", value: snapshot.prey, tone: "accent" },
                        { label: "Predators", value: snapshot.pred, tone: snapshot.pred ? "bad" : undefined },
                    ]} />
                    <button type="button" onClick={() => setSpeed((v) => SPEEDS[(SPEEDS.indexOf(v) + 1) % SPEEDS.length])}
                        aria-label={`Simulation speed ${speed}×, tap to change`}
                        className="pressable inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-fill px-3.5 font-mono text-[13px] font-medium text-ink">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M2 3.5v9l6-4.5zM8 3.5v9l6-4.5z" /></svg>
                        {speed}×
                    </button>
                </div>
            }
            panel={
                <>
                    <Group label="Population">
                        <LineChart data={snapshot.history} series={POP_SERIES} shared label="Population of prey, predators and food over time" />
                    </Group>
                    <Group label="Average prey genes">
                        <LineChart data={snapshot.history} series={TRAIT_SERIES} label="Average prey speed, size and sense over time" />
                    </Group>
                    <Group label="Intervene">
                        <div className="grid grid-cols-2 gap-2">
                            <ActionButton onClick={releasePredators}>Add predators</ActionButton>
                            <ActionButton onClick={famine}>Famine</ActionButton>
                        </div>
                        <Slider label="Food abundance" value={food} min={0.4} max={2} step={0.1} onChange={setFood} format={(v) => `${v.toFixed(1)}×`} />
                        <Slider label="Mutation rate" value={mutation} min={0.02} max={0.3} step={0.01} onChange={setMutation} format={(v) => `${Math.round(v * 100)}%`} />
                        <Switch label="Predators migrate in" description="New packs arrive when predators die out" checked={autoPred} onChange={setAutoPred} />
                    </Group>
                    <Group label="Colour prey by">
                        <Segmented label="Colour prey by" value={colorBy} onChange={setColorBy} options={[
                            { value: "speed", label: "Speed" }, { value: "size", label: "Size" }, { value: "sense", label: "Sense" },
                        ]} />
                        <Hint>Blue is low, magenta is high. Predators are red arrows; green dots are food. Tap a creature to follow it.</Hint>
                    </Group>
                    <ActionButton icon={Icons.reset} onClick={restart}>Restart evolution</ActionButton>
                </>
            }
        >
            <canvas ref={canvasRef} className="block h-full w-full touch-none" role="img"
                aria-label="Evolution simulation. Coloured circles are prey, red arrows are predators, green dots are food." />
            <StoryToasts items={toastItems} />

            {selected && (
                <div className="material absolute bottom-[156px] left-3 z-30 w-[min(300px,calc(100%-24px))] rounded-2xl p-4 md:bottom-4 md:left-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[15px] font-semibold text-ink">
                                {selected.kind === "pred" ? "Predator" : "Prey"} #{selected.id}
                            </p>
                            <p className="text-[12px] text-ink-3">
                                {selected.alive ? `Generation ${selected.gen} · age ${Math.round(selected.age / 60)}s` : "This creature has died."}
                            </p>
                        </div>
                        <button type="button" onClick={() => { ui.current.selectedId = null; setSelected(null); }}
                            className="pressable nav-link flex h-8 w-8 items-center justify-center rounded-full text-ink-3" aria-label="Stop following">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                        </button>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                        {Object.keys(GENES).map((k) => (
                            <div key={k} className="rounded-lg bg-fill py-1.5">
                                <dt className="text-[11px] text-ink-3">{GENES[k].label}</dt>
                                <dd className="font-mono text-[14px] tabular text-ink">{k === "sense" ? Math.round(selected.g[k]) : selected.g[k].toFixed(2)}</dd>
                            </div>
                        ))}
                    </dl>
                    {selected.alive ? (
                        <div className="mt-3">
                            <div className="flex justify-between text-[12px] text-ink-3"><span>Energy</span><span>{selected.children} offspring</span></div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, selected.energy / (selected.kind === "pred" ? 2.2 : 1.2))}%` }} />
                            </div>
                        </div>
                    ) : (
                        selected.children > 0 && (
                            <button type="button" onClick={followChild} className="pressable btn btn-secondary mt-3 w-full">Follow a descendant</button>
                        )
                    )}
                </div>
            )}

            {showScience && (
                <ScienceModal
                    title="Evolution Lab — Natural Selection"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "Genes, costs and trade-offs",
                            text: "Every creature carries three genes. None is free: moving fast and being big burn energy every tick, and a long sensing range drains a little more. Natural selection is the result of these trade-offs meeting the environment — food supply, predators and competition.",
                            equations: [
                                { label: "Energy cost", value: "c = base + k·speed²·(0.6 + 0.6·size²) + 0.0006·sense" },
                                { label: "Food gain", value: "e = 26·(0.7 + 0.3·size)" },
                                { label: "Can be eaten", value: "if size_prey < size_predator" },
                            ],
                        },
                        {
                            heading: "Heredity and mutation",
                            text: "When a creature stores enough energy it splits in two. The child inherits each gene multiplied by a small random factor drawn from a log-normal distribution, so mutations are proportional and genes stay positive.",
                            code: `child.gene = parent.gene × exp(N(0, σ))   // σ = mutation rate`,
                        },
                        {
                            heading: "Predator–prey cycles",
                            text: "Predators that eat enough reproduce; then there are too many of them, prey collapse, and predators starve. These oscillations are the ones predicted by the Lotka–Volterra equations — here they emerge from individual creatures rather than being written in. A fed predator spends time digesting, and the last few prey can always find refuge, which keeps the system from collapsing entirely.",
                            equations: [
                                { label: "Prey", value: "dx/dt = αx − βxy" },
                                { label: "Predators", value: "dy/dt = δxy − γy" },
                            ],
                        },
                        {
                            heading: "Arms races",
                            text: "When predators appear, faster or larger prey survive more often, so the averages shift. Predators respond in turn. Depending on which mutations show up first, prey may become small and fast or large and slow — both are real evolutionary strategies.",
                        },
                    ]}
                />
            )}
        </SimShell>
    );
}
