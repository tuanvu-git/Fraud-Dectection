# Rule 8 — amount_clustering

**Fires when:** `submitted_amount` is between **47,500 and 49,999** inclusive (within 5%
below the 50,000 auto-approval threshold).
**Severity weight:** 4
**Evidence must name:** the amount, the threshold (50,000), and the amount as a percentage
of it (e.g. "49,500 is 99% of the 50,000 auto-approval threshold").

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | Mid-band amount | submitted_amount = 49,500 | flag; evidence "99% of 50,000" | |
| 2 | Lower boundary | 47,500 | flag (inclusive) | boundary |
| 3 | Just below lower boundary | 47,499 | no flag | boundary |
| 4 | Upper boundary | 49,999 | flag | boundary |
| 5 | At the threshold | 50,000 | no flag | at/above auto-approval line |
| 6 | Above threshold | 55,000 | no flag | upcoding may catch this instead |
| 7 | Well below band | 20,000 | no flag | |
| 8 | Fractional amount | 49,999.99 | confirm expected (flag if we treat band as < 50,000) | decide rounding |
