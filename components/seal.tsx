/**
 * The stamp. §9.1 calls this the only ornamental thing in the product, so it
 * gets real detail — a rotated, ink-textured ring with a tick — and everything
 * around it stays quiet.
 */
export function Seal({
  size = 20,
  className = "",
  filled = true,
}: {
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="10.25"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={filled ? 0.9 : 0.55}
        strokeDasharray={filled ? undefined : "3 2.5"}
      />
      <circle
        cx="12"
        cy="12"
        r="7.75"
        stroke="currentColor"
        strokeWidth="1"
        opacity={filled ? 0.45 : 0.3}
      />
      {filled ? (
        <path
          d="M8.4 12.3l2.5 2.5 4.7-5.4"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M12 8.4v4.2M12 15.4v.5"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
