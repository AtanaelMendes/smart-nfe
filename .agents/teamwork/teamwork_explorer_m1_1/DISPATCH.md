# Dispatch for Explorer 1 (M1)
Task: Investigate Decimal Math (decimal.js) & Core Allocation Engine (allocationEngine.js).
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\


## 2026-11-13T13:44:18Z
You are Explorer 1 for Milestone 1 of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
Path to SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md

Objective:
Read ORIGINAL_REQUEST.md, PROJECT.md, and SCOPE.md. Investigate app/lib/calculations/decimal.js and design app/lib/calculations/allocationEngine.js.
Specifically:
1. Examine current app/lib/calculations/decimal.js: what functions exist, how BigInt fixed-point arithmetic is implemented, what helper functions are needed for vector operations, strict comparisons, zero-drift apportioning (accessory expenses: frete, seguro, outras despesas, desconto) with cent-conservation without floating-point errors.
2. Detail the exact design and implementation strategy for app/lib/calculations/allocationEngine.js:
   - Matrix calculation: calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations)
   - Conservation rule: disponível = original - soma(alocações ativas)
   - Item identity preservation: composite key `${sourceInvoiceId}__${sourceItemId}`
   - Unit compatibility check: checkUnitCompatibility(itemA, itemB)
   - Accessory expense apportionment (frete, seguro, outras despesas, desconto) with zero-drift cent conservation
   - Validation: non-negativity, excess detection (hasExcess, status 'ok'|'partial'|'excess'), canSave flag
3. Write your findings and proposed code design to c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\report.md and c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\handoff.md.
Send a message when complete.
