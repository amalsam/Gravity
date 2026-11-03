"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ScienceModal from "@/components/ScienceModal";
import SimShell from "@/components/SimShell";
import StoryToasts from "@/components/StoryToasts";
import { ActionButton, Group, Hint, Icons, Stats, Switch } from "@/components/controls";
import { useToasts } from "@/shared/useToasts";
import { track } from "@/shared/track";
import {
    LEVELS, WORLD, MAX_PULL, DT, posAt, stepProbe, launchVelocity, newProbe, dailyLevel, todayKey, starsFor,
} from "@/core/slingshot";

const ACCENT = "#a3e635";
const STORAGE_KEY = "stacklor:slingshot:v1";
const PREVIEW_SECONDS = (i) => (i === "daily" ? 0.8 : i < 5 ? 2.2 : i < 10 ? 1.3 : 0.85);

const loadProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};
const saveProgress = (p) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* private mode */ }
};

const starText = (n) => "★".repeat(n) + "☆".repeat(3 - n);

// Deterministic jagged outline per asteroid, so rocks look like rocks
function rockShape(r, seed) {
    const pts = [];
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const rr = r * (0.78 + rnd() * 0.3);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    return pts;
}

export default function SlingshotPage() {
    const canvasRef = useRef(null);
    const [levelIdx, setLevelIdx] = useState(0);
    const [launches, setLaunches] = useState(0);
    const [status, setStatus] = useState("aim"); // aim | flying | won
    const [progress, setProgress] = useState({});
    const [preview, setPreview] = useState(true);
    const [daily, setDaily] = useState(null);
    const [preparingDaily, setPreparingDaily] = useState(false);
    const [result, setResult] = useState(null); // { stars, launches }
    const [showScience, setShowScience] = useState(false);
    const [copied, setCopied] = useState(false);
    const { items: toastItems, push: pushToast, clear: clearToasts } = useToasts({ max: 2, ttl: 3200 });

    // Mutable game state for the render loop
    const g = useRef({
        level: LEVELS[0], levelIdx: 0, probe: null, trail: [], ghost: [], aim: null, worldT: 0,
        status: "aim", launches: 0, preview: true, burst: [], view: { s: 1, ox: 0, oy: 0 }, stars: null, hintAlpha: 1,
    });

    // Saved progress lives in localStorage, which only exists after hydration
    useEffect(() => {
        const id = requestAnimationFrame(() => setProgress(loadProgress()));
        return () => cancelAnimationFrame(id);
    }, []);

    const level = levelIdx === "daily" ? daily : LEVELS[levelIdx];

    const startLevel = useCallback((idx, lvl) => {
        const s = g.current;
        s.level = lvl;
        s.levelIdx = idx;
        s.probe = null;
        s.trail = [];
        s.ghost = [];
        s.aim = null;
        s.worldT = 0;
        s.status = "aim";
        s.launches = 0;
        s.burst = [];
        s.hintAlpha = 1;
        setLevelIdx(idx);
        setLaunches(0);
        setStatus("aim");
        setResult(null);
        clearToasts();
        track("slingshot_level_start", { level: idx === "daily" ? "daily" : idx + 1 });
    }, [clearToasts]);

    const chooseLevel = useCallback((idx) => {
        if (idx !== "daily") return startLevel(idx, LEVELS[idx]);
        if (daily) return startLevel("daily", daily);
        setPreparingDaily(true);
        // Generating + proving today's puzzle takes ~1s; let the UI paint first
        setTimeout(() => {
            const d = dailyLevel(todayKey());
            setDaily(d);
            setPreparingDaily(false);
            startLevel("daily", d);
        }, 30);
    }, [daily, startLevel]);

    const retry = useCallback(() => {
        const s = g.current;
        startLevel(s.levelIdx, s.level);
    }, [startLevel]);

    const nextLevel = useCallback(() => {
        const s = g.current;
        if (s.levelIdx === "daily") return;
        const n = Math.min(LEVELS.length - 1, s.levelIdx + 1);
        startLevel(n, LEVELS[n]);
    }, [startLevel]);

    const unlocked = (i) => i === 0 || (progress[i - 1] || 0) > 0;

    useEffect(() => { g.current.preview = preview; }, [preview]);

    // Keyboard: R = retry, N / Enter = next level after a win
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.closest?.("input, textarea, [role=dialog]")) return;
            if (e.key === "r" || e.key === "R") retry();
            if ((e.key === "n" || e.key === "N" || e.key === "Enter") && g.current.status === "won") nextLevel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [retry, nextLevel]);

    // ── Render + physics loop ────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const s = g.current;
        let raf = 0, dpr = 1, W = 0, H = 0, last = performance.now();
        let starfield = null;
        const rocks = new Map();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const fontFamily = getComputedStyle(document.body).fontFamily; // canvas can't read CSS variables

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = rect.width; H = rect.height;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            // Fit the 1000×1000 world into the space the controls don't cover
            const desktop = W >= 768;
            const availW = desktop && W >= 1024 ? W - 340 : W;
            const availH = desktop ? H : H - 150;
            const pad = desktop ? 32 : 12;
            const sc = Math.min((availW - pad * 2) / WORLD, (availH - pad * 2) / WORLD);
            s.view = { s: sc, ox: (availW - WORLD * sc) / 2, oy: Math.max(pad, (availH - WORLD * sc) / 2) };
            // Static starfield
            starfield = document.createElement("canvas");
            starfield.width = canvas.width; starfield.height = canvas.height;
            const sctx = starfield.getContext("2d");
            sctx.fillStyle = "#05050a";
            sctx.fillRect(0, 0, starfield.width, starfield.height);
            for (let i = 0; i < (W * H) / 1800; i++) {
                sctx.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`;
                const r = Math.random() < 0.08 ? 1.4 : 0.8;
                sctx.fillRect(Math.random() * starfield.width, Math.random() * starfield.height, r * dpr, r * dpr);
            }
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        const toWorld = (e) => {
            const r = canvas.getBoundingClientRect();
            return [(e.clientX - r.left - s.view.ox) / s.view.s, (e.clientY - r.top - s.view.oy) / s.view.s];
        };

        const onDown = (e) => {
            if (s.status !== "aim") return;
            canvas.setPointerCapture(e.pointerId);
            const p = toWorld(e);
            s.aim = { x0: p[0], y0: p[1], x: p[0], y: p[1], id: e.pointerId };
        };
        const onMove = (e) => {
            if (!s.aim || s.aim.id !== e.pointerId) return;
            const p = toWorld(e);
            s.aim.x = p[0]; s.aim.y = p[1];
        };
        const onUp = (e) => {
            if (!s.aim || s.aim.id !== e.pointerId) return;
            const pullX = s.aim.x0 - s.aim.x, pullY = s.aim.y0 - s.aim.y;
            s.aim = null;
            if (Math.hypot(pullX, pullY) < 10) return; // a tap, not a launch
            const [vx, vy] = launchVelocity(pullX, pullY);
            s.probe = newProbe(s.level, vx, vy, s.worldT);
            s.trail = [[s.probe.x, s.probe.y]];
            s.status = "flying";
            s.launches += 1;
            s.hintAlpha = 0;
            setStatus("flying");
            setLaunches(s.launches);
        };
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", () => (s.aim = null));

        const finish = (res) => {
            const lvl = s.level;
            if (res === "hit") {
                const stars = starsFor(s.launches);
                s.status = "won";
                s.burst = Array.from({ length: reduce ? 0 : 60 }, () => {
                    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 260;
                    return { x: s.probe.x, y: s.probe.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 };
                });
                setStatus("won");
                setResult({ stars, launches: s.launches });
                if (s.levelIdx !== "daily") {
                    setProgress((p) => {
                        const next = { ...p, [s.levelIdx]: Math.max(p[s.levelIdx] || 0, stars) };
                        saveProgress(next);
                        return next;
                    });
                } else {
                    setProgress((p) => {
                        const key = `daily:${todayKey()}`;
                        const next = { ...p, [key]: Math.max(p[key] || 0, stars) };
                        saveProgress(next);
                        return next;
                    });
                }
                track("slingshot_level_complete", { level: s.levelIdx === "daily" ? "daily" : s.levelIdx + 1, launches: s.launches, stars });
                return;
            }
            // Missed: keep the path as a ghost to learn from, reset the probe
            const close = s.probe.minDist < lvl.target.r * 2.6;
            const msg = close
                ? "So close! A tiny adjustment should do it."
                : res === "swallowed" ? "Swallowed by the black hole."
                : res === "crash" ? "Crashed. Try a wider arc."
                : "Lost in deep space.";
            pushToast(msg, close ? ACCENT : "#f87171");
            s.ghost = s.trail;
            s.trail = [];
            s.probe = null;
            s.status = "aim";
            setStatus("aim");
        };

        // ── drawing helpers ───────────────────────────────────────────────
        const drawBody = (b, x, y) => {
            if (b.kind === "blackhole") {
                const glow = ctx.createRadialGradient(x, y, b.r, x, y, b.r * 5);
                glow.addColorStop(0, "rgba(192,132,252,0.35)");
                glow.addColorStop(1, "rgba(192,132,252,0)");
                ctx.fillStyle = glow;
                ctx.beginPath(); ctx.arc(x, y, b.r * 5, 0, Math.PI * 2); ctx.fill();
                ctx.save();
                ctx.translate(x, y); ctx.rotate(-0.4);
                ctx.strokeStyle = "rgba(251,146,60,0.9)"; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(0, 0, b.r * 2.3, b.r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
                ctx.fillStyle = "#000";
                ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
                ctx.stroke();
                return;
            }
            // Gravity "well" rings: hint at the reach of each body
            ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
            for (let k = 1; k <= 3; k++) {
                ctx.beginPath(); ctx.arc(x, y, b.r + Math.sqrt(b.gm) * 0.035 * k, 0, Math.PI * 2); ctx.stroke();
            }
            if (b.kind === "star") {
                const glow = ctx.createRadialGradient(x, y, b.r * 0.5, x, y, b.r * 2.6);
                glow.addColorStop(0, "rgba(251,191,36,0.45)");
                glow.addColorStop(1, "rgba(251,191,36,0)");
                ctx.fillStyle = glow;
                ctx.beginPath(); ctx.arc(x, y, b.r * 2.6, 0, Math.PI * 2); ctx.fill();
            }
            const grad = ctx.createRadialGradient(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.1, x, y, b.r);
            grad.addColorStop(0, b.kind === "star" ? "#fffbe6" : "#ffffff");
            grad.addColorStop(0.25, b.color);
            grad.addColorStop(1, "#0b0b10");
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
        };

        const drawPath = (pts, color, width, dashed) => {
            if (pts.length < 2) return;
            ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round";
            ctx.setLineDash(dashed ? [6, 8] : []);
            ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.stroke();
            ctx.setLineDash([]);
        };

        const frame = (now) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const lvl = s.level;
            if (!lvl) { raf = requestAnimationFrame(frame); return; }

            // Physics
            if (s.status === "flying" && s.probe) {
                const steps = Math.max(1, Math.round(dt / DT));
                for (let i = 0; i < steps; i++) {
                    const res = stepProbe(lvl, s.probe);
                    if (i % 2 === 0) s.trail.push([s.probe.x, s.probe.y]);
                    if (res) { finish(res); break; }
                }
                s.worldT = s.probe ? s.probe.t : s.worldT;
            } else {
                s.worldT += dt;
            }
            for (const p of s.burst) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt * 0.9; }
            s.burst = s.burst.filter((p) => p.life > 0);

            // Draw
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(starfield, 0, 0);
            const { s: sc, ox, oy } = s.view;
            ctx.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * ox, dpr * oy);

            // Play-area frame
            ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1 / sc;
            ctx.strokeRect(0, 0, WORLD, WORLD);

            const t = s.worldT;
            // Orbit guides
            for (const b of [...lvl.bodies, lvl.target]) {
                if (!b.orbit) continue;
                ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.setLineDash([4, 10]); ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.arc(b.orbit.cx, b.orbit.cy, b.orbit.R, 0, Math.PI * 2); ctx.stroke();
                ctx.setLineDash([]);
            }
            // Asteroids
            lvl.asteroids.forEach((a, i) => {
                let shape = rocks.get(a);
                if (!shape) { shape = rockShape(a.r, i + 1 + Math.round(a.x)); rocks.set(a, shape); }
                ctx.fillStyle = "#3f3f46"; ctx.strokeStyle = "#71717a"; ctx.lineWidth = 1.5;
                ctx.beginPath();
                shape.forEach(([px, py], k) => (k ? ctx.lineTo(a.x + px, a.y + py) : ctx.moveTo(a.x + px, a.y + py)));
                ctx.closePath(); ctx.fill(); ctx.stroke();
            });
            // Target
            const [tx, ty] = posAt(lvl.target, t);
            const pulse = reduce ? 0 : (Math.sin(now / 320) + 1) * 0.5;
            ctx.strokeStyle = ACCENT; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(tx, ty, lvl.target.r, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 0.25 + pulse * 0.25;
            ctx.beginPath(); ctx.arc(tx, ty, lvl.target.r + 8 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "rgba(163,230,53,0.12)";
            ctx.beginPath(); ctx.arc(tx, ty, lvl.target.r, 0, Math.PI * 2); ctx.fill();

            // Bodies
            for (const b of lvl.bodies) { const [bx, by] = posAt(b, t); drawBody(b, bx, by); }

            // Ghost of the last attempt + live trail
            drawPath(s.ghost, "rgba(255,255,255,0.22)", 2, true);
            drawPath(s.trail, "rgba(255,255,255,0.85)", 2.5, false);

            // Aim + trajectory preview
            const st = lvl.start;
            if (s.status === "aim") {
                if (s.aim) {
                    const pullX = s.aim.x0 - s.aim.x, pullY = s.aim.y0 - s.aim.y;
                    const len = Math.min(MAX_PULL, Math.hypot(pullX, pullY));
                    const ang = Math.atan2(pullY, pullX);
                    if (len > 6) {
                        const [vx, vy] = launchVelocity(pullX, pullY);
                        if (s.preview) {
                            const p = newProbe(lvl, vx, vy, t);
                            const pts = [[p.x, p.y]];
                            const n = Math.round(PREVIEW_SECONDS(s.levelIdx) / DT);
                            for (let i = 0; i < n; i++) {
                                if (stepProbe(lvl, p)) break;
                                if (i % 6 === 0) pts.push([p.x, p.y]);
                            }
                            pts.forEach(([px, py], i) => {
                                ctx.fillStyle = `rgba(163,230,53,${0.9 * (1 - i / pts.length)})`;
                                ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
                            });
                        }
                        // Power arrow
                        const ex = st.x + Math.cos(ang) * (30 + len * 0.6), ey = st.y + Math.sin(ang) * (30 + len * 0.6);
                        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
                        ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(ex, ey); ctx.stroke();
                        ctx.fillStyle = "#fff";
                        ctx.beginPath();
                        ctx.moveTo(ex + Math.cos(ang) * 12, ey + Math.sin(ang) * 12);
                        ctx.lineTo(ex + Math.cos(ang + 2.5) * 10, ey + Math.sin(ang + 2.5) * 10);
                        ctx.lineTo(ex + Math.cos(ang - 2.5) * 10, ey + Math.sin(ang - 2.5) * 10);
                        ctx.fill();
                        ctx.font = `600 22px ${fontFamily}`;
                        ctx.fillStyle = "rgba(255,255,255,0.85)";
                        ctx.fillText(`${Math.round((len / MAX_PULL) * 100)}%`, st.x - 24, st.y + 52);
                    }
                }
                // Probe waiting on the pad
                ctx.strokeStyle = "rgba(163,230,53,0.5)"; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(st.x, st.y, 18 + (reduce ? 0 : pulse * 4), 0, Math.PI * 2); ctx.stroke();
                ctx.fillStyle = "#fff";
                ctx.beginPath(); ctx.arc(st.x, st.y, 7, 0, Math.PI * 2); ctx.fill();
            } else if (s.probe) {
                const a = Math.atan2(s.probe.vy, s.probe.vx);
                ctx.save(); ctx.translate(s.probe.x, s.probe.y); ctx.rotate(a);
                ctx.fillStyle = "#fff";
                ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, 6); ctx.lineTo(-4, 0); ctx.lineTo(-7, -6); ctx.closePath(); ctx.fill();
                ctx.restore();
            }

            // Celebration burst
            for (const p of s.burst) {
                ctx.fillStyle = `rgba(163,230,53,${p.life})`;
                ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            }

            // Level hint (fades after the first launch)
            if (s.hintAlpha > 0.01) {
                ctx.font = `500 26px ${fontFamily}`;
                ctx.textAlign = "center";
                ctx.fillStyle = `rgba(255,255,255,${0.7 * s.hintAlpha})`;
                ctx.fillText(lvl.hint, WORLD / 2, 44);
                ctx.textAlign = "start";
            }

            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
        };
    }, [pushToast]);

    const shareDaily = async () => {
        const text = `Gravity Slingshot daily ${todayKey()}: ${starText(result.stars)} in ${result.launches} launch${result.launches > 1 ? "es" : ""}\nhttps://labs.stacklor.com/slingshot/`;
        try {
            if (navigator.share) await navigator.share({ text });
            else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }
            track("slingshot_share", {});
        } catch { /* dismissed */ }
    };

    const isDaily = levelIdx === "daily";
    const best = isDaily ? progress[`daily:${todayKey()}`] || 0 : progress[levelIdx] || 0;
    const totalStars = LEVELS.reduce((n, _, i) => n + (progress[i] || 0), 0);

    return (
        <SimShell
            slug="slingshot"
            subtitle={level ? `${isDaily ? "Daily" : `Level ${levelIdx + 1}`} · ${isDaily ? todayKey() : level.name}` : "Gravity assist puzzles"}
            onScience={() => setShowScience(true)}
            peek={
                <div className="flex items-center justify-between gap-3">
                    <Stats items={[
                        { label: "Level", value: isDaily ? "Daily" : `${levelIdx + 1}/${LEVELS.length}` },
                        { label: "Launches", value: launches },
                        { label: "Best", value: starText(best), tone: best ? "accent" : undefined },
                    ]} />
                    <button type="button" onClick={retry}
                        className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-fill px-3.5 text-[13px] font-medium text-ink-2">
                        {Icons.reset} Retry
                    </button>
                </div>
            }
            panel={
                <>
                    <Group label={`Levels · ${totalStars}/${LEVELS.length * 3} stars`}>
                        <div className="grid grid-cols-5 gap-1.5" role="list">
                            {LEVELS.map((l, i) => {
                                const open = unlocked(i);
                                const current = i === levelIdx;
                                return (
                                    <button key={i} type="button" role="listitem" disabled={!open}
                                        onClick={() => chooseLevel(i)}
                                        aria-label={`Level ${i + 1}: ${l.name}${open ? `, ${progress[i] || 0} stars` : ", locked"}`}
                                        aria-current={current ? "true" : undefined}
                                        className={`pressable flex min-h-12 flex-col items-center justify-center rounded-xl border text-[14px] font-medium disabled:opacity-35 ${
                                            current
                                                ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-ink"
                                                : "border-line bg-fill text-ink-2"
                                        }`}>
                                        <span className="tabular">{open ? i + 1 : (
                                            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                                                <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                                            </svg>
                                        )}</span>
                                        <span className="text-[9px] leading-none tracking-[1px] text-[var(--accent)]" aria-hidden="true">
                                            {open && progress[i] ? "★".repeat(progress[i]) : " "}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <ActionButton tone="accent" onClick={() => chooseLevel("daily")} disabled={preparingDaily}>
                            {preparingDaily ? "Preparing today's puzzle…" : `Daily puzzle · ${todayKey()}`}
                        </ActionButton>
                    </Group>
                    <Group label="This level">
                        <Hint>{level?.hint}</Hint>
                        <Switch label="Trajectory preview" description="Shows the first moments of your path while aiming" checked={preview} onChange={setPreview} />
                    </Group>
                    <Hint>Keyboard: R to retry, N for the next level.</Hint>
                </>
            }
        >
            <canvas ref={canvasRef} className="block h-full w-full touch-none" style={{ cursor: status === "aim" ? "crosshair" : "default" }}
                aria-label="Gravity Slingshot game area. Drag backwards and release to launch the probe." role="img" />

            <StoryToasts items={toastItems} />

            {status === "won" && result && (
                <div className="absolute inset-0 z-30 flex items-start justify-center px-4 pt-[18%] md:items-center md:pt-0 lg:pr-[340px]">
                    <div className="dialog-in material w-full max-w-sm rounded-[22px] p-6 text-center" role="status">
                        <p className="eyebrow">{isDaily ? `Daily · ${todayKey()}` : `Level ${levelIdx + 1} cleared`}</p>
                        <p className="mt-2 text-[34px] leading-none tracking-[4px] text-[var(--accent)]" aria-label={`${result.stars} of 3 stars`}>
                            {starText(result.stars)}
                        </p>
                        <p className="mt-3 text-[15px] text-ink-2">
                            {result.launches === 1 ? "First try. Perfect slingshot." : `Reached the target in ${result.launches} launches.`}
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button type="button" onClick={retry} className="pressable btn btn-secondary">Retry</button>
                            {isDaily ? (
                                <button type="button" onClick={shareDaily} className="pressable btn btn-primary">{copied ? "Copied" : "Share"}</button>
                            ) : levelIdx < LEVELS.length - 1 ? (
                                <button type="button" onClick={nextLevel} className="pressable btn btn-primary">Next level</button>
                            ) : (
                                <button type="button" onClick={() => chooseLevel("daily")} className="pressable btn btn-primary">Daily puzzle</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showScience && (
                <ScienceModal
                    title="Gravity Slingshot — Gravity Assists"
                    onClose={() => setShowScience(false)}
                    sections={[
                        {
                            heading: "Every body pulls on the probe",
                            text: "Each planet, star and black hole attracts the probe with Newton's inverse-square law. The forces from all bodies add up as vectors, so the probe's acceleration changes every instant as it moves.",
                            equations: [
                                { label: "Gravity", value: "a = Σ G·Mᵢ·(rᵢ − r) / |rᵢ − r|³" },
                                { label: "Softened", value: "|r|² → |r|² + ε²  (keeps close passes finite)" },
                            ],
                        },
                        {
                            heading: "Why gravity assists work",
                            text: "In the planet's own frame the probe leaves with the same speed it arrived with — only its direction changes. But the planet is moving (or the probe changes direction relative to the target), so in the frame that matters the probe gains or loses speed for free. Voyager 2 used this at Jupiter, Saturn and Uranus to reach Neptune in 12 years instead of 30.",
                        },
                        {
                            heading: "Velocity Verlet integration",
                            text: "The probe is advanced 240 times per simulated second with velocity Verlet, a symplectic integrator that conserves energy far better than simple Euler steps — orbits don't slowly spiral in or out because of numerical error.",
                            code:
`a0 = accel(x, t)
x  = x + v·dt + ½·a0·dt²
a1 = accel(x, t + dt)
v  = v + ½·(a0 + a1)·dt`,
                        },
                        {
                            heading: "Every puzzle is provably solvable",
                            text: "A brute-force solver fires 2,520 test launches (180 angles × 14 strengths) at each level using the exact same physics. A level ships only if some of them hit the target. The daily puzzle is generated from the date and regenerated until it is solvable but not trivial.",
                        },
                    ]}
                />
            )}
        </SimShell>
    );
}
