"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { getSimulation } from "@/shared/simulations";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Apple's momentum projection (Designing Fluid Interfaces): where a flick
// would come to rest if it decelerated like a scroll view.
const project = (velocityPxPerS, rate = 0.998) => ((velocityPxPerS / 1000) * rate) / (1 - rate);

// Progressive resistance past a boundary instead of a hard stop.
const rubberband = (overshoot, dimension, c = 0.55) =>
  (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));

const DRAG_SLOP = 6; // px of movement before a press becomes a drag

/**
 * The frame every simulation lives in.
 *  - children: the canvas and any overlays (full-bleed)
 *  - peek:     always-visible controls (mobile sheet's collapsed state, top of the desktop inspector)
 *  - panel:    the full set of controls
 * On phones the panel is a bottom sheet that tracks the finger 1:1 and snaps
 * using release velocity. On desktop it's a floating inspector on the right.
 */
export default function SimShell({ slug, subtitle, peek, panel, onScience, stageRef, children }) {
  const sim = getSimulation(slug);
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);

  const [isDesktop, setIsDesktop] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [collapsedY, setCollapsedY] = useState(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Collapsed offset = everything below the peek row slides off-screen.
  useIsoLayoutEffect(() => {
    const el = panelRef.current;
    const body = bodyRef.current;
    if (!el || !body) return;
    const measure = () => setCollapsedY(Math.max(0, el.offsetHeight - body.offsetTop));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);

  const restY = expanded ? 0 : collapsedY;

  const onPointerDown = useCallback(
    (e) => {
      if (isDesktop || e.button > 0) return;
      // Only the handle (grabber, title, peek row) drags the sheet; the body scrolls
      if (!e.target.closest(".sheet-handle, .sheet-grabber")) return;
      if (e.target.closest("input, select, textarea")) return; // sliders own their gesture
      drag.current = {
        id: e.pointerId,
        startY: e.clientY,
        base: restY ?? 0,
        y: restY ?? 0,
        active: false,
        samples: [{ y: e.clientY, t: e.timeStamp }],
      };
    },
    [isDesktop, restY]
  );

  const onPointerMove = useCallback(
    (e) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dy = e.clientY - d.startY;
      if (!d.active) {
        if (Math.abs(dy) < DRAG_SLOP) return;
        d.active = true;
        setDragging(true);
        panelRef.current.setPointerCapture(e.pointerId);
      }
      const max = collapsedY ?? 0;
      let y = d.base + dy;
      if (y < 0) y = -rubberband(-y, panelRef.current.offsetHeight);
      else if (y > max) y = max + rubberband(y - max, panelRef.current.offsetHeight);
      d.y = y;
      d.samples.push({ y: e.clientY, t: e.timeStamp });
      if (d.samples.length > 5) d.samples.shift();
      // Write the transform straight to the element (no React render per frame)
      panelRef.current.style.transform = `translateY(${y}px)`;
    },
    [collapsedY]
  );

  const endDrag = useCallback(
    (e) => {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.active) return;
      // Swallow the click that may follow this drag, but only that one
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      const first = d.samples[0];
      const last = d.samples[d.samples.length - 1];
      const dt = Math.max(1, last.t - first.t);
      const velocity = ((last.y - first.y) / dt) * 1000; // px/s, + is downward
      const projected = d.y + project(velocity);
      const max = collapsedY ?? 0;
      setExpanded(Math.abs(projected) < Math.abs(projected - max));
      panelRef.current.style.transform = "";
      setDragging(false);
      if (e?.pointerId != null && panelRef.current.hasPointerCapture?.(e.pointerId)) {
        panelRef.current.releasePointerCapture(e.pointerId);
      }
    },
    [collapsedY]
  );

  // A drag that started on a button must not also "click" it
  const onClickCapture = useCallback((e) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  const sheetY = expanded ? "0px" : collapsedY != null ? `${collapsedY}px` : "calc(100% - 132px)";

  return (
    <div ref={stageRef} className="sim-stage" style={{ "--accent": sim.accent }} data-sim-stage>
      {children}

      <aside
        ref={panelRef}
        aria-label={`${sim.name} controls`}
        className="ui-panel sim-panel material"
        data-open={desktopOpen}
        data-dragging={dragging}
        style={{ "--sheet-y": sheetY }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {/* Grabber — phones only */}
        <button
          type="button"
          className="sheet-grabber md:hidden"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse controls" : "Expand controls"}
          onClick={() => setExpanded((x) => !x)}
        >
          <span />
        </button>

        <div className="sheet-handle px-4 md:px-4 md:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: sim.accent }} aria-hidden="true" />
                <span className="truncate">{sim.name}</span>
              </p>
              <p className="mt-0.5 truncate text-[12px] text-ink-3">{subtitle || sim.tagline}</p>
            </div>
            <button
              type="button"
              onClick={() => setDesktopOpen(false)}
              className="pressable nav-link hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3 md:flex"
              aria-label="Hide controls"
              title="Hide controls"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          </div>
          {peek && <div className="mt-3">{peek}</div>}
        </div>

        <div
          ref={bodyRef}
          className="sheet-scroll custom-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-4 pb-4 pt-4"
          inert={!isDesktop && !expanded ? true : undefined}
        >
          <div className="space-y-5">{panel}</div>
          <div className="mt-5 grid gap-2 border-t border-line pt-4">
            {onScience && (
              <button
                type="button"
                onClick={onScience}
                className="pressable flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 text-[14px] font-medium text-ink"
              >
                The science
              </button>
            )}
            <a
              href="#about"
              className="flex min-h-11 items-center justify-center rounded-xl text-[13px] text-ink-3 hover:text-ink"
            >
              About this simulation ↓
            </a>
          </div>
        </div>
      </aside>

      {/* Desktop: reopen control */}
      {isDesktop && !desktopOpen && (
        <button
          type="button"
          onClick={() => setDesktopOpen(true)}
          className="ui-panel pressable material absolute right-4 top-4 z-40 flex h-10 items-center gap-2 rounded-full pl-3 pr-4 text-[14px] text-ink"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: sim.accent }} aria-hidden="true" />
          Controls
        </button>
      )}
    </div>
  );
}
