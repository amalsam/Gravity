"use client";

// Milestone announcements over a simulation ("Predators have arrived").
// Newest at the bottom, each fades after a few seconds. Announced politely to
// screen readers. Pointer events pass through to the canvas.
export default function StoryToasts({ items }) {
  return (
    <div
      className="pointer-events-none absolute left-3 right-3 top-3 z-30 flex flex-col items-start gap-2 md:left-4 md:right-auto md:top-4 md:max-w-[380px]"
      aria-live="polite"
      role="status"
    >
      {items.map((t) => (
        <div key={t.id} className="toast-in material rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug text-ink">
          <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: t.color || "var(--accent)" }} aria-hidden="true" />
          {t.text}
        </div>
      ))}
    </div>
  );
}
