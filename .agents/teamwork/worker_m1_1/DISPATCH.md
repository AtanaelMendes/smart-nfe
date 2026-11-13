# Dispatch for Worker M1 (Iteration 1)
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\worker_m1_1\
Branch: feature/preparacoes-unificadas


## 2026-11-13T13:46:08Z
You are Worker 1 for Milestone 1 (Core Allocation Engine & Repositories) of SmartNFe.
Working directory: c:\www\smart-nfe
State folder: c:\www\smart-nfe\.agents\teamwork\worker_m1_1\
Path to ORIGINAL_REQUEST.md: c:\www\smart-nfe\.agents\teamwork\ORIGINAL_REQUEST.md
Path to PROJECT.md: c:\www\smart-nfe\.agents\teamwork\PROJECT.md
Path to SCOPE.md: c:\www\smart-nfe\.agents\teamwork\sub_orch_m1\SCOPE.md
Technical Survey reference: c:\www\smart-nfe\.agents\teamwork\explorer_survey_1\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Git Branch:
Ensure you are working strictly on branch `feature/preparacoes-unificadas`.

Exclusive Write Ownership:
- app/lib/calculations/decimal.js
- app/lib/calculations/allocationEngine.js
- app/lib/calculations/divisionMath.js
- app/features/preparationRepository.js
- app/features/preparedInvoiceRepository.js
- tests/unit/allocationEngine.test.mjs

Tasks to implement:
1. `app/lib/calculations/decimal.js`:
   - Extend with vector operations: decimalSum(array, targetScale = 2), decimalMin(a, b), decimalMax(a, b), isDecimalPositive(val), isDecimalZero(val), isDecimalNegative(val).
   - Pure BigInt arbitrary precision, zero external packages.
   - Maintain 100% backward compatibility for all existing functions (decimalAdd, decimalSubtract, decimalMultiply, decimalDivide, decimalCompare, roundDecimal, formatDecimal, parseDecimal).

2. `app/lib/calculations/allocationEngine.js`:
   - Implement unified N->M allocation engine.
   - Core export `calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations)`:
     * Composite key: `${sourceInvoiceId}__${sourceItemId}`.
     * Conservation rule: disponivel = original - soma(alocacoes_ativas_existentes).
     * Balances: originalQty, allocatedQtyTotal across current destinations, remainingQty (disponivel - allocatedQtyTotal), hasExcess (remainingQty < 0), status ('ok'|'partial'|'excess').
     * Matrix: for each destination & source item: allocatedQty, remainingQty, lineTotal (allocatedQty * valorUnitario), apportioned accessory expenses (frete, seguro, outrasDespesas, desconto) with zero-drift cent conservation (last active destination receiving from source absorbs cent remainder).
     * Validation & totals: canSave flag, totalSourceValue, totalAllocatedValue, totalSourceItems, totalAllocatedItems.
   - Export `checkUnitCompatibility(itemA, itemB)`: unit compatibility check.
   - Export `validateAllocationBatch(sourceItems, destinationNotes, activeAllocations)`: validation helper.

3. `app/features/preparedInvoiceRepository.js`:
   - Storage leakage fix: introduce module-level `sessionPreparedInvoices = new Map()`.
   - In create(), getById(), list(), update(), delete(): if invoice is real XML (isRealImport: true or originating from real invoice), store/read strictly in `sessionPreparedInvoices`. Do NOT write real XML data to localStorage!
   - Demo invoices (demo-01..05) continue using localStorageService.
   - Support queries by both `parentInvoiceId` and `sourceInvoiceIds`.

4. `app/features/preparationRepository.js`:
   - Create preparation repository for N->M preparations:
     * Module-level `sessionPreparations = new Map()`.
     * Methods: create(prepData), update(id, updates), findById(id), list({ status, type }), delete(id), getActiveAllocations(excludePreparationId).
     * Dual-storage pattern: sessionPreparations for real imports, localStorageService for demo.
     * getActiveAllocations(excludePreparationId): aggregates active allocated quantities per `${sourceInvoiceId}__${sourceItemId}`.

5. `app/lib/calculations/divisionMath.js`:
   - Refactor legacy division to delegate internally to `allocationEngine.js`.
   - Maintain 100% backward compatibility for all existing function signatures and shapes (calculateRemainingBalance, validateDivisionBatch, apportionAllInvoiceExpenses, etc.).
   - Ensure all 383 baseline tests continue passing.

6. `tests/unit/allocationEngine.test.mjs`:
   - Comprehensive unit tests with node:test & node:assert/strict:
     * Decimal math vector ops, rounding, BigInt precision.
     * Conservation rule: disponivel = original - soma(alocacoes).
     * Excess detection and non-negativity.
     * Accessory expense zero-drift cent conservation.
     * N->1, 1->M, N->M allocation scenarios.
     * Dual-storage isolation (session Map vs localStorage).

7. Verification:
   - Run tests: `npm test`
   - Run build: `npm run build`
   - Ensure all tests pass with 0 errors.
   - Write handoff report to `c:\www\smart-nfe\.agents\teamwork\worker_m1_1\handoff.md` with command outputs and test results.
   - Send message when complete.


## 2026-11-13T13:51:44Z
[Message from parent f64908f7-618d-4f21-bf78-58657f1ff50c]
**Context**: Milestone 1 Implementation Guidance
**Content**: Explorer 1 concluiu a especificação detalhada e os algoritmos exatos de `decimal.js` e `allocationEngine.js`. Consulte o relatório em `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_1\report.md` (e `handoff.md`).
Destaques essenciais:
1. `decimal.js`: Funções vetoriais e zero-drift (`decimalSum`, `isDecimalPositive`, `decimalMin`, `decimalMax`, `decimalApportionProportional`, etc.) sem alterar as funções existentes.
2. `allocationEngine.js`: Suporte a `calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations, options = {})` com chave composta `${sourceInvoiceId}__${sourceItemId}`, regra de conservação estrita, e suporte à flag `options.requireBalanced` para que a delegação de `divisionMath.js` funcione de forma 100% retrocompatível com os testes existentes. Tabela de 15 famílias de unidades compatíveis em `checkUnitCompatibility`.
**Action**: Incorporar as especificações de Explorer 1 na implementação de `decimal.js`, `allocationEngine.js` e na delegação de `divisionMath.js`.


## 2026-11-13T13:52:48Z
[Message from parent f64908f7-618d-4f21-bf78-58657f1ff50c]
**Context**: Milestone 1 Implementation Guidance — Repositories & Storage Leakage
**Content**: Explorer 2 concluiu o relatório e desenho dos repositórios em `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_2\report.md` (e `handoff.md`).
Pontos críticos para sua implementação:
1. `preparedInvoiceRepository.js`:
   - Introduzir `export const sessionPreparedInvoices = new Map();`
   - Detecção de importação real: `isRealImport === true`, `isDemo === false` OU se `sessionInvoices.has(id)` para qualquer um de `parentInvoiceId`, `sourceInvoiceIds`, `origens`. Se for real, armazena estritamente em `sessionPreparedInvoices` e NUNCA em `localStorageService`.
   - IMPORTANTE: Em `resetDemoData()`, adicionar `sessionPreparedInvoices.clear()` para que a suíte existente de testes (`tests/tier1/m2_domain.test.mjs`) continue passando perfeitamente sem contaminação entre testes!
2. `preparationRepository.js`:
   - Padrão dual-storage: `export const sessionPreparations = new Map();` e fallback para `localStorageService` (`smartnfe_preparations_v1`).
   - Métodos: `create`, `update`, `findById`, `list`, `delete`, `getActiveAllocations(excludePreparationId)`.
   - Em `getActiveAllocations`, iterar preparações ativas/rascunhos (não canceladas), acumulando quantidades alocadas por chave `${sourceInvoiceId}__${sourceItemId}` com `decimalAdd(..., 4)`.
   - Incluir `resetDemoData()` que limpa `sessionPreparations.clear()`.
**Action**: Incorporar as orientações na implementação de `preparedInvoiceRepository.js` e `preparationRepository.js`.


## 2026-11-13T13:54:36Z
[Message from parent f64908f7-618d-4f21-bf78-58657f1ff50c]
**Context**: Milestone 1 Implementation Guidance — divisionMath.js Compatibility & Unit Tests
**Content**: Explorer 3 concluiu a análise de retrocompatibilidade de `divisionMath.js` e desenhou a nova suíte de testes em `c:\www\smart-nfe\.agents\teamwork\teamwork_explorer_m1_3\report.md` (e `handoff.md`).
Destaques críticos para não regredir nenhum dos 383 testes existentes:
1. `divisionMath.js` fachada:
   - Manter as 6 assinaturas exportadas: `calculateRemainingBalance`, `validateDivisionBatch`, `distributeEqually`, `distributeRemainingEqually`, `apportionExpenses`, `apportionAllInvoiceExpenses`.
   - `validateDivisionBatch` deve delegar para `allocationEngine.calculateAllocationMatrix` e retornar exatamente a estrutura esperada pelo frontend e testes: `{ isValid, canSave, hasExcess, hasRemaining, isBalanced, summary, itemReports, notesSummary }`, onde `canSave = notes.length >= 2 && !hasExcess && !hasRemaining && isBalanced`.
   - `apportionAllInvoiceExpenses` deve preservar chaves duplicadas PT/EN (`valorFrete` e `freight`, etc.).
2. `tests/unit/allocationEngine.test.mjs`:
   - Explorer 3 já forneceu a suíte completa de 8 blocos de teste em `teamwork_explorer_m1_3\report.md §5`. Você pode utilizá-la diretamente para cobrir todas as novas funcionalidades de BigInt, N->1, 1->M, N->M, conservação, compatibilidade de unidades e isolamento de armazenamento.
**Action**: Incorporar as orientações de Explorer 3 na refatoração de `divisionMath.js` e na escrita de `tests/unit/allocationEngine.test.mjs`.
