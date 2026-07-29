import Form from "next/form";
import { CITIES } from "@/lib/data";

/**
 * Search-first, per §8.1. `next/form` gives client-side navigation and
 * prefetching while degrading to a plain GET form without JavaScript — which
 * matters when the read path is the SEO surface.
 */
export function SearchBox({
  defaultQuery = "",
  /* Empty means every city. Pre-selecting one quietly hides two-thirds of the
     index from someone who never opened the dropdown. */
  defaultCity = "",
  size = "lg",
}: {
  defaultQuery?: string;
  defaultCity?: string;
  size?: "lg" | "sm";
}) {
  const tall = size === "lg";

  return (
    <Form
      action="/search"
      className={`flex flex-col overflow-hidden rounded-card border border-rule bg-surface shadow-paper transition-[border-color,box-shadow] duration-[120ms] ease-[var(--ease-out-quiet)] focus-within:border-acc-blue focus-within:shadow-lift sm:flex-row sm:items-stretch ${
        tall ? "" : "text-sm"
      }`}
    >
      <div className="flex flex-1 items-center gap-2 px-4">
        <SearchGlyph />
        <label htmlFor="q" className="sr-only">
          Search for a hospital, clinic or doctor
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder="Hospital, clinic, lab, doctor"
          className={`w-full bg-transparent outline-none placeholder:text-ink-muted ${
            tall ? "py-4 text-base" : "py-3 text-sm"
          }`}
        />
      </div>

      <div className="flex items-center border-t border-rule px-4 sm:border-l sm:border-t-0">
        <label htmlFor="city" className="sr-only">
          City
        </label>
        <select
          id="city"
          name="city"
          defaultValue={defaultCity}
          className={`select-bare w-full bg-transparent outline-none sm:w-auto ${
            tall ? "py-4 text-base" : "py-3 text-sm"
          }`}
        >
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className={`btn-primary btn-lift px-6 font-medium ${
          tall ? "py-4 text-base" : "py-3 text-sm"
        }`}
      >
        Search
      </button>
    </Form>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-ink-muted"
    >
      <circle
        cx="8.5"
        cy="8.5"
        r="5.75"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M13 13l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
