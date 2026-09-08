# Rule 4 — unbundling

**Fires when:** the claim's `procedure_codes` contain **all** component codes of a known
bundle, but not billed under the bundle code itself.
**Severity weight:** 3
**Evidence must name:** the bundle code, the component codes found, and (optionally) the
price difference vs. billing the bundle.

## Bundle mapping (config, ≥ 5 bundles) — draft

| Bundle code | Components |
|---|---|
| B-100 | P-101, P-102, P-103 |
| B-200 | P-201, P-202 |
| B-300 | P-301, P-302, P-303 |
| B-400 | P-401, P-402 |
| B-500 | P-501, P-502, P-503, P-504 |

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | Full bundle unbundled | procedure_codes = [P-101, P-102, P-103] | flag; evidence names B-100 and all 3 components | |
| 2 | Full bundle + extra procedure | [P-101, P-102, P-103, P-999] | flag for B-100 | extra code doesn't suppress the flag |
| 3 | Partial bundle | [P-101, P-102] (missing P-103) | no flag | |
| 4 | Bundle billed correctly | [B-100] | no flag | |
| 5 | Components across the 7-day window, different claims | claim A [P-101, P-102], claim B [P-103], same member/provider | confirm: is this in scope? (proposed: no — single-claim rule only) | decision needed |
| 6 | Two bundles in one claim | [P-101,P-102,P-103, P-201,P-202] | flag; evidence lists B-100 and B-200 | |
| 7 | Empty procedure_codes | [] | no flag, no crash | edge |
| 8 | Unknown codes only | [P-777, P-888] | no flag | |
