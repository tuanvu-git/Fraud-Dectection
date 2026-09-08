import type { Aggregates, Claim } from "./types";
import { isWeekend, toEpochDay } from "./dates";
import { compositeKey } from "./key";

/** One-pass precompute of everything the rules need across the whole dataset. */
export function buildAggregates(claims: Claim[]): Aggregates {
  const providerDayCounts = new Map<string, number>();
  const providerWeekend = new Map<string, { total: number; weekend: number }>();
  const byMemberDiagnosis = new Map<string, Claim[]>();
  const duplicateGroups = new Map<string, Claim[]>();
  const providerNames = new Map<string, string>();
  const amountsByProcedure = new Map<string, number[]>();

  for (const c of claims) {
    providerNames.set(c.provider_id, c.provider_name);

    const dayKey = compositeKey(c.provider_id, c.claim_date);
    providerDayCounts.set(dayKey, (providerDayCounts.get(dayKey) ?? 0) + 1);

    const pw = providerWeekend.get(c.provider_id) ?? { total: 0, weekend: 0 };
    pw.total += 1;
    if (c.is_weekend || isWeekend(c.claim_date)) pw.weekend += 1;
    providerWeekend.set(c.provider_id, pw);

    const mdKey = compositeKey(c.member_id, c.diagnosis_code);
    (byMemberDiagnosis.get(mdKey) ?? byMemberDiagnosis.set(mdKey, []).get(mdKey)!).push(c);

    const dupKey = compositeKey(c.member_id, c.provider_id, c.claim_date, c.diagnosis_code);
    (duplicateGroups.get(dupKey) ?? duplicateGroups.set(dupKey, []).get(dupKey)!).push(c);

    // Only single-procedure claims give a clean per-procedure amount distribution;
    // multi-procedure claims would smear one claim total across several codes.
    if (c.procedure_codes.length === 1) {
      const code = c.procedure_codes[0];
      (amountsByProcedure.get(code) ?? amountsByProcedure.set(code, []).get(code)!).push(
        c.submitted_amount,
      );
    }
  }

  for (const list of byMemberDiagnosis.values()) {
    list.sort((a, b) => toEpochDay(a.claim_date) - toEpochDay(b.claim_date));
  }

  const procedureStats = new Map<string, { mean: number; std: number; count: number }>();
  for (const [code, amounts] of amountsByProcedure) {
    const n = amounts.length;
    const mean = amounts.reduce((s, x) => s + x, 0) / n;
    const variance = amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
    procedureStats.set(code, { mean, std: Math.sqrt(variance), count: n });
  }

  return {
    procedureStats,
    providerDayCounts,
    providerWeekend,
    byMemberDiagnosis,
    duplicateGroups,
    providerNames,
  };
}
