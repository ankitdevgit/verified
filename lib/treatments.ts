import { cache } from "react";
import { toTreatmentCategory } from "./api/adapters";
import { getTreatments as apiGetTreatments } from "./api/endpoints";
import "./api/mock-transport";
import type { TreatmentCategory } from "./types";

/**
 * The treatment taxonomy — `GET /treatments`, the same API the place names
 * come from. Three levels, asked as three questions:
 *
 *   Treatment category → Speciality → Procedure
 *
 * A category declares a field of type `treatment`; the picker fills three
 * `structured` keys derived from that field's key, so nothing here is
 * hard-coded to hospitals and a new vertical is still a config change (§4).
 */
export const getTreatmentTaxonomy = cache(
  async (): Promise<TreatmentCategory[]> => {
    const res = await apiGetTreatments();
    return res.data.map(toTreatmentCategory);
  },
);

/** The three `structured` keys a `treatment` field writes. */
export function treatmentKeys(fieldKey: string) {
  return {
    category: `${fieldKey}_category`,
    speciality: `${fieldKey}_speciality`,
    procedure: `${fieldKey}_procedure`,
  } as const;
}

export const TREATMENT_LEVEL_LABELS = {
  category: "Treatment category",
  speciality: "Speciality",
  procedure: "Procedure",
} as const;

/** Free text is allowed only under "Others" — see `components/write`. */
export const OTHER_PROCEDURE = "Others";

export interface TreatmentAnswer {
  category: string;
  speciality: string;
  procedure: string;
}

/**
 * Reads a treatment answer back off a review. Returns null when nothing was
 * picked; a partial answer (category only, say) still comes back, because an
 * older review that predates a taxonomy change shouldn't vanish from the card.
 */
export function readTreatment(
  fields: Record<string, string | number | boolean>,
  fieldKey: string,
): TreatmentAnswer | null {
  const keys = treatmentKeys(fieldKey);
  const read = (k: string) =>
    fields[k] === undefined ? "" : String(fields[k]).trim();

  const answer = {
    category: read(keys.category),
    speciality: read(keys.speciality),
    procedure: read(keys.procedure),
  };
  return answer.category || answer.speciality || answer.procedure
    ? answer
    : null;
}

/**
 * One line for the review card: the procedure, with the speciality behind it
 * for context. The category is the coarsest level and the least useful to
 * read, so it stays out of the summary.
 */
export function formatTreatment(answer: TreatmentAnswer): string {
  const parts = [answer.procedure, answer.speciality].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : answer.category;
}
