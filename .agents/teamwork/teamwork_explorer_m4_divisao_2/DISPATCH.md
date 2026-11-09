## 2026-11-09T21:10:28Z
You are teamwork_explorer_m4_divisao_2.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_2\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 4: M4_Invoice_Splitting_Balance_Conservation
Scope: Feature 17 (Remaining Balance Allocation & Equal Division Math)

## Your Mission
1. Investigate `app/documentos/[id]/divisao/page.jsx`, `app/lib/calculations/divisionMath.js`, and `tests/integration/flow_c_division_balances.test.mjs`.
2. Analyze the current balance allocation actions:
   - "Distribuir saldo restante para Nota X": allocates 100% of the remaining balance of an item to destination note X.
   - "Dividir saldo igualmente entre notas": distributes remaining balance equally among notes with 4-decimal precision.
3. Formulate the exact BigInt division algorithm for equal distribution:
   - Example: 10.0000 units divided among 3 notes = 3.3333, 3.3333, 3.3334. The residual must be assigned to the last (or first) note so that the exact sum of allocated quantities equals the original quantity with 0.0000 remainder.
4. Ensure zero floating point drift and seamless UI interaction for item and bulk actions.
5. Provide step-by-step implementation guidance for the Worker. Do NOT edit codebase source files directly.
6. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m4_divisao_2\handoff.md` and send a message when complete.
