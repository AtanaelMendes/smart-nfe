# BRIEFING — 2026-11-09T21:30:00Z

## Mission
Implement Milestone 4: M4_Invoice_Splitting_Balance_Conservation (Features 16, 17, 18, 19) in `divisionMath.js` and `app/documentos/[id]/divisao/page.jsx` with strict Decimal arithmetic, exact division, ancillary expense apportionment, and balance conservation.

## 🔒 My Identity
- Archetype: implementer
- Roles: implementer, qa, specialist
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m4_divisao\
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: M4_Invoice_Splitting_Balance_Conservation

## 🔒 Key Constraints
- Write boundaries: ONLY `app/lib/calculations/divisionMath.js` and `app/documentos/[id]/divisao/page.jsx`.
- Zero IEEE-754 float drift: pure BigInt / Decimal arithmetic (`decimalMath.js`), no parseFloat, Math.floor, Math.round, .toFixed.
- Strict validation: `canSave` requires `notes.length >= 2 && !hasExcess && !hasRemaining`.
- Distribute equally: floor division `piece = totalBigInt / BigInt(numNotes)`, last note absorbs remainder difference.
- Expense apportionment: prorate freight, insurance, other, discount proportionally to product totals, last note absorbs residual cents.
- No dummy/facade implementations, no hardcoded test values.

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T21:20:00Z

## Task Summary
- **What to build**: Division math and UI page for invoice splitting with strict balance conservation, zero float drift, expense apportionment, and preparedInvoice persistence.
- **Success criteria**: Tests in `tests/integration/flow_c_division_balances.test.mjs` and all integration tests pass, `pnpm build` succeeds, exact cent and quantity conservation.
- **Interface contracts**: PROJECT.md, preparedInvoiceRepository, invoiceRepository, decimalMath.js.
- **Code layout**: `app/lib/calculations/divisionMath.js` and `app/documentos/[id]/divisao/page.jsx`.

## Key Decisions Made
- Implemented `distributeEqually` using pure BigInt integer division (`scaledTotal / bigN`) with residual compensation on the last note (`baseInt + remInt`), guaranteeing zero negative quantities and exact conservation.
- Implemented `apportionAllInvoiceExpenses` prorating freight, insurance, other expenses, and discount proportionally to note product totals, with exact residual absorption on the last active note (and even split if product total is zero).
- In `divisionMath.js`: guarded `calculateRemainingBalance` against negative allocations (`hasNegative` flags `status: 'excess'`), and updated `validateDivisionBatch` to enforce `canSave = notes.length >= 2 && !hasExcess && !hasRemaining && isBalanced`.
- In `app/documentos/[id]/divisao/page.jsx`: completely eliminated `parseFloat`, `Math.floor`, `Math.round`; wired up item-level equal split action ("÷ Dividir") and bulk remaining balance action ("Dividir Saldos Restantes"); wired `canFinalize` to `batchResult.canSave`; implemented full persistence in `handleFinalizeDivision` with prorated expenses, SEFAZ totals, prepared invoice records, and parent invoice status `'dividida'`.

## Artifact Index
- `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m4_divisao\DISPATCH.md` — Dispatch requirements
- `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m4_divisao\progress.md` — Liveness and progress tracking
- `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m4_divisao\handoff.md` — Final handoff report

## Change Tracker
- **Files modified**:
  - `app/lib/calculations/divisionMath.js`: pure BigInt equal division, expense apportionment, strict validation with negative guards.
  - `app/documentos/[id]/divisao/page.jsx`: pure decimal handlers, row-level and bulk balance division, strict blocker on `canSave`, full persistence in preparedInvoiceRepository and invoiceRepository.
- **Build status**: `pnpm build` passed with code 0 (all pages compiled including `/documentos/[id]/divisao`).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: 112/112 tests passed (11 in flow_c, 43 integration, 69 tier1/tier5).
- **Lint status**: 0 errors, 0 warnings in modified files.
- **Tests added/modified**: Covered existing integration and adversarial suites without drift.

## Loaded Skills
None loaded from orchestrator.
