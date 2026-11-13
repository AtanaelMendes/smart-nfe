# Synthesis Report — Milestone 1 Explorers

## Consensus
All 3 Explorers reached full consensus on the architecture, contracts, and implementation strategy for Milestone 1:

1. **Aritmética Decimal (`decimal.js`)**:
   - Manter 100% de pureza em `BigInt` nativo sem bibliotecas externas.
   - Adicionar utilitários vetoriais (`decimalSum`, `decimalAverage`), predicados relacionais (`isDecimalPositive`, `decimalEquals`, `decimalMin`, `decimalMax`, `decimalClamp`) e primitivas de rateio com conservação de centavos (`decimalDistributeEqually`, `decimalApportionProportional`).

2. **Motor Unificado de Alocação (`allocationEngine.js`)**:
   - `calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations, options)`:
     * Chave composta: `${sourceInvoiceId}__${sourceItemId}` para preservação de proveniência de fornecedor.
     * Regra de conservação: `disponível = original - soma(alocações ativas de outras preparações)`.
     * Saldos em tempo real: `remainingQty = disponível - totalAlocadoNaPreparação`.
     * Não-negatividade e trava de excesso: `canSave = !hasExcess && totalAlocado > 0`.
     * Rateio multi-origem de despesas acessórias com conservação exata de centavos ao nível de cada fornecedor de origem.
   - `checkUnitCompatibility(itemA, itemB)`: 15 famílias canônicas SEFAZ com normalização.

3. **Correção de Vazamento Fiscal (`preparedInvoiceRepository.js`)**:
   - Introduzir `sessionPreparedInvoices = new Map()` em memória volátil.
   - Preparações originadas de XMLs reais (detectadas via `isRealImport === true`, `isDemo === false` ou consulta a `sessionInvoices.has(id)`) são gravadas estritamente em memória volátil e NUNCA no `localStorageService`.
   - Limpeza em `resetDemoData()` (`sessionPreparedInvoices.clear()`) para prevenir contaminação entre testes.

4. **Repositório de Preparações (`preparationRepository.js`)**:
   - Dual-storage: `sessionPreparations = new Map()` para preparações reais, `localStorageService` para demo.
   - Mutex lock para concorrência (`withMutationLock`).
   - Máquina de estados: `'draft'`, `'active'`, `'completed'`, `'cancelled'`.
   - `getActiveAllocations(excludePreparationId)`: calcula alocações ativas com `decimalAdd(..., 4)`.

5. **Retrocompatibilidade de `divisionMath.js`**:
   - Preservar todas as 6 assinaturas exportadas, delegando internamente a `allocationEngine.js`.
   - Respeitar a exigência legada de divisão total (`notes.length >= 2 && !hasExcess && !hasRemaining && isBalanced`) para `/documentos/[id]/divisao` e os 67 testes de divisão legados.

6. **Nova Suíte de Testes Unitários (`tests/unit/allocationEngine.test.mjs`)**:
   - 8 blocos cobrindo BigInt math, N->1 grouping, 1->M division, N->M mixed, conservação, compatibilidade de unidades e isolamento de armazenamento.

## Resolved Conflicts
Nenhum conflito identificado. As análises são perfeitamente complementares e cobrem integralmente os requisitos R4 e R5.

## Gaps
Nenhuma lacuna.
