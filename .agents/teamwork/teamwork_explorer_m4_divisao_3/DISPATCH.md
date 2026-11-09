## 2026-11-09T21:10:37Z
You are teamwork_explorer_m4_divisao_3.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_3\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 4: M4_Invoice_Splitting_Balance_Conservation
Scope: Feature 19 (Ancillary Expense Apportionment & Prepared Notes Persistence)

## Your Mission
1. Investigate `app/documentos/[id]/divisao/page.jsx`, `app/features/preparedInvoiceRepository.js`, and `app/lib/calculations/invoiceTotals.js`.
2. Analyze how split notes are prepared and finalized in `handleFinalizeDivision`:
   - Parent invoice ancillary expenses (`valorFrete`, `valorSeguro`, `outrasDespesas`, `valorDesconto`): how are they prorated or conserved across destination notes?
   - Ensure the sum of freight/insurance/expenses across the generated split invoices reconciles with the original invoice totals.
3. Analyze note management (adding and removing destination notes) and ensure validation rules and saldos adjust dynamically.
4. Verify persistence contract with `preparedInvoiceRepository.js` and `invoiceRepository.js`.
5. Provide step-by-step implementation guidance for the Worker. Do NOT edit codebase source files directly.
6. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_3\handoff.md` and send a message when complete.
