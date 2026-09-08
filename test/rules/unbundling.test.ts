import { describe, expect, it } from "vitest";
import { unbundling } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

describe("unbundling", () => {
  it("flags a claim that bills every component of a bundle", () => {
    const a = claim({ procedure_codes: ["P-101", "P-102", "P-103"] });
    const f = unbundling.run(a, ctx([a]));
    expect(f?.evidence).toContain("B-100");
    expect(f?.severity).toBe(3);
  });

  it("still flags when an unrelated extra procedure is present", () => {
    const a = claim({ procedure_codes: ["P-101", "P-102", "P-103", "P-X01"] });
    expect(unbundling.run(a, ctx([a]))).not.toBeNull();
  });

  it("does not flag a partial bundle", () => {
    const a = claim({ procedure_codes: ["P-101", "P-102"] });
    expect(unbundling.run(a, ctx([a]))).toBeNull();
  });

  it("does not flag when the bundle code itself is billed", () => {
    const a = claim({ procedure_codes: ["B-100"] });
    expect(unbundling.run(a, ctx([a]))).toBeNull();
  });

  it("does not crash on an empty procedure list", () => {
    const a = claim({ procedure_codes: [] });
    expect(unbundling.run(a, ctx([a]))).toBeNull();
  });
});
