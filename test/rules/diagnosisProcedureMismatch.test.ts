import { describe, expect, it } from "vitest";
import { diagnosisProcedureMismatch } from "../../src/engine/rules";
import { claim, ctx } from "../helpers";

describe("diagnosis_procedure_mismatch", () => {
  it("flags a diabetes diagnosis billed with an ankle procedure", () => {
    const a = claim({ diagnosis_code: "E11.9", procedure_codes: ["P-S01"] });
    const f = diagnosisProcedureMismatch.run(a, ctx([a]));
    expect(f?.evidence).toContain("E11.9");
    expect(f?.evidence).toContain("P-S01");
    expect(f?.severity).toBe(2);
  });

  it("does not flag a valid diagnosis-procedure pairing", () => {
    const a = claim({ diagnosis_code: "E11.9", procedure_codes: ["P-D01"] });
    expect(diagnosisProcedureMismatch.run(a, ctx([a]))).toBeNull();
  });

  it("does not flag when at least one procedure is valid", () => {
    const a = claim({ diagnosis_code: "M54.5", procedure_codes: ["P-B02", "P-S01"] });
    expect(diagnosisProcedureMismatch.run(a, ctx([a]))).toBeNull();
  });

  it("stays silent on a diagnosis that is not in the mapping", () => {
    const a = claim({ diagnosis_code: "Z00.00", procedure_codes: ["P-S01"] });
    expect(diagnosisProcedureMismatch.run(a, ctx([a]))).toBeNull();
  });

  it("does not flag an empty procedure list", () => {
    const a = claim({ diagnosis_code: "E11.9", procedure_codes: [] });
    expect(diagnosisProcedureMismatch.run(a, ctx([a]))).toBeNull();
  });
});
