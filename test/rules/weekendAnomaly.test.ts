import { describe, expect, it } from "vitest";
import { weekendAnomaly } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

// 2024-06-15 is a Saturday; 2024-06-17 a Monday.
const weekdayHistory = (n: number, provider = "PR-3") =>
  Array.from({ length: n }, (_, i) =>
    claim({ claim_id: `H-${i}`, provider_id: provider, claim_date: "2024-06-17", procedure_codes: ["P-D01"] }),
  );

describe("weekend_anomaly", () => {
  it("flags a weekend surgical claim from a weekday-only provider", () => {
    const surgical = claim({
      claim_id: "S-1",
      provider_id: "PR-3",
      claim_date: "2024-06-15",
      procedure_codes: ["S-001"],
    });
    const claims = [...weekdayHistory(40), surgical];
    const f = weekendAnomaly.run(surgical, ctx(claims));
    expect(f?.evidence).toContain("S-001");
    expect(f?.severity).toBe(3);
  });

  it("does not flag a non-surgical weekend claim", () => {
    const consult = claim({ claim_id: "C-1", provider_id: "PR-3", claim_date: "2024-06-15", procedure_codes: ["P-D01"] });
    const claims = [...weekdayHistory(40), consult];
    expect(weekendAnomaly.run(consult, ctx(claims))).toBeNull();
  });

  it("does not flag a surgical claim on a weekday", () => {
    const surgical = claim({ claim_id: "S-1", provider_id: "PR-3", claim_date: "2024-06-17", procedure_codes: ["S-001"] });
    const claims = [...weekdayHistory(40), surgical];
    expect(weekendAnomaly.run(surgical, ctx(claims))).toBeNull();
  });

  it("does not flag a provider that regularly operates on weekends", () => {
    const surgical = claim({ claim_id: "S-1", provider_id: "PR-3", claim_date: "2024-06-15", procedure_codes: ["S-001"] });
    const weekendOps = Array.from({ length: 20 }, (_, i) =>
      claim({ claim_id: `W-${i}`, provider_id: "PR-3", claim_date: "2024-06-15", procedure_codes: ["S-001"] }),
    );
    const claims = [...weekdayHistory(20), ...weekendOps, surgical];
    expect(weekendAnomaly.run(surgical, ctx(claims))).toBeNull();
  });

  it("does not flag when provider history is too thin", () => {
    const surgical = claim({ claim_id: "S-1", provider_id: "PR-3", claim_date: "2024-06-15", procedure_codes: ["S-001"] });
    const claims = [...weekdayHistory(5), surgical];
    expect(weekendAnomaly.run(surgical, ctx(claims))).toBeNull();
  });
});
