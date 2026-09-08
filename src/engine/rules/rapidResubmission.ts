import { RAPID_RESUBMISSION_DAYS, WEIGHTS } from "../config";
import { toEpochDay } from "../dates";
import { compositeKey } from "../key";
import type { Rule } from "../types";

/** Rule 2 — same member + same diagnosis within 7 days of an earlier claim. */
export const rapidResubmission: Rule = {
  name: "rapid_resubmission",
  severity: WEIGHTS.rapid_resubmission,
  run(claim, ctx) {
    const list =
      ctx.agg.byMemberDiagnosis.get(compositeKey(claim.member_id, claim.diagnosis_code)) ?? [];
    const here = toEpochDay(claim.claim_date);

    let closest: { id: string; date: string; gap: number } | null = null;
    for (const other of list) {
      if (other.claim_id === claim.claim_id) continue;
      const gap = here - toEpochDay(other.claim_date);
      // gap 0 = same day: that is a duplicate, not a re-submission — leave it to the duplicate rule.
      if (gap < 1 || gap > RAPID_RESUBMISSION_DAYS) continue; // only earlier claims within the window
      if (!closest || gap < closest.gap) {
        closest = { id: other.claim_id, date: other.claim_date, gap };
      }
    }
    if (!closest) return null;

    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Member ${claim.member_id} filed an earlier claim (${closest.id}) for diagnosis ${claim.diagnosis_code} on ${closest.date}, ${closest.gap} day(s) before this one.`,
    };
  },
};
