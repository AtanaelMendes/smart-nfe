# BRIEFING — 2026-11-13T14:06:30Z

## Mission
Implement Milestone 1 (Core Allocation Engine & Repositories) for SmartNFe on branch feature/preparacoes-unificadas.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\www\smart-nfe
- State folder: c:\www\smart-nfe\.agents\teamwork\worker_m1_1\
- Original parent: f64908f7-618d-4f21-bf78-58657f1ff50c
- Milestone: Milestone 1 (Core Allocation Engine & Repositories)

## 🔒 Key Constraints
- Branch: MUST work strictly on `feature/preparacoes-unificadas`.
- Exclusive write ownership:
  - app/lib/calculations/decimal.js
  - app/lib/calculations/allocationEngine.js
  - app/lib/calculations/divisionMath.js
  - app/features/preparationRepository.js
  - app/features/preparedInvoiceRepository.js
  - tests/unit/allocationEngine.test.mjs
- Pure native BigInt arbitrary precision: ZERO third-party libraries for core arithmetic.
- Strict conservation rule: `disponivel = original - soma(alocacoes_ativas_existentes)`.
- Item identity preservation: composite key `${sourceInvoiceId}__${sourceItemId}`.
- Zero-drift cent conservation for accessory expenses (frete, seguro, outrasDespesas, desconto).
- Fiscal session isolation: volatile Map for real XMLs (`sessionPreparedInvoices`, `sessionPreparations`), no real XML in localStorage.
- 100% backward compatibility: existing 383 baseline tests must pass.
- NO CHEATING: genuine implementations, real state and math, zero hardcoded shortcuts.

## Current Parent
- Conversation ID: f64908f7-618d-4f21-bf78-58657f1ff50c
- Updated: 2026-11-13T13:54:36Z

## Task Summary
- **What to build**:
  1. `decimal.js`: vector math (decimalSum, decimalAverage, decimalMin, decimalMax, decimalClamp, decimalDistributeEqually, decimalApportionProportional, isDecimalPositive, decimalEquals, decimalGreaterThan, decimalGreaterThanOrEqual, decimalLessThan, decimalLessThanOrEqual, formatDecimal) with pure BigInt.
  2. `allocationEngine.js`: calculateAllocationMatrix, checkUnitCompatibility, calculateItemBalance, calculateItemConservationBalance, distributeEqually, distributeRemainingEqually, apportionExpenses, apportionMultiSourceExpenses, validateAllocationBatch.
  3. `preparedInvoiceRepository.js`: sessionPreparedInvoices Map for real XMLs, dual query (parentInvoiceId & sourceInvoiceIds), zero real XML leakage to localStorage.
  4. `preparationRepository.js`: dual-storage N->M preparation lifecycle repository + getActiveAllocations with composite key aggregation.
  5. `divisionMath.js`: refactored to delegate to allocationEngine while keeping 100% legacy API compatibility.
  6. `tests/unit/allocationEngine.test.mjs`: comprehensive unit test suite (35 tests covering all 9 suites).
- **Success criteria**: All 383 baseline tests + 35 new tests pass with 0 errors (total 521 passing tests across full repo); `npm run build` succeeds; zero leakage to localStorage.
- **Interface contracts**: `PROJECT.md § Interface Contracts` & `SCOPE.md`.
- **Code layout**: `PROJECT.md § Code Layout`.

## Key Decisions Made
- Used native BigInt fixed-point arithmetic adhering to NBR 5891 half-up rounding.
- Mapped composite key as `${sourceInvoiceId}__${sourceItemId}` for tracking item allocations across N origins and M destinations without fusing items from different suppliers.
- Stored real XML preparations and prepared invoices in volatile memory Map; demo invoices continue using localStorageService.
- In `divisionMath.js`, delegated calculations to `allocationEngine.js` and `decimal.js` preserving 100% identical return shapes and parameter types.

## Artifact Index
- `app/lib/calculations/decimal.js` — Decimal math library with BigInt vector & relational extensions
- `app/lib/calculations/allocationEngine.js` — Unified allocation engine
- `app/lib/calculations/divisionMath.js` — Legacy division bridge delegating to allocation engine
- `app/features/preparedInvoiceRepository.js` — Prepared invoices repository with session isolation
- `app/features/preparationRepository.js` — Preparation repository with lifecycle and active allocation tracking
- `tests/unit/allocationEngine.test.mjs` — Comprehensive 35-test unit suite

## Change Tracker
- **Files modified**:
  - `app/lib/calculations/decimal.js`: added BigInt vector and relational math
  - `app/lib/calculations/allocationEngine.js`: created unified allocation engine module
  - `app/lib/calculations/divisionMath.js`: refactored to delegate to allocationEngine
  - `app/features/preparedInvoiceRepository.js`: added sessionPreparedInvoices Map and dual queries
  - `app/features/preparationRepository.js`: created preparation repository with dual storage and getActiveAllocations
  - `tests/unit/allocationEngine.test.mjs`: created comprehensive test suite
- **Build status**: PASS (Next.js 16 build succeeded in 13.3s, 0 errors)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (538/538 tests passing, 0 failures; build: 0 errors; lint: 0 errors)
- **Lint status**: PASS (0 errors, 0 warnings in owned files)
- **Tests added/modified**: 35 new unit tests in `tests/unit/allocationEngine.test.mjs`

## Loaded Skills
- None specified
