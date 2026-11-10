## 2026-11-09T20:08:51Z
You are teamwork_explorer_m2_conferencia_1.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_1\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 2: M2_Conference_Table_Decimal_Recalc
Scope: Features 6 & 7: Stable itemId Conference Editing and Filter/Sort Safe Editing.

## Your Mission
1. Investigate `app/documentos/[id]/conferencia/page.jsx`, `app/features/invoiceRepository.js`, and `tests/integration/flow_b_conferencia_stable_edit.test.mjs`.
2. Analyze current implementation of `handleItemChange`, table rendering, filtering (by NCM and by description), sorting, and row keying.
3. Determine how items are currently identified and updated. Is it using visual array index or stable `itemId`? How does filtering or sorting cause edits to modify the wrong item?
4. Analyze how duplicate item codes (`cProd`) or identical descriptions (like in `demo-05`) are handled. Verify that each item has a unique, deterministic `id` (`itemId`) and that editing one line never alters another row.
5. Recommend exact immutable state update strategy keyed strictly by `itemId` (`item.id === itemId`), ensuring filters and sorts do NOT change item identity or corrupt item updates.
6. Provide clear, step-by-step implementation guidance for the Worker. Do NOT edit codebase source files directly.
7. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_1\handoff.md` and send a message back when complete.
