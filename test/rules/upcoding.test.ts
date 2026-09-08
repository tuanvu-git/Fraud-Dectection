import { describe, expect, it } from "vitest";
import { upcoding } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

describe("upcoding", () => {
  const normal = (amount: number, id: string) =>
    claim({ claim_id: id, procedure_codes: ["P-D01"], submitted_amount: amount });

  const population = () => [
    ...Array.from({ length: 12 }, (_, i) => normal(1000 + (i % 3) * 50, `N-${i}`)),
  ];

  it("flags an amount far above the procedure mean and reports the SD count", () => {
    const outlier = normal(9000, "OUT");
    const claims = [...population(), outlier];
    const f = upcoding.run(outlier, ctx(claims));
    expect(f).not.toBeNull();
    expect(f?.evidence).toMatch(/standard deviations above the mean/);
    expect(f?.severity).toBe(4);
  });

  it("does not flag a normal-priced claim", () => {
    const claims = [...population(), normal(1050, "OK")];
    expect(upcoding.run(claims.at(-1)!, ctx(claims))).toBeNull();
  });

  it("does not flag when the procedure has too few observations", () => {
    const a = claim({ claim_id: "A", procedure_codes: ["P-RARE"], submitted_amount: 99999 });
    expect(upcoding.run(a, ctx([a]))).toBeNull();
  });

  it("does not crash on an empty procedure list", () => {
    const a = claim({ claim_id: "A", procedure_codes: [], submitted_amount: 5000 });
    expect(upcoding.run(a, ctx([a]))).toBeNull();
  });
});
