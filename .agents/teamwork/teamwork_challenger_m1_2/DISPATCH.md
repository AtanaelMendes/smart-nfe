# Dispatch for Challenger 2 (M1)
Role: Storage Isolation & Concurrency Adversarial Challenger
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_2\


## 2026-11-13T14:11:07Z
You are Challenger 2 for Milestone 1 (Core Allocation Engine & Repositories) of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_2\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
Path to SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md
Worker handoff report: c:\www\smart-nfe\.agents\teamwork\worker_m1_1\handoff.md

Objective:
Read ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md. Empirically verify and stress-test:
- `app/features/preparedInvoiceRepository.js`
- `app/features/preparationRepository.js`

Adversarial Stress Scenarios to test:
1. Real XML Leakage Attack: Create real imported invoice in `invoiceRepository` (`isRealImport: true` or `isDemo: false`), create prepared invoices and preparations deriving from it. Inspect `localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES)` and `localStorageService.load('smartnfe_preparations_v1')`. Assert with 100% strictness that ZERO real XML data, IDs, or lines were written to localStorage.
2. Memory Session Isolation: Assert that real XML data is accessible in `sessionPreparedInvoices` and `sessionPreparations` in memory, but completely disappears on `resetDemoData()` or session purge.
3. Concurrency Stress: Execute 20 concurrent creation/update/delete operations against `preparationRepository` and verify no race conditions, corrupted states, or unhandled Promise rejections occur (`withMutationLock`).
4. Lifecycle Conservation State: Verify that active preparations correctly consume available balances via `getActiveAllocations`, and transitioning a preparation to `'cancelled'` immediately releases its allocated quantities.

Deliverable:
Write an empirical stress test report to `c:\www\smart-nfe\.agents\teamwork\teamwork_challenger_m1_2\handoff.md` with explicit verdict: `APPROVE` or `FAIL`. Send a message when complete.
