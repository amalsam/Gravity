"use client";

import { useId } from "react";

// Shared simulation controls. Defined at module scope so they keep identity
// across renders — a slider being dragged is never remounted mid-gesture.

export function Group({ label, children, className = "" }) {
  return (
    <section className={`space-y-2.5 ${className}`}>
      {label && <h3 className="eyebrow">{label}</h3>}
      {children}
    </section>
  );
}

export function Slider({ label, value, min, max, step = 1, onChange, format = (v) => v }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-[13px] tabular text-ink">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="range"
        style={{ "--pct": `${pct}%` }}
      />
    </div>
  );
}

export function Switch({ label, checked, onChange, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="pressable flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-1 text-left"
    >
      <span>
        <span className="block text-[14px] text-ink">{label}</span>
        {description && <span className="block text-[12px] text-ink-3">{description}</span>}
      </span>
      <span className="switch-track" aria-hidden="true" />
    </button>
  );
}

export function Segmented({ label, options, value, onChange, columns, dense = false }) {
  const cols = columns || Math.min(options.length, 4);
  return (
    <div role="radiogroup" aria-label={label} className={`grid ${dense ? "gap-1" : "gap-1.5"}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`pressable flex min-h-11 items-center justify-center rounded-xl border font-medium ${dense ? "gap-1 px-1 text-[12.5px]" : "gap-1.5 px-2 text-[13px]"} ${
              selected
                ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-ink"
                : "border-line bg-fill text-ink-2"
            }`}
          >
            {o.swatch && <span className={`${dense ? "h-2 w-2" : "h-2.5 w-2.5"} shrink-0 rounded-full`} style={{ background: o.swatch }} aria-hidden="true" />}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Compact on/off control for the always-visible peek row.
export function ToggleChip({ label, pressed, onChange }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={`pressable inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ${
        pressed
          ? "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-ink"
          : "border-line bg-fill text-ink-2"
      }`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: pressed ? "var(--accent)" : "rgba(255,255,255,0.3)" }}
        aria-hidden="true"
      />
      {label}
    </button>
  );
}

export function Stats({ items }) {
  return (
    <dl className="flex gap-4">
      {items.map((s) => (
        <div key={s.label} className="min-w-0">
          <dt className="text-[11px] text-ink-3">{s.label}</dt>
          <dd
            className="font-mono text-[15px] leading-tight tabular"
            style={{ color: s.tone === "bad" ? "var(--danger)" : s.tone === "accent" ? "var(--accent)" : "var(--text)" }}
          >
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ActionButton({ children, onClick, tone = "default", icon, disabled = false }) {
  const tones = {
    default: "border-line bg-fill text-ink",
    danger: "border-[rgba(248,113,113,0.28)] bg-[rgba(248,113,113,0.08)] text-[#fca5a5]",
    accent: "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-ink",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`pressable flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-[14px] font-medium disabled:cursor-wait disabled:opacity-50 ${tones[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Hint({ children }) {
  return <p className="text-[13px] leading-relaxed text-ink-3">{children}</p>;
}

export const Icons = {
  reset: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 10a6.5 6.5 0 1 0 2-4.7" />
      <path d="M3.5 3.5v3.6h3.6" />
    </svg>
  ),
  clear: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
    </svg>
  ),
  play: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 4.5v11l9-5.5z" />
    </svg>
  ),
  pause: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4.5" width="3.5" height="11" rx="1" />
      <rect x="11.5" y="4.5" width="3.5" height="11" rx="1" />
    </svg>
  ),
};
