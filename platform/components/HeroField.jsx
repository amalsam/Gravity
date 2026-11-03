"use client";

import { useEffect, useRef } from "react";
import { simulations } from "@/shared/simulations";

// The home page's signature: a small live gravity well. Particles in each
// simulation's colour orbit a point that follows the pointer on a spring.
// Decorative only — pauses offscreen / in background tabs, and renders a
// single still frame when the user prefers reduced motion.
export default function HeroField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = simulations.map((s) => s.accent);

    let w = 0, h = 0, dpr = 1, raf = 0, visible = true;
    let particles = [];
    const well = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };

    const seed = () => {
      const n = Math.round(Math.min(260, Math.max(110, (w * h) / 5200)));
      particles = Array.from({ length: n }, () => {
        const r = 40 + Math.random() * Math.min(w, h) * 0.55;
        const a = Math.random() * Math.PI * 2;
        const speed = Math.sqrt(9000 / r) * (0.85 + Math.random() * 0.3);
        return {
          x: well.x + Math.cos(a) * r,
          y: well.y + Math.sin(a) * r,
          vx: -Math.sin(a) * speed,
          vy: Math.cos(a) * speed,
          c: colors[(Math.random() * colors.length) | 0],
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const home = { x: w > 768 ? w * 0.72 : w * 0.5, y: h * (w > 768 ? 0.5 : 0.26) };
      well.x = well.tx = home.x;
      well.y = well.ty = home.y;
      well.home = home;
      seed();
      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, w, h);
    };

    const step = (dt) => {
      // Spring the well toward the pointer (critically damped-ish)
      const k = 40, c = 2 * Math.sqrt(k) * 0.9;
      well.vx += ((well.tx - well.x) * k - well.vx * c) * dt;
      well.vy += ((well.ty - well.y) * k - well.vy * c) * dt;
      well.x += well.vx * dt;
      well.y += well.vy * dt;

      const GM = 9000;
      for (const p of particles) {
        const dx = well.x - p.x, dy = well.y - p.y;
        const r2 = dx * dx + dy * dy + 400; // softening
        const inv = GM / (r2 * Math.sqrt(r2));
        p.vx += dx * inv * dt * 60;
        p.vy += dy * inv * dt * 60;
        p.x += p.vx * dt * 6;
        p.y += p.vy * dt * 6;
        // Recycle anything flung far away
        if (p.x < -w || p.x > 2 * w || p.y < -h || p.y > 2 * h) {
          const r = 60 + Math.random() * Math.min(w, h) * 0.5;
          const a = Math.random() * Math.PI * 2;
          const s = Math.sqrt(GM / r);
          p.x = well.x + Math.cos(a) * r;
          p.y = well.y + Math.sin(a) * r;
          p.vx = -Math.sin(a) * s;
          p.vy = Math.cos(a) * s;
        }
      }
    };

    const draw = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(10,10,12,0.16)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(p.x, p.y, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (raf || reduce || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    if (reduce) {
      // A still, settled frame: integrate offscreen, then draw once
      for (let i = 0; i < 240; i++) step(1 / 60);
      for (let i = 0; i < 30; i++) { step(1 / 60); draw(); }
    } else {
      start();
    }

    const onPointer = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        well.tx = well.home.x;
        well.ty = well.home.y;
        return;
      }
      well.tx = x;
      well.ty = y;
    };
    const onLeave = () => {
      well.tx = well.home.x;
      well.ty = well.home.y;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
