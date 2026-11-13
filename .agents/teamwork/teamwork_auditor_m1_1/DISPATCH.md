# Dispatch for Forensic Auditor (M1)
Role: Integrity Forensic Auditor
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_auditor_m1_1\


## 2026-11-13T14:11:17Z
You are the Forensic Auditor for Milestone 1 (Core Allocation Engine & Repositories) of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_auditor_m1_1\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
Path to SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md
Worker handoff report: c:\www\smart-nfe\.agents\teamwork\worker_m1_1\handoff.md

Objective:
Perform a rigorous forensic integrity audit of all files delivered for Milestone 1:
- `app/lib/calculations/decimal.js`
- `app/lib/calculations/allocationEngine.js`
- `app/lib/calculations/divisionMath.js`
- `app/features/preparedInvoiceRepository.js`
- `app/features/preparationRepository.js`
- `tests/unit/allocationEngine.test.mjs`

Audit Checks:
1. Anti-cheating & No Facade check: Verify that calculations are genuine mathematical implementations, NOT dummy facades, hardcoded return values, or shortcuts tailored to pass specific test cases.
2. Zero external dependencies check: Verify that no third-party math packages (bignumber.js, decimal.js, mathjs, etc.) were installed or imported.
3. Conservation integrity check: Verify that `disponível = original - soma(alocações ativas)` is strictly enforced in code.
4. Storage leakage check: Verify that `sessionPreparedInvoices` and `sessionPreparations` truly isolate real XML data from `localStorageService`.
5. Non-circumvention check: Verify that core requirements from ORIGINAL_REQUEST.md are authentically implemented.

Deliverable:
Write a forensic audit report to `c:\www\smart-nfe\.agents\teamwork\teamwork_auditor_m1_1\handoff.md` with explicit binary verdict: `CLEAN` or `INTEGRITY VIOLATION`. Send a message when complete.
