# BRIEFING — 2026-11-09T20:43:00Z

## Mission
Investigate and design a safe review modal for "Corrigir todas" in `app/documentos/[id]/validacao/page.jsx` and related tests/features (Milestone 3, Feature 15: Safe "Corrigir todas" Review Modal & Sensitive Field Locks).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigator, analyzer, synthesizer
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_3\
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: M3_Validation_Safety_Assistant_Undo

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do not edit codebase source files directly
- Must categorize issues into mechanical fixes vs sensitive fiscal fields (NCM, CFOP, CST/CSOSN, tax rates)
- Sensitive fields locked from batch apply with clear warnings ("Alteração sensível — requer revisão individual")
- Assistant explanations labeled as "Demonstração" / "Sugestão Fiscal Demonstrativa" per R2

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T20:43:00Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md` (R2: safety rules for fiscal corrections, Corrigir todas review, sensitive field blocking, demonstration labeling)
  - `PROJECT.md` (Feature 15 specification, contracts § 6)
  - `app/documentos/[id]/validacao/page.jsx` (current `handleFixAll` on lines 102-119, bulk button on line 313)
  - `tests/integration/flow_d_validation_safe_fix_undo.test.mjs` (test suite confirming mechanical vs sensitive segregation, blocking cfop/ncm, undo stack integration)
  - `app/features/invoiceRepository.js` (`getValidationIssues`, `updateItem`, mock inconsistencies)
  - `app/lib/data/mockInvoices.js` (`demo-04` issues: CFOP 5102->7101, NCM 6403590->64035910, valorTotal math 4000->4500, unidade METROS->PAR)
- **Key findings**:
  - Current `handleFixAll` applies all issues blindly in a loop without confirmation, mutating sensitive fields (CFOP, NCM) in mass, and without recording undo history.
  - SENSITIVE_FIELDS: `['cfop', 'ncm', 'cst', 'csosn', 'aliquota', 'tributos', 'origem']`.
  - Mechanical fixes: `valorTotal` (math), `unidade`, formatting.
  - Integration test `flow_d_validation_safe_fix_undo.test.mjs` validates that bulk apply must process ONLY mechanical fixes (2 in `demo-04`) and leave sensitive fixes (2 in `demo-04`) untouched for individual review.
  - Safe Review Modal design complete: header with R2 demonstration badge, warning banner on fiscal lock, selectable mechanical issues table, locked sensitive fields section with warning badge and "Revisar Individualmente" button, undoStack integration, and automatic re-validation.
- **Unexplored areas**: none. All requirements scoped and analyzed.

## Key Decisions Made
- Replace direct `handleFixAll` execution on button click with opening the Safe Review Modal (`setShowBulkReviewModal(true)`).
- Modal segregates issues into two dedicated visual sections:
  1. Mechanical Fixes (interactive checkboxes, toggle-all, diff display, assistant demonstration tag).
  2. Sensitive Fiscal Fields (disabled checkboxes, lock icon, visual warning badge "Alteração sensível — requer revisão individual", individual review shortcut).
- Integrated with Feature 13 (redirect to single confirm modal) and Feature 14 (pushing each batch fix to `undoStack` with `valorAnterior`).

## Artifact Index
- DISPATCH.md — Dispatch history
- progress.md — Liveness heartbeat
- BRIEFING.md — Situational awareness
- handoff.md — Complete 5-component handoff report for Worker
