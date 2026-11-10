## 2026-11-09T20:38:32Z
You are teamwork_explorer_m3_validacao_2.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_2\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 3: M3_Validation_Safety_Assistant_Undo
Scope: Feature 14 (Undo Mechanism & Automatic Re-validation)

## Your Mission
1. Investigate `app/documentos/[id]/validacao/page.jsx`, `app/features/invoiceRepository.js` (`updateItem`), and `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`.
2. Analyze how previous values are currently lost when fixes are applied.
3. Design an `undoStack` in state:
   - Structure of undo entries: `{ id, issueId, itemId, campo, valorAnterior, valorNovo, timestamp }`.
   - Recording undo entry immediately prior to applying any fix (single or batch).
   - Implement `handleUndo(entry)`: reverts `invoiceRepository.updateItem(id, itemId, { [campo]: valorAnterior })`, removes entry from stack, notifies via toast notification, and automatically re-executes `loadData()` to re-run fiscal validations.
   - Design UI for Undo: button in toast and a visible "Desfazer Última Alteração" / "Histórico de Alterações" button or banner in the interface.
4. Detail how multi-step undos or bulk undos should work without breaking state consistency.
5. Provide step-by-step implementation guidance for the Worker. Do NOT edit codebase source files directly.
6. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_2\handoff.md` and send a message when complete.
