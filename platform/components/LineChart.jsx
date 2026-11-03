"use client";

import { useEffect, useRef } from "react";

// Minimal canvas line chart for live simulation data.
// series: [{ key, label, color, max? }] — each plotted against its own max
// (or a shared max when `shared` is set). Redraws when `data` changes.
export default function LineChart({ data, series, shared = false, height = 120, label }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Gridlines
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = Math.round((h * i) / 4) + 0.5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    if (!data.length) return;

    const sharedMax = shared ? Math.max(1, ...series.flatMap((s) => data.map((d) => d[s.key] || 0))) : 0;
    for (const s of series) {
      const max = s.max ?? (shared ? sharedMax : Math.max(1e-6, ...data.map((d) => d[s.key] || 0)));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 1.75;
      ctx.lineJoin = "round";
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = data.length === 1 ? w : (i / (data.length - 1)) * w;
        const y = h - 3 - ((d[s.key] || 0) / max) * (h - 8);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
  }, [data, series, shared, height]);

  const last = data[data.length - 1] || {};
  return (
    <figure>
      <canvas ref={ref} className="block w-full rounded-lg bg-black/30" style={{ height }} role="img" aria-label={label} />
      <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-3">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="h-[3px] w-3 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
            {s.format && last[s.key] != null && <span className="font-mono tabular text-ink-2">{s.format(last[s.key])}</span>}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
