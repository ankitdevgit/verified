"use client";

/**
 * §9.3 — large touch targets, half-stars off. Rendered as a radio group so
 * keyboard and screen-reader users get the same control everyone else does.
 */
export function StarInput({
  name,
  label,
  value,
  onChange,
  size = 32,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <label
            key={i}
            className="cursor-pointer rounded-input p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link"
            title={`${i} of 5`}
          >
            <input
              type="radio"
              name={name}
              value={i}
              checked={value === i}
              onChange={() => onChange(i)}
              className="sr-only"
            />
            <span className="sr-only">
              {i} {i === 1 ? "star" : "stars"}
            </span>
            <svg
              width={size}
              height={size}
              viewBox="0 0 20 20"
              aria-hidden="true"
              className={i <= value ? "text-ink" : "text-rule"}
            >
              <path
                d="M10 1.6l2.47 5.3 5.53.72-4.08 3.94 1.05 5.84L10 14.6l-4.97 2.8 1.05-5.84L2 7.62l5.53-.72L10 1.6z"
                fill="currentColor"
              />
            </svg>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
