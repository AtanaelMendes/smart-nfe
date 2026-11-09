## 2026-11-09T20:38:25Z
You are teamwork_explorer_m3_validacao_1.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_1\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 3: M3_Validation_Safety_Assistant_Undo
Scope: Feature 13 (Explicit Fiscal Fix Confirmation Modal)

## Your Mission
1. Investigate `app/documentos/[id]/validacao/page.jsx` and `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`.
2. Analyze current implementation of `handleApplyFix` (which currently modifies data on 1-click silently without confirmation).
3. Design an explicit confirmation modal before applying any fix:
   - Expose current value (`valorAtual`), proposed value (`valorProposto`), field label, item number/description, and the rule origin/justification (`origemRegra`).
   - Distinguish mechanical fixes (calculation discrepancies) from sensitive fiscal modifications (NCM, CFOP, tax) with clear visual warning badges.
   - Require explicit user confirmation ("Confirmar Alteração") and provide clear cancel action ("Cancelar").
   - Ensure the modal works seamlessly with accessible dialogs (`Dialog.jsx` or inline modal).
4. Provide step-by-step implementation guidance and sample JSX/state structures for the Worker. Do NOT edit codebase source files directly.
5. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_1\handoff.md` and send a message when complete.
