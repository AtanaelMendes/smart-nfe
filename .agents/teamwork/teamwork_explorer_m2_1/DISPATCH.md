## 2026-11-04T15:13:27Z
You are an exploration agent (teamwork_explorer).
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\
Caller conversation ID: 3aeeebdd-68a6-49e6-8f40-494114a9f1f7

MANDATORY INPUTS:
- c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
- c:\www\smart-nfe\PROJECT.md
- c:\www\smart-nfe\.agents\teamwork\sub_orch_m2_core\SCOPE.md
- c:\www\smart-nfe\.agents\teamwork\teamwork_spec_miner_survey_2\survey_specs.md

CRITICAL USER CONSTRAINT:
The dev server is active at http://localhost:3000/dashboard. DO NOT run `pnpm build` or `pnpm dev`.

OBJECTIVE:
Formulate the exact architecture and code strategy for the Decimal Calculation Engine in `app/lib/calculations/`:
1. `decimal.js`:
   - Pure string decimal arithmetic (`decimalAdd`, `decimalSubtract`, `decimalMultiply`, `decimalDivide`, `roundDecimal`).
   - Must avoid binary floating point imprecision (e.g. 0.1 + 0.2 !== 0.3 or 0.001 * 333.3333).
   - Support arbitrary decimal scales (default 2 for currency, 4 for fiscal unit prices/quantities).
   - Handle negative values, zero values, and invalid input fallbacks gracefully.
2. `invoiceTotals.js`:
   - `calculateItemTotal(unitPriceStr, quantityStr)` -> string (2 decimal places).
   - `calculateInvoiceTotals(items, discountStr, freightStr, insuranceStr)` -> `{ totalProducts, totalDiscount, totalFreight, totalInsurance, totalInvoice }` (all strings with 2 decimals).
3. `divisionMath.js`:
   - `calculateRemainingBalance(originalQtyStr, allocatedQtyArray)` -> `{ balanceStr, status: 'ok' | 'remaining' | 'excess' }`.
   - `validateDivisionBatch(originalItems, destinationNotes)` -> detailed balance report.

OUTPUT:
- Write full strategy to: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\strategy_calculations.md
- Write standard handoff to: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_1\handoff.md
- Notify caller via send_message.
