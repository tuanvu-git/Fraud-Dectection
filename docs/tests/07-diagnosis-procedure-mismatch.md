# Rule 7 — diagnosis_procedure_mismatch

**Fires when:** the claim's `diagnosis_code` is present in the valid diagnosis–procedure
mapping, and **none** of the claim's `procedure_codes` are in that diagnosis's allowed set.
**Severity weight:** 2
**Evidence must name:** the diagnosis code, the billed procedure code(s), and that they
are not clinically associated.

## Open decisions

- If the diagnosis code is **not in the mapping at all**, do we skip (no flag) rather than
  guess? (proposed: skip — mapping is incomplete by design)
- Flag if *any* procedure mismatches, or only if *all* do? (spec says "procedure not
  clinically associated" — proposed: flag when none of the procedures match)

## Mapping (config, ≥ 10 pairs) — draft

| Diagnosis | Valid procedures |
|---|---|
| E11.9 (type 2 diabetes) | P-D01, P-D02 |
| I10 (hypertension) | P-H01, P-H02 |
| J45.909 (asthma) | P-A01, P-A02 |
| M54.5 (low back pain) | P-B01, P-B02, P-B03 |
| K21.9 (GERD) | P-G01, P-G02 |
| N39.0 (UTI) | P-U01, P-U02 |
| J02.9 (pharyngitis) | P-P01 |
| S93.4 (ankle sprain) | P-S01, P-S02 |
| H66.9 (otitis media) | P-O01 |
| F41.9 (anxiety) | P-F01, P-F02 |

## Proposed test cases

| # | Case | Setup | Expected result | Notes |
|---|---|---|---|---|
| 1 | Clear mismatch | diagnosis E11.9, procedure_codes [P-S01] (ankle) | flag; evidence names E11.9 and P-S01 | |
| 2 | Valid pairing | diagnosis E11.9, [P-D01] | no flag | |
| 3 | One of several matches | diagnosis M54.5, [P-B02, P-S01] | no flag | at least one valid |
| 4 | All mismatch | diagnosis I10, [P-A01, P-G01] | flag | none valid |
| 5 | Diagnosis not in mapping | diagnosis Z99.9, [P-X01] | no flag | skip unknown diagnosis |
| 6 | Empty procedure_codes | diagnosis E11.9, [] | confirm: no flag (nothing billed) vs flag | decision needed |
| 7 | Procedure not in any mapping | diagnosis E11.9, [P-UNKNOWN] | flag (not associated with E11.9) | |
