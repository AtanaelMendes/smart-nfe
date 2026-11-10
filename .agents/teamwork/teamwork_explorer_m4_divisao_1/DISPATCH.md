## 2026-11-09T21:10:19Z
You are teamwork_explorer_m4_divisao_1.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_1\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 4: M4_Invoice_Splitting_Balance_Conservation
Scope: Features 16 & 18 (Splitting Pure Decimal Engine & Strict Validation Traps)

## Your Mission
1. Investigate `app/documentos/[id]/divisao/page.jsx`, `app/lib/calculations/divisionMath.js`, and `tests/integration/flow_c_division_balances.test.mjs`.
2. Locate all binary floating-point operations in `divisao/page.jsx` and `divisionMath.js` (`parseFloat`, `Math.floor`, `Math.round`, `.toFixed`, native `*` or `+`).
3. Detail how to migrate all quantity and monetary calculations to pure BigInt decimal operations with up to 4 decimal places.
4. Analyze strict validation traps:
   - Block allocated quantity > original quantity (`excess`).
   - Reject negative or non-numeric inputs.
   - Update `divisionMath.js` and `divisao/page.jsx` to ensure `canSave: false` whenever there are remaining unallocated balances (`hasRemaining: true`) or excess allocations.
5. Provide step-by-step implementation guidance for the Worker. Do NOT edit codebase source files directly.
6. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_1\handoff.md` and send a message when complete.
