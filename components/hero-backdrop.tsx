/* Ambient motion behind the hero. The paper moves; nothing else does.
   Purely decorative — hidden from assistive tech, ignores the pointer, and
   the global prefers-reduced-motion rule stills all of it. */
export function HeroBackdrop() {
  return (
    <div className="hero-backdrop" aria-hidden="true">
      <div className="hero-rules" />
      <div className="hero-bloom hero-bloom-a" />
      <div className="hero-bloom hero-bloom-b" />
      <div className="hero-bloom hero-bloom-c" />
      <div className="hero-bloom hero-bloom-d" />
      <div className="hero-perf" />
    </div>
  );
}
