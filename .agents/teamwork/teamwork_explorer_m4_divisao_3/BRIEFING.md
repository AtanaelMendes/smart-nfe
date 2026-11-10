# BRIEFING — 2026-11-09T21:17:00Z

## Mission
Investigate Feature 19 (Ancillary Expense Apportionment & Prepared Notes Persistence) in invoice splitting for Milestone 4.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_3\
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: M4_Invoice_Splitting_Balance_Conservation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Analyze ancillary expense apportionment (freight, insurance, expenses, discount) across destination notes
- Analyze note management (add/remove destination notes) and dynamic balance adjustments
- Verify persistence contract with preparedInvoiceRepository.js and invoiceRepository.js
- Provide step-by-step guidance for Worker
- Produce 5-component handoff.md and send message to parent

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T21:17:00Z

## Investigation State
- **Explored paths**:
  - `app/documentos/[id]/divisao/page.jsx`
  - `app/features/preparedInvoiceRepository.js`
  - `app/features/invoiceRepository.js`
  - `app/lib/calculations/invoiceTotals.js`
  - `app/lib/calculations/divisionMath.js`
  - `app/lib/calculations/decimal.js`
  - `app/notas-preparadas/page.jsx`
  - `tests/integration/flow_c_division_balances.test.mjs`
  - `app/lib/data/mockInvoices.js`
- **Key findings**:
  - `handleFinalizeDivision` currently ignores all parent invoice ancillary expenses (`valorFrete`, `valorSeguro`, `outrasDespesas`, `valorDesconto`), only saving product totals (`totalNota`), causing total loss of freight, insurance, and expenses on split notes.
  - Formulated the exact zero-drift BigInt apportionment algorithm `apportionAllInvoiceExpenses` where the last active note absorbs the residual cents, ensuring $\sum \text{frete}_i = \text{origFrete}$, $\sum \text{seguro}_i = \text{origSeguro}$, $\sum \text{outras}_i = \text{origOutras}$, $\sum \text{desconto}_i = \text{origDesconto}$, and $\sum \text{totalNota}_i = \text{origTotalNota}$.
  - Note management dynamic behavior verified: `handleAddNote` dynamically expands target notes, while `handleRemoveNote` (enforcing $\ge 2$ notes) releases quantities back to `Saldo Restante`, immediately flagging `hasRemaining: true` and disabling finalization (`canFinalize = false`).
  - Persistence contracts verified: `preparedInvoiceRepository.create` requires full `totais` object and flat properties; `invoiceRepository.update` sets `status: 'dividida'` without mutating parent line items or totals.
  - `app/notas-preparadas/page.jsx` XML generation has hardcoded `0.00` for `vFrete`, `vSeg`, `vDesc`, `vOutro`; should be wired to read `note.totais` / `note.valorFrete`.
- **Unexplored areas**: None within Feature 19 scope.

## Key Decisions Made
- Export `apportionExpenses` and `apportionAllInvoiceExpenses` from `app/lib/calculations/divisionMath.js`.
- In `handleFinalizeDivision`, integrate `apportionAllInvoiceExpenses` and `calculateInvoiceTotals` to generate complete `totais` for every prepared note.
- Guarantee non-negative residual allocation by assigning the exact remaining cents to the last active note.

## Artifact Index
- DISPATCH.md — Initial dispatch prompt
- BRIEFING.md — Situational awareness
- progress.md — Liveness heartbeat
- handoff.md — Complete 5-component analysis and Worker implementation guide
