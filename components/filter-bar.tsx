import Form from "next/form";
import { Seal } from "./seal";
import type { Filters } from "@/lib/filters";

/**
 * §7.10 filters, rendered as a GET form so the whole listing stays
 * server-rendered and every filtered view is a shareable, crawlable URL.
 * "Verified only" is on by default and visibly on — that default is the product.
 */
export function FilterBar({
  action,
  filters,
  specialities,
  specialityLabel = "Speciality",
  hidden = {},
}: {
  action: string;
  filters: Filters;
  specialities: string[];
  specialityLabel?: string;
  /** Extra params to carry through, e.g. the search query. */
  hidden?: Record<string, string>;
}) {
  return (
    <Form
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-card border border-rule bg-surface p-4"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {/* Unchecked checkboxes submit nothing, so this companion field always
          carries an explicit "off". The parser reads the last value, which is
          the checkbox's "1" whenever it is checked. */}
      <input type="hidden" name="verified" value="0" />
      <label
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border px-4 text-sm font-medium transition-colors duration-[120ms] ease-[var(--ease-out-quiet)] ${
          filters.verifiedOnly
            ? "border-seal bg-seal-tint text-seal"
            : "border-rule text-ink-muted"
        } has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link`}
      >
        <input
          type="checkbox"
          name="verified"
          value="1"
          defaultChecked={filters.verifiedOnly}
          className="sr-only"
        />
        <Seal size={16} filled={filters.verifiedOnly} className="stamp" />
        Verified only
      </label>

      <Field label="Rating">
        <select
          name="rating"
          defaultValue={String(filters.minRating || "")}
          className="select-field min-h-11 rounded-input border border-rule bg-surface px-3 text-sm"
        >
          <option value="">Any</option>
          <option value="4.5">4.5+</option>
          <option value="4">4.0+</option>
          <option value="3.5">3.5+</option>
          <option value="3">3.0+</option>
        </select>
      </Field>

      <Field label="Cost band">
        <select
          name="band"
          defaultValue={filters.band || ""}
          className="select-field ledger min-h-11 rounded-input border border-rule bg-surface px-3 text-sm"
        >
          <option value="">Any</option>
          <option value="1">₹</option>
          <option value="2">₹₹</option>
          <option value="3">₹₹₹</option>
          <option value="4">₹₹₹₹</option>
        </select>
      </Field>

      {specialities.length > 0 && (
        <Field label={specialityLabel}>
          <select
            name="speciality"
            defaultValue={filters.speciality}
            className="select-field min-h-11 rounded-input border border-rule bg-surface px-3 text-sm"
          >
            <option value="">Any</option>
            {specialities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Sort by">
        <select
          name="sort"
          defaultValue={filters.sort}
          className="select-field min-h-11 rounded-input border border-rule bg-surface px-3 text-sm"
        >
          <option value="verified">Most verified</option>
          <option value="rating">Highest verified score</option>
          <option value="cost_asc">Cost: low to high</option>
          <option value="cost_desc">Cost: high to low</option>
        </select>
      </Field>

      <button
        type="submit"
        className="btn-lift min-h-11 rounded-input border border-rule bg-sunk px-4 text-sm font-medium hover:bg-rule/40"
      >
        Apply
      </button>
    </Form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-2xs text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
