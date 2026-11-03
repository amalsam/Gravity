// A star with one orbiting body — the original Gravity.py, as a glyph.
export default function BrandMark({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="10" ry="4.6" transform="rotate(-28 12 12)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <circle cx="20.2" cy="7.6" r="1.7" fill="currentColor" />
    </svg>
  );
}
