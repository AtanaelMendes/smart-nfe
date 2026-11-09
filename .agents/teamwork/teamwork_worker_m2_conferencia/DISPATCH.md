## 2026-11-09T20:17:53Z
You are teamwork_worker_m2_conferencia.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_conferencia\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 2: M2_Conference_Table_Decimal_Recalc
Scope: Features 6, 7, 8, 9, 10, 11, 12

## Write Boundaries
You own exclusively: `app/documentos/[id]/conferencia/page.jsx`.
You may also read any file in the workspace, especially `app/lib/calculations/invoiceTotals.js` and `app/lib/calculations/decimal.js`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Explorer Recommendations
Carefully study the 3 Explorer handoff reports before implementing:
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_1\handoff.md` (itemId stability, immutable updates, filter/sort independence)
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_2\handoff.md` (Pure BigInt decimal recalculation, ancillary expenses preservation)
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_3\handoff.md` (Snapshot & restore, UI badges, keyboard navigation)

## Specific Requirements to Implement in `app/documentos/[id]/conferencia/page.jsx`
1. **Stable `itemId` in `handleItemChange`**:
   - Change signature to `handleItemChange(itemId, field, value)`.
   - Update table inputs `onChange` to pass `item.id` (or `item.itemId`) instead of visual array `index`.
   - Update state immutably: `setItems(prev => prev.map(it => it.id === itemId ? ... : it))`.
   - Ensure filtering (by NCM or description) and sorting NEVER alters another item.
2. **Pure Decimal Calculations (Zero Binary Float)**:
   - Eliminate all `parseFloat`, `.toFixed(2)`, `Math.round`, and binary float operations.
   - Use `calculateItemTotal(unitPrice, quantity)` from `app/lib/calculations/invoiceTotals.js`.
   - Support up to 4 decimal places for quantity and extended unit prices without premature rounding.
   - Validate negative, zero, and malformed inputs gracefully (show error/warning or fallback safely without NaN).
3. **Preserve Ancillary Expenses on Recalculation & Save**:
   - Use `calculateInvoiceTotals(items, invoice.totais)` from `app/lib/calculations/invoiceTotals.js`.
   - In `handleSave`, DO NOT replace `valorTotalNota` with `totalProdutos.toFixed(2)`. Conserve freight (`valorFrete`), insurance (`valorSeguro`), other expenses (`outrasDespesas`), and discounts (`valorDesconto`).
   - Call `invoiceRepository.update(id, updatedInvoice)` to persist.
4. **`valorOriginal` Snapshot, Visual Diff & Restore Actions**:
   - When an item is first modified, snapshot original values into `valorOriginal: it.valorOriginal || { quantidade: it.quantidade, valorUnitario: it.valorUnitario, valorTotal: it.valorTotal }`.
   - Display inline diff (e.g. strikethrough original value and highlighted edited value).
   - Implement `handleRestoreItem(itemId)`: reverts item to `valorOriginal` and clears `modificado`. Add restore button in the table row.
   - Implement `handleRestoreAll()`: reverts all modified items. Add bulk restore button in action bar.
5. **UI Badges & Indicators (R4)**:
   - XML Mod 55 badge in header.
   - Total products count and modified products count cards.
   - Distinct visual mode indicator: "Importação Local (Memória Temporária de Sessão)" (`isRealImport: true` or `isDemo: false`) vs "Modo Demonstração" (`isDemo: true`).
   - Comparison cards: original invoice total vs recalculated total, with freight/insurance displayed.
   - Missing data warning banner (e.g. incomplete NCM, missing CFOP).
6. **Keyboard Navigation & Stable Focus (R4)**:
   - Add `onKeyDown` navigation: Enter key moves focus vertically to the same field in the next row (`data-row-index` and `data-field`).
   - Escape key cancels editing or restores previous value.
   - Ensure focus is stable without losing input cursor during typing.

## Verification
1. Run integration tests: `node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs`
2. Run full suite: `node --no-warnings --test tests/integration/*.test.mjs`
3. Run build: `pnpm build`
4. Document all verification commands and outcomes in `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_conferencia\handoff.md`.
Send a message when complete.
