"use client";

import { useEffect, useId, useRef } from "react";

// Explains the physics behind a simulation. Phones: a bottom sheet.
// Desktop: a centred dialog (modals stay centred — not origin-aware).
// `accentClass` is accepted for backwards compatibility; colour comes from --accent.
export default function ScienceModal({ title, sections, onClose }) {
    const titleId = useId();
    const dialogRef = useRef(null);
    const closeRef = useRef(null);

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        closeRef.current?.focus();

        const onKey = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onClose();
                return;
            }
            // Keep Tab focus inside the dialog
            if (e.key === "Tab" && dialogRef.current) {
                const focusables = dialogRef.current.querySelectorAll(
                    'button, [href], input, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            previouslyFocused?.focus?.();
        };
    }, [onClose]);

    return (
        <div
            className="scrim-in fixed inset-0 z-[100] flex items-end justify-center bg-black/70 md:items-center md:p-6"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="dialog-in relative flex select-text max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[22px] border border-line bg-[var(--panel-solid)] shadow-2xl md:max-w-2xl md:rounded-[20px]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 md:px-6">
                    <div>
                        <p className="eyebrow flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                            The science
                        </p>
                        <h2 id={titleId} className="heading mt-1.5 text-xl text-ink md:text-2xl">
                            {title}
                        </h2>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        className="pressable nav-link flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2"
                        aria-label="Close"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                            <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                    </button>
                </header>

                <div className="sheet-scroll custom-scrollbar space-y-7 overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 md:px-6">
                    {sections.map((sec, i) => (
                        <section key={i}>
                            <h3 className="text-[15px] font-semibold text-ink">{sec.heading}</h3>
                            {sec.text && <p className="prose-lab mt-1.5 text-[15px]">{sec.text}</p>}
                            {sec.equations && (
                                <dl className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-line bg-fill">
                                    {sec.equations.map((eq, j) => (
                                        <div key={j} className="flex flex-col gap-0.5 px-3.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-4">
                                            <dt className="shrink-0 text-[12px] text-ink-3 sm:w-28">{eq.label}</dt>
                                            <dd className="font-mono text-[14px] leading-snug text-ink">{eq.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                            {sec.code && (
                                <pre className="custom-scrollbar mt-3 overflow-x-auto rounded-xl border border-line bg-black p-3.5 text-[12.5px] leading-relaxed text-ink-2">
                                    <code>{sec.code}</code>
                                </pre>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
