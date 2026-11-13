# Scope: Milestone 1 — Core Allocation Engine & Repositories

## Mission
Implement Milestone 1 per PROJECT.md on branch `feature/preparacoes-unificadas`:
- Feature 3: BigInt Decimal Calculation Extensions (`app/lib/calculations/decimal.js`)
- Feature 4: Unified Allocation Engine (`app/lib/calculations/allocationEngine.js`)
- Feature 5: Storage Leakage Fix in `preparedInvoiceRepository.js` (`sessionPreparedInvoices = new Map()`)
- Feature 6: Preparation Repository (`app/features/preparationRepository.js`)
- Feature 7: Legacy Division Refactoring (`app/lib/calculations/divisionMath.js` delegating to `allocationEngine.js`)

## Code Layout Ownership (Exclusive)
- `app/lib/calculations/decimal.js`
- `app/lib/calculations/allocationEngine.js`
- `app/lib/calculations/divisionMath.js`
- `app/features/preparationRepository.js`
- `app/features/preparedInvoiceRepository.js`
- `tests/unit/allocationEngine.test.mjs` (or unit tests for M1)

## Key Constraints & Rules
- Branch: MUST work strictly on `feature/preparacoes-unificadas`.
- ZERO third-party packages for core arithmetic: use pure native `BigInt`.
- Conservation rule: `disponível = original - soma das alocações ativas`.
- Composite key preservation: `sourceInvoiceId + sourceItemId`.
- Real XML data retention strictly in volatile memory (`sessionPreparedInvoices = new Map()`, `sessionPreparations = new Map()`). No real XMLs in localStorage!
- 100% backward compatibility: existing 383 tests must continue passing.
- Run full iteration loop: Explorer(s) -> Worker -> Reviewer(s) -> Challenger(s) -> Forensic Auditor -> Gate.
- DO NOT CHEAT: zero tolerance for hardcoded tests, dummy facades, or shortcuts.

## References
- `c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\www\smart-nfe\.agents\teamwork\PROJECT.md`
- `c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\report.md`
