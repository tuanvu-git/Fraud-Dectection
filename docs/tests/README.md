# Rule test specifications

One file per detection rule. Each file lists **proposed** unit-test cases as a table.

## Workflow

1. **Review & annotate** — go through each table, adjust the `Expected result` column, add
   or remove cases, and write anything the implementation must guarantee in `Notes`.
2. **Implement** — once a file is approved, the matching Vitest suite is written in
   `test/rules/<rule>.test.ts`, one `it(...)` per table row, asserting exactly what the
   `Expected result` column says.
3. **Trace back** — every test references its row number so the spec and the suite stay in
   sync.

## Table columns

| Column | Meaning |
|---|---|
| # | Case number, referenced by the test |
| Case | Short name |
| Setup | Input claim(s) and any precomputed aggregates the rule receives |
| Expected result | `flag` or `no flag`; if flagged, what the `evidence` string must contain |
| Notes | Edge conditions, open questions, things to confirm |

## Case categories each rule should cover

- **positive** — rule clearly fires; evidence contains the right numbers
- **negative** — a similar but legitimate claim does not fire
- **boundary** — exactly at the spec threshold (amount = 47,500; 30 vs 31 claims/day; day 7 vs 8)
- **edge** — empty procedure list, provider with a single claim (no stddev), unknown code

## Files

| Rule | File |
|---|---|
| 1. duplicate_claim | [01-duplicate-claim.md](01-duplicate-claim.md) |
| 2. rapid_resubmission | [02-rapid-resubmission.md](02-rapid-resubmission.md) |
| 3. upcoding | [03-upcoding.md](03-upcoding.md) |
| 4. unbundling | [04-unbundling.md](04-unbundling.md) |
| 5. phantom_billing | [05-phantom-billing.md](05-phantom-billing.md) |
| 6. weekend_anomaly | [06-weekend-anomaly.md](06-weekend-anomaly.md) |
| 7. diagnosis_procedure_mismatch | [07-diagnosis-procedure-mismatch.md](07-diagnosis-procedure-mismatch.md) |
| 8. amount_clustering | [08-amount-clustering.md](08-amount-clustering.md) |

Target: ≥ 15 tests total; these specs propose ~30 across the 8 rules, plus a few
`score` / `metrics` tests added separately.
