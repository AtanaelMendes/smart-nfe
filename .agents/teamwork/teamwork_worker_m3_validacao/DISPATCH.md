## 2026-11-09T20:46:29Z
You are teamwork_worker_m3_validacao.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m3_validacao\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 3: M3_Validation_Safety_Assistant_Undo
Scope: Features 13, 14, 15

## Write Boundaries
You own exclusively:
1. `app/documentos/[id]/validacao/page.jsx`
2. `app/features/invoiceRepository.js` (for round-trip undo precision as detailed in Explorer 2's report)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Study Explorer Reports Before Implementing
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_1\handoff.md` (Explicit Confirmation Modal)
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_2\handoff.md` (Undo Stack, invoiceRepository patch, auto-revalidation)
- `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m3_validacao_3\handoff.md` (Safe "Corrigir todas" Review Modal & sensitive field locks)

## Specific Implementation Instructions

### 1. Feature 13 — Explicit Fiscal Fix Confirmation Modal
- In `app/documentos/[id]/validacao/page.jsx`, replace silent 1-click apply in `handleApplyFix` with `handleRequestFix(issue)` which opens a confirmation dialog.
- The modal must display:
  - Item identification (`itemNumero`, `itemDescricao`)
  - Target field (`campo` and human-readable label)
  - Current value (`valorAtual`) with red/neutral badge
  - Proposed value (`valorProposto`) with green badge
  - Rule origin / rationale (`origemRegra`)
  - Risk classification badge: "Correção Mecânica" (green/blue) vs "Alteração Fiscal Sensível" (amber/rose)
- Action buttons: "Confirmar Correção" and "Cancelar".
- Support Escape key and click outside to cancel safely.

### 2. Feature 14 — Undo Mechanism & Automatic Re-validation
- Implement `undoStack` in component state.
- In `handleConfirmFix`:
  - Capture prior value from current invoice data before applying fix: `{ id, issueId, itemId, itemNumero, itemDescricao, campo, valorAnterior, valorNovo, timestamp }`.
  - Push entry onto `undoStack`.
  - Call `invoiceRepository.updateItem(id, itemId, { [campo]: valorNovo })`.
  - Display success toast with an interactive "Desfazer" action button.
  - Automatically call `await loadData()` to re-audit and regenerate issue cards.
- Implement `handleUndo(entry)`:
  - Call `invoiceRepository.updateItem(id, itemId, { [campo]: valorAnterior })`.
  - Pop entry from `undoStack`.
  - Display toast notification.
  - Automatically call `await loadData()` to re-validate.
- Add visible header button: `"Desfazer Última ({undoStack.length})"`.
- Implement Explorer 2's repository patch in `app/features/invoiceRepository.js` around line 330-365:
  - If `partialItem` explicitly provides `valorTotal`, respect it rather than unconditionally recalculating it.
  - When updating `unidade`, do NOT destructively wipe other inconsistencies so that undoing an aduaneira unit mismatch properly re-flags the inconsistency on `loadData()`.

### 3. Feature 15 — Safe "Corrigir todas" Review Modal & Sensitive Field Locks
- Replace blind 1-click in `handleFixAll` with opening `SafeBulkReviewModal`.
- Segregate issues into:
  - **Mechanical fixes** (e.g. calculation discrepancies, formatting) -> Pre-selected with checkboxes, user can uncheck.
  - **Sensitive fiscal fields** (NCM, CFOP, tributação, tax rates) -> LOCKED / DISABLED checkboxes with warning badge ("Campo fiscal sensível — requer revisão individual").
- Display button: `"Aplicar Selecionadas ({count})"`.
- On apply, record batch undo entry, apply updates sequentially, and re-run `loadData()`.
- Display assistant explanations explicitly labeled as "Demonstração" / "Sugestão Fiscal Demonstrativa" per R2.

## Verification
1. Run integration tests: `node --no-warnings --test tests/integration/flow_d_validation_safe_fix_undo.test.mjs`
2. Run full suite: `node --no-warnings --test tests/integration/*.test.mjs`
3. Run build: `pnpm build`
4. Document all verification commands and outcomes in `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m3_validacao\handoff.md`.
Send a message when complete.
