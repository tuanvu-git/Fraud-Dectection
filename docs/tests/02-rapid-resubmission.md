# Rule 2 — rapid_resubmission

**Fires when:** the same `member_id` has another claim with the same `diagnosis_code`
whose `claim_date` is within 7 days (inclusive) of this claim's date.
**Severity weight:** 2
**Evidence must name:** the prior `claim_id`, both dates, the gap in days, the diagnosis.

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | Resubmission at 3 days | Member M1, diagnosis D1, claims on Jan 1 and Jan 4 | Later claim flagged; evidence "3 days after CLM-x" | Confirm which claim is flagged (later only?) |
| 2 | Exactly 7 days | Same member+diagnosis, Jan 1 and Jan 8 | flag (boundary is inclusive) | confirm inclusive vs exclusive |
| 3 | 8 days apart | Same member+diagnosis, Jan 1 and Jan 9 | no flag | |
| 4 | Same window, different diagnosis | Member M1, D1 on Jan 1, D2 on Jan 3 | no flag | |
| 5 | Same window, different member | M1 D1 Jan 1, M2 D1 Jan 3 | no flag | |
| 6 | Three claims in 7 days | M1 D1 on Jan 1, 3, 6 | claims 2 and 3 flagged | confirm: does claim 3 reference claim 2, claim 1, or both? |
| 7 | Same-day resubmission | M1 D1 twice on Jan 1 | no flag (gap 0 = duplicate, handled by rule 1) | keeps the two rules from double-counting the same event |
