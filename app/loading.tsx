/**
 * §9.3 — skeletons on every list and profile; no spinners on content surfaces.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-8 w-2/3 rounded-input bg-rule/60" />
      <div className="mt-3 h-4 w-1/2 rounded-input bg-rule/40" />
      <div className="mt-8 space-y-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="size-24 shrink-0 rounded-image bg-rule/60" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-1/3 rounded-input bg-rule/60" />
              <div className="h-3 w-1/4 rounded-input bg-rule/40" />
              <div className="h-3 w-2/3 rounded-input bg-rule/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
