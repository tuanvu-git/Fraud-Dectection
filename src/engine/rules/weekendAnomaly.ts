import { SURGICAL_PROCEDURE_CODES, WEEKEND_MAX_RATE, WEEKEND_MIN_HISTORY, WEIGHTS } from "../config";
import { isWeekend } from "../dates";
import type { Rule } from "../types";

/**
 * Rule 6 — surgical procedure on a weekend from a provider whose historical weekend
 * volume is below 5%. The provider's rate is computed excluding the claim under test.
 */
export const weekendAnomaly: Rule = {
  name: "weekend_anomaly",
  severity: WEIGHTS.weekend_anomaly,
  run(claim, ctx) {
    if (!(claim.is_weekend || isWeekend(claim.claim_date))) return null;

    const surgical = claim.procedure_codes.filter((c) => SURGICAL_PROCEDURE_CODES.has(c));
    if (surgical.length === 0) return null;

    const hist = ctx.agg.providerWeekend.get(claim.provider_id);
    if (!hist || hist.total - 1 < WEEKEND_MIN_HISTORY) return null;

    const priorWeekend = hist.weekend - 1;
    const priorTotal = hist.total - 1;
    const rate = priorWeekend / priorTotal;
    if (rate >= WEEKEND_MAX_RATE) return null;

    return {
      rule: this.name,
      severity: this.severity,
      evidence: `Surgical procedure ${surgical.join(", ")} performed on weekend ${claim.claim_date}; provider ${claim.provider_name} has only ${(rate * 100).toFixed(1)}% historical weekend volume (${priorWeekend}/${priorTotal}).`,
    };
  },
};
