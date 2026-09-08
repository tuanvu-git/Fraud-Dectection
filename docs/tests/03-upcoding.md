# Rule 3 — upcoding

**Fires when:** `submitted_amount` > mean + 2·stddev of `submitted_amount` for that
procedure code, computed across the whole dataset.
**Severity weight:** 4
**Evidence must name:** the procedure code, the submitted amount, the procedure mean, and
how many standard deviations above the mean (e.g. "2.8 SD above the mean of 32,000").

## Open decisions

- For a claim with **multiple procedure codes**, do we test each code and flag if any
  exceeds its threshold? (proposed: yes, evidence names the worst offender)
- Minimum sample size before the rule applies — skip codes with < N claims? (proposed: N = 5)

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | Clear upcode | Procedure P1: 20 claims ~30,000 (sd ~2,000), test claim 85,000 | flag; evidence names P1, 85,000, mean ~30,000, SD count > 2 | |
| 2 | Just above threshold | Test amount = mean + 2.01·sd | flag | boundary |
| 3 | Just below threshold | Test amount = mean + 1.99·sd | no flag | boundary |
| 4 | Exactly at 2·sd | amount = mean + 2·sd exactly | confirm: strict `>` so no flag | |
| 5 | High but normal-variance code | Procedure with naturally wide spread; amount high but < 2 sd | no flag | guards against false positives on volatile codes |
| 6 | Unknown / rare procedure code | Code appears only once (this claim) | no flag | insufficient sample; confirm N |
| 7 | Multi-procedure claim | Codes [P1 normal, P2 upcoded] | flag; evidence points at P2 | |
| 8 | Empty procedure_codes | `procedure_codes: []` | no flag, no crash | edge |
