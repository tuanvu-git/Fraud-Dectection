import { describe, expect, it } from "vitest";
import { DENOM } from "../src/engine/config";
import { scoreAll, scoreClaim } from "../src/engine/score";
import { buildAggregates } from "../src/engine/aggregates";
import { claim, ctx } from "./helpers";

describe("scoring", () => {
  it("returns 0 for a clean claim", () => {
    const a = claim();
    expect(scoreClaim(a, ctx([a])).risk_score).toBe(0);
  });

  it("normalizes the weighted sum with round(min(raw/DENOM,1)*100)", () => {
    // amount_clustering (4) only -> raw 4
    const a = claim({ submitted_amount: 48_000, diagnosis_code: "Z00.00", procedure_codes: ["P-X01"] });
    const scored = scoreClaim(a, ctx([a]));
    expect(scored.risk_score).toBe(Math.round((4 / DENOM) * 100));
  });

  it("caps the risk score at 100 when many heavy rules fire", () => {
    const key = { member_id: "M-1", provider_id: "PR-1", claim_date: "2024-05-06", diagnosis_code: "E11.9" };
    const dup = Array.from({ length: 2 }, (_, i) =>
      claim({ claim_id: `D-${i}`, ...key, procedure_codes: ["P-S01"], submitted_amount: 48_000 }),
    );
    const scored = scoreClaim(dup[0], ctx(dup));
    expect(scored.risk_score).toBe(100);
  });

  it("ranks claims by descending risk score", () => {
    const clean = Array.from({ length: 3 }, (_, i) => claim({ claim_id: `C-${i}` }));
    const risky = claim({ claim_id: "R", submitted_amount: 48_500, diagnosis_code: "Z00.00", procedure_codes: ["P-X01"] });
    const all = [...clean, risky];
    const ranked = scoreAll(all, buildAggregates(all));
    expect(ranked[0].claim_id).toBe("R");
  });
});
