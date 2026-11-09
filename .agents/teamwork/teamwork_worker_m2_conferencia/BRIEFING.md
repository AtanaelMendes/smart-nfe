# BRIEFING — 2026-11-09T20:27:00Z

## Mission
Implement Milestone 2: M2_Conference_Table_Decimal_Recalc (Features 6, 7, 8, 9, 10, 11, 12) in `app/documentos/[id]/conferencia/page.jsx` with itemId stability, pure BigInt decimal calculations, ancillary expense preservation, original value snapshot & restoration, UI badges & comparison cards, and keyboard navigation.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_conferencia\
- Original parent: 71db8a14-4c80-4575-92ba-b52ae572b170
- Milestone: M2_Conference_Table_Decimal_Recalc

## 🔒 Key Constraints
- Write boundaries: Exclusively modify `app/documentos/[id]/conferencia/page.jsx`.
- Strict integrity mandate: No hardcoding test results, no dummy implementations. Real state and behavior only.
- Pure BigInt decimal calculations: Zero binary float math (`parseFloat`, `.toFixed`, `Math.round`). Use `calculateItemTotal` and `calculateInvoiceTotals`.
- Stable item identity: Never use visual array index in `handleItemChange`, use `item.id`.
- Preserve ancillary expenses: Reconcile freight, insurance, other expenses, and discount without overwriting totals.
- No TypeScript migration, maintain Next.js 16 App Router, React 19, Tailwind CSS 4.
- All verification tests and `pnpm build` must pass with 0 errors.

## Current Parent
- Conversation ID: 71db8a14-4c80-4575-92ba-b52ae572b170
- Updated: 2026-11-09T20:27:00Z

## Task Summary
- **What to build**: Full upgrade of `app/documentos/[id]/conferencia/page.jsx` fulfilling Features 6, 7, 8, 9, 10, 11, 12.
- **Success criteria**: Flow B integration tests pass, full test suite passes, `pnpm build` passes with 0 errors, no binary floats in conference page, stable itemId edits, snapshots, restore actions, UI cards and badges, keyboard navigation.
- **Interface contracts**: `PROJECT.md` § Feature Inventory, `app/lib/calculations/invoiceTotals.js`, `app/lib/calculations/decimal.js`.
- **Code layout**: `c:\www\smart-nfe\`

## Key Decisions Made
- Keyed `handleItemChange(itemId, field, value)` strictly by `item.id`.
- Immutable state update taking snapshot in `valorOriginal` on first modification.
- Replaced all binary floats with `calculateItemTotal` and `calculateInvoiceTotals` from `@/lib/calculations/invoiceTotals`.
- Preserved freight, insurance, discounts, and other expenses in `recalculatedTotals`, `handleSave`, and `handleMarkAsChecked`.
- Added inline diff styling with strikethrough original value and highlighted edited inputs.
- Implemented `handleRestoreItem(itemId)` with row action button and Escape keyboard shortcut.
- Implemented `handleRestoreAll()` with bulk action bar button.
- Added header badges: "NF-e Mod. 55", "Importação Local (Memória Temporária de Sessão)" vs "Modo Demonstração".
- Added comparison cards and missing data alert banner.
- Implemented vertical keyboard navigation via Enter/Shift+Enter (`data-row-index` and `data-field`) with auto-selection.
- Added table column sorting across all columns.

## Artifact Index
- `c:\www\smart-nfe\app\documentos\[id]\conferencia\page.jsx` — Primary deliverable
- `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_conferencia\handoff.md` — 5-component handoff report
- `c:\www\smart-nfe\.agents\teamwork\teamwork_worker_m2_conferencia\progress.md` — Liveness heartbeat

## Change Tracker
- **Files modified**: `app/documentos/[id]/conferencia/page.jsx` (Complete implementation of Milestone 2: Features 6, 7, 8, 9, 10, 11, 12)
- **Build status**: `pnpm build` PASS (exit code 0, 11/11 static routes generated)
- **Pending issues**: none

## Quality Status
- **Build/test result**: Flow B integration test PASS (11/11), Full integration test suite PASS (43/43), Tier 1 M2 domain PASS (44/44), Tier 5 M2 stress PASS (46/46), `pnpm build` PASS (0 errors)
- **Lint status**: `npx eslint app/documentos/[id]/conferencia/page.jsx` PASS (0 errors, 0 warnings)
- **Tests added/modified**: none (verified against complete suite)

## Loaded Skills
- None specified in dispatch
