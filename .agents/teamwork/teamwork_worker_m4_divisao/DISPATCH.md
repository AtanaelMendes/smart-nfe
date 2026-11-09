## 2026-11-09T21:19:15Z

You are teamwork_worker_m4_divisao.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m4_divisao\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 4: M4_Invoice_Splitting_Balance_Conservation
Scope: Features 16, 17, 18, 19

## Write Boundaries
You own exclusively:
1. `app/lib/calculations/divisionMath.js`
2. `app/documentos/[id]/divisao/page.jsx`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Study Explorer Reports Before Implementing
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_1\handoff.md` (Decimal engine, validation traps, canSave: false when remaining balances exist)
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_2\handoff.md` (Exact BigInt equal division algorithm, floor division + remainder to last note, zero float drift)
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_3\handoff.md` (Ancillary expense apportionment, persistence contract in preparedInvoiceRepository, add/remove note controls)

## Specific Implementation Instructions

### 1. `app/lib/calculations/divisionMath.js`:
- Eliminate all IEEE 754 binary floating-point operations (`parseFloat`, `Math.floor`, `Math.round`, `.toFixed`, native `*` or `/`).
- In `validateDivisionBatch(items, notes)`:
  - Update `canSave`: require `notes.length >= 2 && !hasExcess && !hasRemaining`!
  - If `hasRemaining === true` (unallocated quantities exist), `canSave` MUST be `false`!
  - Block negative and invalid inputs (`isDecimalNegative`).
- Implement `distributeEqually(originalQtyStr, numNotes, scale = 4)` using pure BigInt integer division:
  - `piece = totalBigInt / BigInt(numNotes)`
  - Distribute `piece` to the first `numNotes - 1` notes.
  - The last note absorbs the exact remaining difference: `originalQtyStr - sum(pieces)`.
  - Guarantees `sum(pieces) === originalQtyStr` with zero remainder and zero floating point drift.
- Implement `apportionAllInvoiceExpenses(parentTotals, notesWithProducts)`:
  - Prorates `valorFrete`, `valorSeguro`, `outrasDespesas`, and `valorDesconto` across destination notes proportionally to product value (or evenly if product values are zero).
  - Last note absorbs any residual cent fractions so $\sum \text{expenses}_i = \text{parentExpense}$ and $\sum \text{totalNota}_i = \text{parentTotalNota}$ with zero cent drift.

### 2. `app/documentos/[id]/divisao/page.jsx`:
- Eliminate all `parseFloat`, `Math.floor`, `Math.round` from `handleDistributeEqually` and all quantity handlers.
- Wire up item-level balance actions:
  - "Distribuir saldo deste item para Nota X": allocates 100% of remaining balance of that item to destination note X.
  - "Dividir saldo deste item igualmente": distributes remaining balance of that item equally across notes using `distributeEqually`.
- Wire up global "Distribuir Igualmente": distributes all items across notes using `distributeEqually`.
- Strict finalization blocker: disable the "Finalizar Divisão" button when `!batchValidation.canSave` (i.e. whenever there are remaining unallocated balances or excesses). Display clear feedback banner explaining what is pending.
- In `handleFinalizeDivision`:
  - Calculate apportioned ancillary expenses using `apportionAllInvoiceExpenses`.
  - Save each note via `preparedInvoiceRepository.create` with full `totais` object and flat fields.
  - Update parent invoice status to `'dividida'` via `invoiceRepository.update(id, { status: 'dividida' })`.
  - Ensure dynamic note addition (`handleAddNote`) and removal (`handleRemoveNote`, minimum 2 notes) dynamically recompute saldos.

## Verification
1. Run integration tests: `node --no-warnings --test tests/integration/flow_c_division_balances.test.mjs`
2. Run full suite: `node --no-warnings --test tests/integration/*.test.mjs`
3. Run build check: `pnpm build`
4. Document all verification commands and outcomes in `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m4_divisao\handoff.md`.
Send a message when complete.
