"use client";
import { useEffect } from "react";

export default function ScienceModal({ title, accentClass, sections, onClose }) {
    // Close on ESC
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full md:max-w-2xl bg-[#0d0d0d] border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[88vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10`}>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Science</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${accentClass}`}>Physics</span>
                        </div>
                        <h2 className="text-xl font-extrabold text-white mt-0.5">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/15 transition-all"
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto px-5 py-4 space-y-6 custom-scrollbar">
                    {sections.map((sec, i) => (
                        <section key={i}>
                            <h3 className="text-sm font-bold text-white mb-1.5 tracking-wide">{sec.heading}</h3>
                            {sec.text && <p className="text-[13px] text-gray-400 leading-relaxed">{sec.text}</p>}
                            {sec.equations && (
                                <div className="mt-3 space-y-2">
                                    {sec.equations.map((eq, j) => (
                                        <div key={j} className="flex items-start gap-3 bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 font-mono text-sm">
                                            <span className="text-gray-600 text-[10px] font-bold pt-0.5 shrink-0 tracking-wider">{eq.label}</span>
                                            <code className="text-emerald-300 text-[13px] leading-snug">{eq.value}</code>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {sec.code && (
                                <pre className="mt-3 bg-black border border-white/10 rounded-xl p-3 text-[11px] md:text-xs text-emerald-300 overflow-x-auto leading-relaxed custom-scrollbar">
                                    <code>{sec.code}</code>
                                </pre>
                            )}
                        </section>
                    ))}
                    {/* SEO-friendly hidden text */}
                    <div className="pb-2" />
                </div>
            </div>
        </div>
    );
}
