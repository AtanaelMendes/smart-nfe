## 2026-11-09T20:38:40Z
You are teamwork_explorer_m3_validacao_3.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_3\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 3: M3_Validation_Safety_Assistant_Undo
Scope: Feature 15 (Safe "Corrigir todas" Review Modal & Sensitive Field Locks)

## Your Mission
1. Investigate `app/documentos/[id]/validacao/page.jsx` and `tests/integration/flow_d_validation_safe_fix_undo.test.mjs`.
2. Analyze current `handleApplyAllFixes` (which applies all suggestions indiscriminately in bulk).
3. Design a safe review modal for "Corrigir todas":
   - Categorize issues into:
     - **Mechanical fixes** (e.g., calculation discrepancies, math corrections, format normalization) -> Allowed for batch application with user checkbox selection.
     - **Sensitive fiscal fields** (e.g., NCM, CFOP, CST/CSOSN, tax rates) -> DISABLED from mass application with clear visual warnings ("Alteração sensível — requer revisão individual"); requires individual explicit confirmation.
   - List each proposed modification with checkbox/toggle, before/after values, and justification.
   - User must review and approve which fixes to apply.
   - Clearly identify assistant explanations as "Demonstração" / "Sugestão Fiscal Demonstrativa" per R2.
4. Provide step-by-step implementation guidance for the Worker. Do NOT edit codebase source files directly.
5. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_3\handoff.md` and send a message when complete.
