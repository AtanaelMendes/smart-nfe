# Scope: Milestone 2 — Conference Table & Pure Decimal Recalculation

## Architecture
- Screen: `app/documentos/[id]/conferencia/page.jsx`.
- Domain: `app/lib/calculations/decimal.js` and `invoiceTotals.js`.
- Strict stability: Product editing keyed exclusively by stable `itemId`, immutable state updates, immune to search filters (NCM/description) and sorting.
- Zero binary float: Eliminate `parseFloat`, `.toFixed(2)`, `Math.round` from editing and totals; use BigInt decimal utilities.
- Original values: Snapshot `valorOriginal`, render inline strikethrough comparison, provide single-item and mass restore actions.
- Full conservation of freight, insurance, other expenses, and discounts.
- UI enhancements (R4): XML Mod 55 badge, product count cards, original vs recalculated totals comparison, demo vs local session mode indicator, keyboard navigation (Enter advances row, Escape restores/cancels).

## Features
- F6: Stable `itemId` indexing and immutable updates in `handleItemChange`.
- F7: Safe editing when table is filtered by NCM or description or sorted.
- F8: Pure decimal calculations replacing all native IEEE-754 float operations.
- F9: Full conservation of freight, insurance, ancillary expenses, and discounts.
- F10: Original value snapshot (`valorOriginal`), visual diff, and restore buttons.
- F11: UI badges, product counts, totals comparison, and mode indicators.
- F12: Keyboard navigation (Enter key advances to same field in next row).

## File Boundaries & Write Ownership
- `app/documentos/[id]/conferencia/page.jsx`

## Verification
- Filter by NCM/description and edit an item -> confirm only the target item is modified and other items remain intact.
- Check that editing items with repeated codes or descriptions only alters the active row.
- Verify original value comparison and restore.
- Confirm freight and insurance are conserved in recalculated invoice totals.
