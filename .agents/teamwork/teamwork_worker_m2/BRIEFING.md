# BRIEFING — 2026-11-04T15:43:00Z

## Mission
Implement Milestone 2: Core Domain Services & Calculations (BigInt decimal math, invoice totals, division math, versioned storage, async repositories, formatters fix, calibrated mocks, DataTable guard, test suite).

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa, specialist
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2\
- Original parent: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Milestone: Milestone 2 (Core Domain Services & Calculations)

## 🔒 Key Constraints
- Never cheat or hardcode outputs; maintain genuine domain logic and state.
- External user dev server is running on http://localhost:3000/dashboard.
- DO NOT run build commands (`pnpm build`, `npm run build`).
- DO NOT start dev servers (`pnpm dev`, `npm run dev`).
- Strictly follow SCOPE.md and explorer strategies.
- Verify using `node --test` and ESLint.

## Current Parent
- Conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7
- Updated: 2026-11-04T15:43:00Z

## Task Summary
- **What to build**: M2 calculation engine (`decimal.js`, `invoiceTotals.js`, `divisionMath.js`), persistence layer (`localStorageService.js`, `invoiceRepository.js`, `preparedInvoiceRepository.js`), formatting improvements (`numbers.js`, fixes in `currency.js` and `dates.js`), mock calibration in `mockInvoices.js`, guard in `DataTable.jsx`, and comprehensive M2 test suite.
- **Success criteria**: All tests in `tests/tier1/m2_domain.test.mjs` and all existing tests pass; ESLint passes clean with 0 errors and 0 warnings; dev server remains healthy.
- **Interface contracts**: `c:\www\smart-nfe\.agents\teamwork\sub_orch_m2_core\SCOPE.md`
- **Code layout**: `c:\www\smart-nfe\PROJECT.md`

## Key Decisions Made
- Adopted exact BigInt scaling with string parsing and ABNT NBR 5891 Half-Up rounding for arbitrary precision decimal arithmetic.
- Implemented multi-tier storage engine (window.localStorage -> globalThis.localStorage -> in-memory fallback) to ensure seamless execution in both browser and Node.js environments.
- Maintained Promise-based async contracts on repositories (`invoiceRepository` and `preparedInvoiceRepository`).
- Wrapped `safeData` in `useMemo` in `DataTable.jsx` to satisfy React hook rules without warnings.
- Updated 5 bug-snapshot assertions in `m1_adversarial_stress.test.mjs` to reflect the corrected behaviors.

## Artifact Index
- `DISPATCH.md`: Incoming instructions.
- `progress.md`: Liveness heartbeat and step tracking.
- `handoff.md`: Handoff report upon completion.
- `tests/tier1/m2_domain.test.mjs`: Milestone 2 test suite (43 tests).

## Change Tracker
- **Files modified/created**:
  - `app/lib/calculations/decimal.js`: BigInt decimal arithmetic engine.
  - `app/lib/calculations/invoiceTotals.js`: Line and header totals aggregation.
  - `app/lib/calculations/divisionMath.js`: Remaining balance and multi-destination batch validation.
  - `app/lib/calculations/index.js`: Barrel export.
  - `app/lib/storage/localStorageService.js`: Versioned persistence (1.0.0) with memory fallback.
  - `app/lib/storage/index.js`: Barrel export.
  - `app/features/invoiceRepository.js`: Async Promise contract, dynamic fiscal rules, rollback snapshot.
  - `app/features/preparedInvoiceRepository.js`: Async Promise contract for split invoices.
  - `app/features/index.js`: Barrel export.
  - `app/lib/formatters/numbers.js`: formatQuantity, formatDecimal, parseDecimal.
  - `app/lib/formatters/currency.js`: parseBRL fixed for BRL and dot-decimal without 100x inflation.
  - `app/lib/formatters/dates.js`: formatDateBR and formatDateTimeBR fixed for strict calendar limits without rollover.
  - `app/lib/formatters/index.js`: Barrel export.
  - `app/lib/data/mockInvoices.js`: Calibrated demo-02 (25 items unit*qty=total, sum=148.750,00) and demo-05 (item 15=28.120,00, sum=342.000,00 matching prep-01 and prep-02).
  - `app/components/table/DataTable.jsx`: safeData guarded with useMemo against data={null}.
  - `tests/tier1/m2_domain.test.mjs`: Full M2 domain test suite (43 tests).
  - `tests/tier5/m1_adversarial_stress.test.mjs`: Updated 5 bug assertions to expect fixed behavior.
- **Build status**: 112/112 tests passing across 27 suites (exit code 0).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: PASS (112 tests passed, 0 failed, 0 skipped).
- **Lint status**: PASS (0 errors, 0 warnings).
- **Tests added/modified**: 43 new tests in `tests/tier1/m2_domain.test.mjs`; 5 assertions updated in `tests/tier5/m1_adversarial_stress.test.mjs`.

## Loaded Skills
- None specified by user.
