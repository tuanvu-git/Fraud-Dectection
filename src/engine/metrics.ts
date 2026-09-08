import type { Label, RuleName, ScoredClaim } from "./types";
import { RULES } from "./rules";

export interface Confusion {
  threshold: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  fpr: number;
}

export function confusionAt(
  scored: ScoredClaim[],
  labels: Map<string, Label>,
  threshold: number,
): Confusion {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const s of scored) {
    const isFraud = labels.get(s.claim_id)?.is_fraud ?? false;
    const flagged = s.risk_score >= threshold;
    if (flagged && isFraud) tp += 1;
    else if (flagged && !isFraud) fp += 1;
    else if (!flagged && isFraud) fn += 1;
    else tn += 1;
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const fpr = fp + tn === 0 ? 0 : fp / (fp + tn);
  return { threshold, tp, fp, tn, fn, precision, recall, fpr };
}

export function sweep(
  scored: ScoredClaim[],
  labels: Map<string, Label>,
  thresholds: number[],
): Confusion[] {
  return thresholds.map((t) => confusionAt(scored, labels, t));
}

/** For each rule: of the claims planted with that pattern, how many carry that flag. */
export function perRuleRecall(
  scored: ScoredClaim[],
  labels: Label[],
): Record<RuleName, { caught: number; planted: number }> {
  const flagsByClaim = new Map(scored.map((s) => [s.claim_id, new Set(s.flags.map((f) => f.rule))]));
  const out = {} as Record<RuleName, { caught: number; planted: number }>;

  for (const rule of RULES) {
    const planted = labels.filter((l) => l.fraud_patterns.includes(rule.name));
    const caught = planted.filter((l) => flagsByClaim.get(l.claim_id)?.has(rule.name)).length;
    out[rule.name] = { caught, planted: planted.length };
  }
  return out;
}
