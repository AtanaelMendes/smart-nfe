## 2026-11-09T20:29:05Z
You are teamwork_auditor_m2_conferencia.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_auditor_m2_conferencia\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md
Study Worker handoff: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_conferencia\handoff.md

## Target Milestone
Milestone 2: M2_Conference_Table_Decimal_Recalc
Target File: `app/documentos/[id]/conferencia/page.jsx`

## Mandatory Forensic Integrity Audit Mission
Perform a rigorous forensic integrity audit of `app/documentos/[id]/conferencia/page.jsx`:
1. Static analysis:
   - Verify that all implementations are genuine and not dummy mocks, facades, or simulated passes.
   - Verify that no test results, assertions, or expected outputs are hardcoded.
   - Verify that `handleItemChange(itemId, field, value)` performs genuine immutable mapping over `prev.map(it => it.id === itemId ? ... : it)`.
   - Verify that all mathematical operations use genuine `calculateItemTotal` and `calculateInvoiceTotals` without binary floating point (`parseFloat`, `.toFixed`, `Math.round`).
   - Verify genuine snapshotting of `valorOriginal` and genuine restore implementations.
2. Runtime & Execution Verification:
   - Run the integration test suite: `node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs`
   - Run the full integration suite: `node --no-warnings --test tests/integration/*.test.mjs`
   - Run build check: `pnpm build`
3. Audit Verdict:
   - Issue **CLEAN** if implementation is 100% genuine and verified.
   - Issue **INTEGRITY VIOLATION** if any cheating, facade, or dummy logic is detected.
4. Write your full report to `c:\www\smart-nfe\.agents\teamwork\teamwork_auditor_m2_conferencia\handoff.md` and send a message when complete.
