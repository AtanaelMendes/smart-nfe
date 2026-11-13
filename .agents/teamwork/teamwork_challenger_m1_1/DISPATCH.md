# Dispatch for Challenger 1 (M1)
Role: Allocation Engine & BigInt Adversarial Challenger
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\


## 2026-11-13T14:10:58Z
You are Challenger 1 for Milestone 1 (Core Allocation Engine & Repositories) of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
Path to SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md
Worker handoff report: c:\www\smart-nfe\.agents\teamwork\worker_m1_1\handoff.md

Objective:
Read ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md. Empirically verify and stress-test:
- `app/lib/calculations/decimal.js`
- `app/lib/calculations/allocationEngine.js`

Adversarial Stress Scenarios to test:
1. Cent conservation remainder stress: Apportion an indivisible amount (e.g. 100.00 across 3 destinations: 33.33, 33.33, 33.34 = 100.00; or 10.00 across 7 destinations). Verify the sum of apportioned values exactly equals the original value without losing or creating a single cent.
2. BigInt extreme precision: Quantities with 4 decimal places (e.g. 1234567.8901), unit prices with 10 decimal places, very large numbers without overflow.
3. Conservation invariant oracle: Random allocations N->M; verify that for every source item, `remainingQty === originalQty - sum(allocatedQty)` and `canSave` is false if any allocation exceeds available balance.
4. Negative quantity attack: Inject negative allocations; verify engine strictly rejects them (`hasExcess: true` or `canSave: false` or throws descriptive error).
5. Unit compatibility oracle: Validate compatible synonyms (KG/QUILOGRAMA, UN/PC/PECA, L/LITRO) and incompatible pairs (KG vs UN, L vs M).

Deliverable:
Write an empirical stress test report to `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_1\handoff.md` with explicit verdict: `APPROVE` or `FAIL`. Send a message when complete.
