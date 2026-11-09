## 2026-11-09T20:08:58Z
You are teamwork_explorer_m2_conferencia_2.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_2\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 2: M2_Conference_Table_Decimal_Recalc
Scope: Features 8 & 9: Pure Decimal Recalculation and Ancillary Expense Preservation.

## Your Mission
1. Investigate `app/documentos/[id]/conferencia/page.jsx`, `app/lib/calculations/decimal.js`, and `app/lib/calculations/invoiceTotals.js`.
2. Inspect all mathematical operations in `conferencia/page.jsx`. Locate all occurrences of binary floating-point (`parseFloat`, `.toFixed(2)`, `Math.round`, `Math.floor`, native `*` or `+`) used in item editing, item total calculation, and invoice-wide totals.
3. Formulate the exact integration strategy using `calculateItemTotal(unitPrice, qty)` and `calculateInvoiceTotals(items, totals)` from `app/lib/calculations/`.
4. Analyze how quantities with up to 4 decimal places and extended unit prices must be handled without premature rounding.
5. Detail how to validate negative quantities, zeros, and non-numeric inputs gracefully.
6. Detail how ancillary expenses (`valorFrete`, `valorSeguro`, `outrasDespesas`, `valorDesconto`) must be preserved and reconciled with product totals, preventing the replacement of the total with a simple sum of products.
7. Provide clear, step-by-step implementation guidance for the Worker. Do NOT edit codebase source files directly.
8. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_2\handoff.md` and send a message back when complete.
