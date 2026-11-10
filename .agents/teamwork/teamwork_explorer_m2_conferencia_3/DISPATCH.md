## 2026-11-09T20:09:05Z
You are teamwork_explorer_m2_conferencia_3.
Your working directory is: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_3\

Read ORIGINAL_REQUEST.md first: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md: c:\www\smart-nfe\PROJECT.md

## Target Milestone
Milestone 2: M2_Conference_Table_Decimal_Recalc
Scope: Features 10, 11, 12: Original Values Snapshot & Restore, UI Badges & Indicators, Keyboard Navigation.

## Your Mission
1. Investigate `app/documentos/[id]/conferencia/page.jsx` and UI components in `app/components/` (`PillsBadge`, `Button`, `Card`, etc.).
2. Analyze requirements R1 & R4 for snapshot and restore:
   - When an item is first edited, snapshot original values into `item.valorOriginal`.
   - Render inline comparison showing original vs edited values (e.g. strikethrough original and highlighted edited value).
   - Implement `handleRestoreItem(itemId)` for restoring an individual item, and `handleRestoreAll()` for restoring all modified items.
3. Analyze requirements R4 for UI indicators:
   - XML Mod 55 badge, count of imported products, comparison cards (original totals vs recalculated totals), missing data alerts, and clear visual indicator of current mode (Demonstração vs Importação Local de Sessão).
4. Analyze requirements R4 for keyboard navigation:
   - Enter key advances focus vertically to the same field in the next row.
   - Escape key cancels editing or restores previous value.
   - Ensure focus management is stable and doesn't lose input focus or cause flicker during typing.
5. Provide clear, step-by-step implementation guidance for the Worker with sample JSX/state structures. Do NOT edit codebase source files directly.
6. Write your complete handoff report to `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m2_conferencia_3\handoff.md` and send a message back when complete.
