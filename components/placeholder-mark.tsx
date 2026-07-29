/**
 * The stand-in mark for missing photography: a rod of Asclepius on a medical
 * cross, ringed.
 *
 * Drawn rather than shipped as a raster so it stays sharp from the 80px list
 * thumbnail up to the 224px profile block, costs no request, and takes its
 * colour from `currentColor` — which is what keeps it on-theme if the teal
 * ever moves. Purely decorative: the accessible name, when there is one,
 * belongs to the element wrapping this.
 */
export function PlaceholderMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Disc first, so the ring reads as an outline around white rather than
          a band floating on whatever tint sits behind it. */}
      <circle cx="50" cy="50" r="44" fill="#fff" />
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="currentColor"
        strokeWidth="6.5"
        opacity="0.95"
      />

      {/* Two overlapping rounded bars in one fill make a cross with rounded
          outer corners but square inner ones — the shape of the original. */}
      <g fill="currentColor">
        <rect x="21" y="40.5" width="58" height="19" rx="2.5" />
        <rect x="40.5" y="21" width="19" height="58" rx="2.5" />
      </g>

      {/* Staff, ball finial, and the serpent coiling down it. */}
      <g fill="#fff">
        <rect x="48.85" y="27" width="2.3" height="49" rx="1.15" />
        <circle cx="50" cy="24.2" r="4.3" />
        <ellipse
          cx="55.2"
          cy="31.6"
          rx="4.1"
          ry="2.6"
          transform="rotate(-14 55.2 31.6)"
        />
      </g>
      <circle cx="56.8" cy="30.7" r="0.62" fill="currentColor" />
      <path
        d="M52.2 33.6c-8 3-8 8.4-2.2 12.2 6.5 4.2 6.5 9.2 0 13.2-6 3.6-6 8.5 0 12.4"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
