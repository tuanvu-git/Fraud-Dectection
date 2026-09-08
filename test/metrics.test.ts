import { describe, expect, it } from "vitest";
import { confusionAt, perRuleRecall } from "../src/engine/metrics";
import type { Label, ScoredClaim } from "../src/engine/types";

const scored: ScoredClaim[] = [
  { claim_id: "A", risk_score: 80, flags: [{ rule: "duplicate_claim", severity: 5, evidence: "" }] },
  { claim_id: "B", risk_score: 40, flags: [{ rule: "upcoding", severity: 4, evidence: "" }] },
  { claim_id: "C", risk_score: 10, flags: [] },
  { claim_id: "D", risk_score: 60, flags: [] },
];
const labels: Label[] = [
  { claim_id: "A", is_fraud: true, fraud_patterns: ["duplicate_claim"] },
  { claim_id: "B", is_fraud: true, fraud_patterns: ["upcoding"] },
  { claim_id: "C", is_fraud: true, fraud_patterns: ["upcoding"] },
  { claim_id: "D", is_fraud: false, fraud_patterns: [] },
];
const map = new Map(labels.map((l) => [l.claim_id, l]));

describe("metrics", () => {
  it("computes the confusion matrix at a threshold", () => {
    const c = confusionAt(scored, map, 50);
    expect(c).toMatchObject({ tp: 1, fp: 1, fn: 2, tn: 0 });
    expect(c.recall).toBeCloseTo(1 / 3);
    expect(c.fpr).toBeCloseTo(1);
  });

  it("recall rises and FPR falls as the threshold drops", () => {
    const low = confusionAt(scored, map, 20);
    expect(low.tp).toBe(2);
    expect(low.recall).toBeCloseTo(2 / 3);
  });

  it("reports per-rule recall against planted patterns", () => {
    const r = perRuleRecall(scored, labels);
    expect(r.duplicate_claim).toEqual({ caught: 1, planted: 1 });
    expect(r.upcoding).toEqual({ caught: 1, planted: 2 });
  });
});
