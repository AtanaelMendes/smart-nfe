## 2026-11-04T15:24:21Z
You are an implementation worker agent (teamwork_worker).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INPUTS:
Read these before writing code:
1. c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
2. c:\www\smart-nfe\PROJECT.md
3. c:\www\smart-nfe\.agents\teamwork\sub_orch_m2_core\SCOPE.md
4. c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\strategy_calculations.md (decimal.js, invoiceTotals.js, divisionMath.js)
5. c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_2\strategy_storage_repositories.md (localStorageService.js, invoiceRepository.js, preparedInvoiceRepository.js)
6. c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_3\strategy_formatters_mocks_tests.md (numbers.js, currency/dates fixes, mock calibrations, DataTable fix, test suite)

CRITICAL USER CONSTRAINT:
The project is running at http://localhost:3000/dashboard (active dev server run externally by user).
DO NOT run build commands (`pnpm build`, `npm run build`) and DO NOT start dev servers (`pnpm dev`, `npm run dev`), to avoid port conflicts or environment freezes.

OBJECTIVE & OWNED FILES:
Implement Milestone 2 (Core Domain Services & Calculations) completely:
1. `app/lib/calculations/decimal.js`: String-based decimal arithmetic with BigInt scaling, exact ABNT NBR 5891 Half-Up rounding, arbitrary precision.
2. `app/lib/calculations/invoiceTotals.js`: `calculateItemTotal(unitPriceStr, qtyStr)` and `calculateInvoiceTotals(items, discount, freight, insurance)`.
3. `app/lib/calculations/divisionMath.js`: `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)` and `validateDivisionBatch(originalItems, destinationNotes)`.
4. `app/lib/calculations/index.js`: Barrel export of calculation utilities.
5. `app/lib/storage/localStorageService.js`: Versioned persistence with `STORAGE_SCHEMA_VERSION = "1.0.0"`, multi-tier backend with MemoryStorage fallback, `save`, `load`, `reset`, `resetAll`.
6. `app/features/invoiceRepository.js`: Async Promise contract (`list`, `findById`, `update`, `updateItem`, `getValidationIssues`, `resetDemoData`).
7. `app/features/preparedInvoiceRepository.js`: Async Promise contract (`list`, `findById`, `create`, `delete`, `resetDemoData`).
8. `app/lib/formatters/numbers.js`: `formatQuantity`, `formatDecimal`, `parseDecimal`.
9. `app/lib/formatters/currency.js`: Fix `parseBRL` to support both Brazilian format (`1.250,50`) and decimal point format (`1250.50`) without 100x inflation.
10. `app/lib/formatters/dates.js`: Fix `formatDateBR` and `formatDateTimeBR` to strictly validate Gregorian calendar limits without rollover.
11. `app/lib/formatters/index.js`: Export all formatters.
12. `app/lib/data/mockInvoices.js`: Calibrate `demo-02` (unit * qty = item total for all 25 items, total = 148.750,00), calibrate `demo-05` (item 15 = 28.120,00, sum = 342.000,00 matching prep-01 and prep-02), and ensure `demo-04` has clear simulated validation issue annotations.
13. `app/components/table/DataTable.jsx`: Add `const safeData = Array.isArray(data) ? data : []` to protect against `data={null}`.
14. `tests/tier1/m2_domain.test.mjs`: Create full M2 domain test suite.
15. `tests/tier5/m1_adversarial_stress.test.mjs`: Update the 4 assertions that tested the old M1 bugs (lines 144, 500, 590, 665) to reflect the corrected behavior so all tests pass.

VERIFICATION REQUIREMENTS:
Run these commands and document exact outputs in your handoff report:
1. `node --no-warnings --test tests/tier1/m2_domain.test.mjs`
2. `node --no-warnings --test tests/**/*.test.mjs`
3. `npx eslint app/lib/calculations/ app/lib/storage/ app/features/ app/lib/formatters/ app/lib/data/mockInvoices.js app/components/table/DataTable.jsx`
4. `node -e "fetch('http://localhost:3000/dashboard').then(r => r.text()).then(t => console.log('HTTP 200 length:', t.length, 'Modo Demo:', t.includes('Modo Demonstração')))"`

OUTPUT:
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2\handoff.md
- When done, send message to caller (3aeeebdd-68a6-49e6-8f40-494114a9f1f7) with summary and test results.
