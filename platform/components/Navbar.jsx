"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import { simulationsByCategory, getSimulation } from "@/shared/simulations";

export default function Navbar() {
  const pathname = usePathname() || "/";
  const slug = pathname.split("/").filter(Boolean)[0];
  const current = slug ? getSimulation(slug) : null;
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on Escape / outside press
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <nav
      aria-label="Primary"
      className="fixed top-0 inset-x-0 z-50 h-16 border-b border-line bg-[rgba(10,10,12,0.72)] backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1.5">
          <Link
            href="/"
            className="pressable -ml-2 flex h-11 items-center gap-2 rounded-full px-2 text-ink"
            aria-label="Stacklor Lab home"
          >
            <BrandMark className="h-5 w-5 text-ink" />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">Stacklor Lab</span>
          </Link>

          {current && (
            <>
              <span className="text-ink-3" aria-hidden="true">/</span>
              <span
                className="flex min-w-0 items-center gap-2 truncate px-1.5 text-[15px] text-ink-2"
                aria-current="page"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: current.accent }} aria-hidden="true" />
                <span className="truncate">{current.short}</span>
              </span>
            </>
          )}
        </div>

        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="sim-menu"
            aria-haspopup="true"
            aria-label="All simulations"
            className="pressable nav-link flex h-11 items-center gap-2 rounded-full px-3.5 text-[15px] text-ink-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" />
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" />
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" />
              <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" />
            </svg>
            <span className="hidden sm:inline">Simulations</span>
          </button>

          {open && (
            <div
              ref={menuRef}
              id="sim-menu"
              className="menu-in material absolute right-0 top-[calc(100%+8px)] w-[min(92vw,560px)] rounded-2xl p-2"
            >
              <div className="grid gap-x-2 sm:grid-cols-2">
                {simulationsByCategory().map((cat) => (
                  <div key={cat.id} className="py-1.5">
                    <p className="eyebrow px-3 pb-1 pt-1.5">{cat.name}</p>
                    <ul>
                      {cat.items.map((s) => {
                        const active = s.slug === slug;
                        return (
                          <li key={s.slug}>
                            <Link
                              href={`/${s.slug}/`}
                              aria-current={active ? "page" : undefined}
                              onClick={() => setOpen(false)}
                              className={`nav-link flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[15px] ${
                                active ? "bg-fill text-ink" : "text-ink-2"
                              }`}
                            >
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.accent }} aria-hidden="true" />
                              <span className="flex-1">{s.name}</span>
                              <span className="font-mono text-[12px] text-ink-3">{s.tech}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
