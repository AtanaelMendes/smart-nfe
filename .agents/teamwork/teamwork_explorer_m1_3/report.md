# Relatório Técnico de Investigação e Design de Compatibilidade — Explorer 3 (Marco 1)

**Data**: 2026-11-13  
**Escopo**: Marco 1 — Motor de Alocação Unificada (`allocationEngine.js`), Retrocompatibilidade de `divisionMath.js` e Nova Suíte de Testes Unitários (`tests/unit/allocationEngine.test.mjs`).  
**Ambiente**: `c:\www\smart-nfe` (Next.js 16 App Router, React 19, JavaScript nativo, Tailwind CSS 4, Node.js 24 Test Runner).

---

## 1. Resumo Executivo

1. **Retrocompatibilidade de `divisionMath.js`**: `divisionMath.js` exporta 6 funções fiscais críticas utilizadas pela tela legada `/documentos/[id]/divisao` e por 67 testes automatizados em `tests/`. O motor unificado `allocationEngine.js` generaliza as operações para $N \text{ origens} \to M \text{ destinos}$. É perfeitamente viável refatorar `divisionMath.js` para delegar 100% de sua lógica matemática ao `allocationEngine.js`, mantendo rigorosamente idênticas as assinaturas, formatos de retorno, nomes de propriedades (em português e inglês) e regras de arredondamento Half-Up ABNT NBR 5891.
2. **Diagnóstico dos Testes de Baseline**: O SmartNFe possui **383 testes de baseline** passando com 0 falhas em ~9.9s (`npm test`). Nenhum teste de baseline pode quebrar.
3. **Design da Nova Suíte `tests/unit/allocationEngine.test.mjs`**: Foi desenhada uma suíte com 8 blocos de testes unitários abrangendo aritmética BigInt pura, verificação de compatibilidade de unidades (`checkUnitCompatibility`), regra de conservação matemática (`disponível = original - alocações ativas`), cenários $N \to 1$, $1 \to M$ e $N \to M$, preservação de chaves compostas `${sourceInvoiceId}__${sourceItemId}`, rateio de despesas acessórias multiorigem com conservação exata ao centavo e oráculos adversariais de invariância.

---

## 2. Investigação Detalhada de `app/lib/calculations/divisionMath.js`

### 2.1 Funções Exportadas e Assinaturas

O arquivo `app/lib/calculations/divisionMath.js` (518 linhas) exporta atualmente 6 funções públicas:

| Função | Parâmetros | Estrutura de Retorno | Finalidade Principal |
|---|---|---|---|
| `calculateRemainingBalance` | `(originalQtyStr, allocatedQtyArray)` | `{ balanceStr, status: 'ok'\|'remaining'\|'excess', totalAllocatedStr, isOk, hasRemaining, hasExcess, hasNegative }` | Audita o saldo restante de um item com no mínimo 4 casas decimais. |
| `validateDivisionBatch` | `(originalItems, destinationNotes)` | `{ isValid, canSave, hasExcess, hasRemaining, isBalanced, summary, itemReports, notesSummary }` | Validação e auditoria analítica em lote de desmembramento $1 \to M$. |
| `distributeEqually` | `(originalQtyStr, numNotes, scale = 4)` | `Array<string>` | Divisão inteira BigInt com absorção do resto na última nota (soma 100% exata). |
| `distributeRemainingEqually` | `(originalQtyStr, currentAllocations, scale = 4)` | `Array<string>` | Distribui saldo restante igualmente entre notas existentes, zerando pendência. |
| `apportionExpenses` | `(originalExpenseStr, noteProductTotalStr, originalProductTotalStr)` | `string` (2 casas decimais) | Rateia 1 despesa acessória na proporção do valor dos produtos. |
| `apportionAllInvoiceExpenses` | `(parentTotals = {}, notesWithProducts = [])` | `Record<string, { valorProdutos, valorFrete, valorSeguro, outrasDespesas, valorDesconto, freight, insurance, otherExpenses, discount }>` | Rateia todas as despesas acessórias de 1 nota pai entre $M$ notas filhas com absorção de resíduo de centavos na última nota ativa. |

### 2.2 Consumo na Interface do Usuário (`app/documentos/[id]/divisao/page.jsx`)

A tela `/documentos/[id]/divisao` consome `divisionMath.js` nos seguintes pontos críticos:

1. **Importação (linhas 34-39)**:
   ```javascript
   import {
     validateDivisionBatch,
     calculateRemainingBalance,
     distributeEqually,
     apportionAllInvoiceExpenses,
   } from '@/lib/calculations/divisionMath';
   ```
2. **Auditoria Reativa em Tempo Real (`useMemo`, linha 112-133)**:
   ```javascript
   const batchResult = useMemo(() => {
     if (!invoice?.itens || targetNotes.length === 0) { ... }
     return validateDivisionBatch(invoice.itens, targetNotes);
   }, [invoice, targetNotes]);
   ```
   - O objeto `batchResult` governa os contadores de tela, status por linha (`batchResult.itemReports`) e a liberação do botão Salvar (`batchResult.canSave && !isSaving`).
3. **Ações Rápidas de Distribuição (linhas 300, 327, 350)**:
   - Botão "Distribuir Igualmente": divide a quantidade de um item igualmente entre as $M$ notas via `distributeEqually(it.quantidade, numNotes, 4)`.
   - Botão "Distribuir Saldo Restante": invoca `distributeEqually(balance, numNotes, 4)`.
4. **Gravação e Geração de Notas Preparadas (`handleSave`, linhas 450-482)**:
   - Invoca `apportionAllInvoiceExpenses(invoice.totais || {}, activeNotesForExpenses)`.
   - Recupera os valores rateados para frete, seguro, outras despesas e desconto por nota de destino e calcula os totais finais com `calculateInvoiceTotals`.
   - Cria as notas preparadas via `preparedInvoiceRepository.create(...)`.

### 2.3 Consumo pelos Testes Automatizados Existentes

Os testes de baseline dependem fortemente do contrato exato de `divisionMath.js`:

1. `tests/integration/flow_c_division_balances.test.mjs` (11 testes):
   - Valida conservação de 4 casas decimais sem arredondamento prematuro.
   - Testa `calculateRemainingBalance`, `validateDivisionBatch`, `distributeEqually`, `apportionExpenses`.
2. `tests/tier1/m2_domain.test.mjs` (Suite 3, 6 testes):
   - Testa `calculateRemainingBalance` com arrays de strings e arrays de objetos `{ quantidade, quantity }`.
   - Testa `validateDivisionBatch` gerando `itemReports` e `notesSummary`.
   - Testa bloqueio `canSave: false` sob excesso.
3. `tests/tier5/m2_decimal_adversarial_stress.test.mjs` (Suite 4, 6 testes):
   - Testa `calculateRemainingBalance` e `validateDivisionBatch` com 10 notas de destino simultâneas.
   - Testa divisão em tempo real da nota `demo-05` (15 itens) em 10 notas.
4. `tests/tier5/m4_challenger_division_traps_adversarial.test.mjs` (25 testes):
   - Valida corner cases de dízimas periódicas: $10 / 3$, $1 / 7$, $0.0004 / 6$, $99999.9999 / 4$.
   - Testa injeções negativas trojanas (`+15` e `-5`).
   - Testa armadilha de `canSave: false` com resíduo de `0.0001`.
   - Executa 1.000 iterações de teste de propriedade (oráculos de invariância).
5. `tests/tier5/m4_challenger_expenses_persistence_adversarial.test.mjs` (15 testes):
   - Testa `apportionAllInvoiceExpenses` com 2, 3 e 5 notas, assimetrias extremas (99% e 1%) e caso patológico (valor de produto zero).
   - Testa preservação de chaves em português (`valorFrete`) e inglês (`freight`).

---

## 3. Arquitetura de Retrocompatibilidade: `divisionMath.js` delegando ao `allocationEngine.js`

### 3.1 Princípio de Redução Matemática: 1 -> M como caso especial de N -> M

No modelo geral $N \to M$ gerenciado por `allocationEngine.js`:
- Temos um conjunto de itens de origem $S = \{ s_1, s_2, \dots, s_K \}$, onde cada item possui uma chave composta `sourceKey = `${sourceInvoiceId}__${sourceItemId}``.
- Temos um conjunto de destinos $D = \{ d_1, d_2, \dots, d_M \}$.
- A matriz de alocação calcula $A(s, d)$, saldos disponíveis e rateio de despesas acessórias por nota de origem.

Na divisão legada $1 \to M$:
- O número de notas de origem é estritamente $N = 1$.
- `sourceInvoiceId` é fixado como `'orig'` (ou o `id` da nota original).
- `sourceItemId` é o `id` do item.
- `activeAllocations = {}` (sem outras preparações concorrentes na divisão legada de 1 nota).
- Regra de fechamento da divisão legada: para salvar uma divisão total de 1 nota, é exigido `destinationNotesCount >= 2`, `hasExcess === false`, `hasRemaining === false` e `isBalanced === true`.

### 3.2 Código Proposto para `app/lib/calculations/divisionMath.js`

```javascript
/**
 * Motor de Divisão e Distribuição de NF-e — SmartNFe
 * 
 * Executa o cálculo de saldos remanescentes e a validação em tempo real da distribuição
 * de itens entre duas ou mais notas fiscais de destino preparadas.
 * 
 * Implementa conservação estrita de decimais (escala 4 para quantidades fiscais e
 * escala 2 para valores monetários), eliminação total de ponto flutuante binário (IEEE 754),
 * divisão exata BigInt e rateio proporcional de despesas acessórias com absorção de resíduos.
 * 
 * Retrocompatibilidade: Delega internamente ao allocationEngine.js tratando a divisão
 * 1 -> M como caso particular de N -> M, preservando 100% das assinaturas e retornos.
 */

import {
  parseDecimal,
  formatBigInt,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalCompare,
  cleanDecimalString,
  isDecimalNegative,
  roundDecimal,
} from './decimal.js';

import {
  calculateAllocationMatrix,
  calculateItemBalance as engineCalculateItemBalance,
  distributeEqually as engineDistributeEqually,
  distributeRemainingEqually as engineDistributeRemainingEqually,
  apportionExpenses as engineApportionExpenses,
  apportionMultiSourceExpenses,
  makeSourceKey,
} from './allocationEngine.js';

/**
 * Extrai a quantidade numérica em string a partir de diversos formatos de entrada.
 * @param {string|number|object} val
 * @returns {string}
 */
function extractQuantity(val) {
  if (val === null || val === undefined) return '0';
  if (typeof val === 'object') {
    return cleanDecimalString(val.quantidade ?? val.quantity ?? val.allocatedQty ?? val.qty ?? '0');
  }
  return cleanDecimalString(val);
}

/**
 * Obtém a quantidade de casas decimais de uma string numérica.
 * @param {string} str
 * @returns {number}
 */
function getDecimalPlaces(str) {
  const s = cleanDecimalString(str);
  const parts = s.split('.');
  return parts[1] ? parts[1].length : 0;
}

/**
 * Calcula o saldo restante da distribuição de um item.
 * Delega ao cálculo de balanço do allocationEngine.js preservando a estrutura de retorno legada.
 * 
 * @param {string|number} originalQtyStr - Quantidade original da nota
 * @param {Array<string|number|object>} allocatedQtyArray - Array de alocações efetuadas
 * @returns {{
 *   balanceStr: string,
 *   status: 'ok' | 'remaining' | 'excess',
 *   totalAllocatedStr: string,
 *   isOk: boolean,
 *   hasRemaining: boolean,
 *   hasExcess: boolean,
 *   hasNegative: boolean
 * }}
 */
export function calculateRemainingBalance(originalQtyStr, allocatedQtyArray) {
  if (typeof engineCalculateItemBalance === 'function') {
    return engineCalculateItemBalance(originalQtyStr, allocatedQtyArray);
  }

  // Fallback transparente idêntico
  const origStr = cleanDecimalString(originalQtyStr || '0');
  const arr = Array.isArray(allocatedQtyArray) ? allocatedQtyArray : [];

  const maxScale = Math.max(
    4,
    getDecimalPlaces(origStr),
    ...arr.map((item) => getDecimalPlaces(extractQuantity(item)))
  );

  let totalAllocated = '0.' + '0'.repeat(maxScale);
  let hasNegative = false;

  for (const item of arr) {
    const q = extractQuantity(item);
    if (isDecimalNegative(q)) {
      hasNegative = true;
    }
    totalAllocated = decimalAdd(totalAllocated, q, maxScale);
  }

  const balanceStr = decimalSubtract(origStr, totalAllocated, maxScale);
  const cmp = decimalCompare(balanceStr, '0');

  let status = 'ok';
  if (hasNegative || cmp < 0) {
    status = 'excess';
  } else if (cmp > 0) {
    status = 'remaining';
  }

  return {
    balanceStr,
    status,
    totalAllocatedStr: totalAllocated,
    isOk: status === 'ok',
    hasRemaining: status === 'remaining',
    hasExcess: status === 'excess',
    hasNegative,
  };
}

/**
 * Valida o lote completo de distribuição da nota fiscal original entre notas de destino.
 * Delega internamente a calculateAllocationMatrix de allocationEngine.js.
 * 
 * @param {Array<object>} originalItems - Itens da nota fiscal original
 * @param {Array<object>|object} destinationNotes - Notas de destino configuradas
 * @returns {{
 *   isValid: boolean,
 *   canSave: boolean,
 *   hasExcess: boolean,
 *   hasRemaining: boolean,
 *   isBalanced: boolean,
 *   summary: {
 *     totalItemsCount: number,
 *     destinationNotesCount: number,
 *     balancedCount: number,
 *     remainingCount: number,
 *     excessCount: number
 *   },
 *   itemReports: Array<object>,
 *   notesSummary: Array<object>
 * }}
 */
export function validateDivisionBatch(originalItems, destinationNotes) {
  const origList = Array.isArray(originalItems) ? originalItems : [];

  // Normaliza destinationNotes para formato padronizado de array
  let notes = [];
  if (Array.isArray(destinationNotes)) {
    notes = destinationNotes.map((note, idx) => {
      const noteId = note.id || note.noteId || `nota-${idx + 1}`;
      const noteNum = note.numero || note.number || `DEST-${String(idx + 1).padStart(2, '0')}`;
      let noteItems = [];

      if (Array.isArray(note.itens)) {
        noteItems = note.itens;
      } else if (Array.isArray(note.items)) {
        noteItems = note.items;
      } else if (note.allocations && typeof note.allocations === 'object') {
        noteItems = Object.entries(note.allocations).map(([id, qty]) => ({ id, quantidade: qty }));
      } else if (note.itens && typeof note.itens === 'object') {
        noteItems = Object.entries(note.itens).map(([id, qty]) => ({ id, quantidade: qty }));
      } else if (note.items && typeof note.items === 'object') {
        noteItems = Object.entries(note.items).map(([id, qty]) => ({ id, quantidade: qty }));
      }

      return { id: noteId, numero: noteNum, itens: noteItems, raw: note };
    });
  } else if (destinationNotes && typeof destinationNotes === 'object') {
    notes = Object.entries(destinationNotes).map(([noteId, allocs], idx) => {
      const noteItems = Object.entries(allocs || {}).map(([id, qty]) => ({ id, quantidade: qty }));
      return {
        id: noteId,
        numero: `DEST-${String(idx + 1).padStart(2, '0')}`,
        itens: noteItems,
        raw: allocs,
      };
    });
  }

  // Prepara itens de origem no formato unificado (N=1)
  const sourceInvoiceId = 'orig';
  const unifiedSourceItems = origList.map((item, idx) => ({
    ...item,
    id: item.id || `item-${idx + 1}`,
    sourceInvoiceId: item.sourceInvoiceId || sourceInvoiceId,
    sourceItemId: item.id || item.itemId || item.codigo || `item-${idx + 1}`,
    quantidade: cleanDecimalString(item.quantidade || '0'),
    valorUnitario: cleanDecimalString(item.valorUnitario || '0'),
  }));

  // Prepara notas de destino com mapa de alocações por sourceKey e por itemId
  const unifiedDestinations = notes.map((note) => {
    const allocations = {};
    for (const it of note.itens) {
      const q = extractQuantity(it);
      const itemId = it.id || it.itemId || it.codigo;
      allocations[makeSourceKey(sourceInvoiceId, itemId)] = q;
      allocations[itemId] = q; // Chave direta para tolerância
    }
    return {
      id: note.id,
      numero: note.numero,
      allocations,
    };
  });

  // Executa o motor unificado
  const matrixResult = calculateAllocationMatrix(unifiedSourceItems, unifiedDestinations, {});

  // Constrói itemReports com compatibilidade estrita
  const itemReports = [];
  let balancedCount = 0;
  let remainingCount = 0;
  let excessCount = 0;

  for (const origItem of origList) {
    const itemId = origItem.id;
    const sourceKey = makeSourceKey(sourceInvoiceId, itemId);
    const balanceInfo = matrixResult.sourceBalances[sourceKey] || matrixResult.sourceBalances[itemId] || {
      originalQty: cleanDecimalString(origItem.quantidade || '0'),
      allocatedQtyTotal: '0.0000',
      remainingQty: cleanDecimalString(origItem.quantidade || '0'),
      status: 'remaining',
      hasExcess: false,
    };

    const allocationsByNote = {};
    for (const note of notes) {
      const matched = note.itens.find(
        (i) => i.id === itemId || i.itemId === itemId || i.codigo === origItem.codigo
      );
      allocationsByNote[note.id] = matched ? extractQuantity(matched) : '0.0000';
    }

    if (balanceInfo.status === 'ok') balancedCount++;
    else if (balanceInfo.status === 'remaining' || balanceInfo.status === 'partial') remainingCount++;
    else if (balanceInfo.status === 'excess' || balanceInfo.hasExcess) excessCount++;

    itemReports.push({
      itemId,
      itemNumber: origItem.item,
      codigo: origItem.codigo,
      descricao: origItem.descricao,
      originalQty: cleanDecimalString(origItem.quantidade || '0'),
      unitPrice: cleanDecimalString(origItem.valorUnitario || '0'),
      totalAllocated: balanceInfo.allocatedQtyTotal,
      balanceStr: balanceInfo.remainingQty,
      status: balanceInfo.status === 'partial' ? 'remaining' : balanceInfo.status,
      allocationsByNote,
    });
  }

  // Resumo financeiro e físico de cada nota de destino
  const notesSummary = notes.map((note) => {
    let noteProductTotal = '0.00';
    let noteTotalQty = '0.0000';
    let allocatedItemsCount = 0;

    for (const item of note.itens) {
      const q = extractQuantity(item);
      if (decimalCompare(q, '0') > 0) {
        allocatedItemsCount++;
        noteTotalQty = decimalAdd(noteTotalQty, q, 4);

        const orig = origList.find(
          (o) => o.id === item.id || o.id === item.itemId || o.codigo === item.codigo
        );
        const unitPrice = orig
          ? cleanDecimalString(orig.valorUnitario || '0')
          : cleanDecimalString(item.valorUnitario || '0');

        const itemTotal = decimalMultiply(unitPrice, q, 2);
        noteProductTotal = decimalAdd(noteProductTotal, itemTotal, 2);
      }
    }

    return {
      noteId: note.id,
      numero: note.numero,
      allocatedItemsCount,
      totalQuantity: noteTotalQty,
      totalProducts: noteProductTotal,
    };
  });

  const hasExcess = excessCount > 0;
  const hasRemaining = remainingCount > 0;
  const isBalanced = origList.length > 0 && balancedCount === origList.length;

  // Regra clássica de divisão 1 -> M: requer ao menos 2 notas, sem sobras e sem excesso
  const canSave = notes.length >= 2 && !hasExcess && !hasRemaining && isBalanced;
  const isValid = !hasExcess && !hasRemaining && isBalanced;

  return {
    isValid,
    canSave,
    hasExcess,
    hasRemaining,
    isBalanced,
    summary: {
      totalItemsCount: origList.length,
      destinationNotesCount: notes.length,
      balancedCount,
      remainingCount,
      excessCount,
    },
    itemReports,
    notesSummary,
  };
}

/**
 * Distribui uma quantidade em partes estritamente iguais entre N notas.
 * Delega diretamente ao allocationEngine.js.
 */
export function distributeEqually(originalQtyStr, numNotes, scale = 4) {
  return engineDistributeEqually(originalQtyStr, numNotes, scale);
}

/**
 * Distribui o saldo restante de um item igualmente entre as notas de destino.
 * Delega diretamente ao allocationEngine.js.
 */
export function distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4) {
  return engineDistributeRemainingEqually(originalQtyStr, currentAllocations, scale);
}

/**
 * Rateia uma despesa acessória com base na proporção do valor dos produtos.
 * Delega diretamente ao allocationEngine.js.
 */
export function apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr) {
  return engineApportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr);
}

/**
 * Rateia todas as despesas acessórias entre as notas de destino com conservação estrita de saldos.
 * Delega ao apportionMultiSourceExpenses com N=1 origem.
 */
export function apportionAllInvoiceExpenses(parentTotals = {}, notesWithProducts = []) {
  // Chamada direta à função multiorigem de allocationEngine com N=1
  return apportionMultiSourceExpenses({ orig: parentTotals }, notesWithProducts, 'orig');
}
```

---

## 4. Revisão dos Testes de Baseline e Cobertura

Ao executar `npm test` em `c:\www\smart-nfe`:
- **104 suítes de teste**
- **383 testes executados**
- **383 testes aprovados (100% pass)**
- **Duração média**: ~9.94 segundos

### 4.1 Mapeamento das Áreas Cobertas pelos Testes de Baseline

| Componente | Suítes Principais | Quantidade de Testes | Invariantes Chave Auditadas |
|---|---|---|---|
| `decimal.js` | `tests/tier1/m1_foundation`, `tests/tier1/m2_domain`, `tests/tier2/m1_boundary_stress`, `tests/tier5/m2_decimal_adversarial_stress` | ~95 testes | IEEE-754 elimination (`0.1 + 0.2 = 0.30`), Half-Up ABNT NBR 5891, divisão por zero não quebra, suporte a grandes BigInts até $10^{15}$. |
| `divisionMath.js` | `tests/integration/flow_c_division_balances`, `tests/tier1/m2_domain` (Suite 3), `tests/tier5/m2_decimal_adversarial_stress` (Suite 4), `tests/tier5/m4_challenger_division_traps`, `tests/tier5/m4_challenger_expenses_persistence` | ~67 testes | 4 casas decimais de quantidades, divisão exata em partes iguais, rateio de despesas acessórias (frete, seguro, outras, desconto), absorção de resíduo de centavos na última nota ativa, oráculos aleatórios de 1.000 iterações. |
| `preparedInvoiceRepository.js` | `tests/tier1/m2_domain` (Suite 6), `tests/tier5/m2_challenger1_concurrency_validation`, `tests/tier5/m4_challenger_division_traps` (Suite 5), `tests/tier5/m4_challenger_expenses_persistence` (Suite 3) | ~25 testes | `create()`, `list()`, `delete()`, busca textual, filtragem de notas preparadas. |

---

## 5. Design da Nova Suíte: `tests/unit/allocationEngine.test.mjs`

A nova suíte `tests/unit/allocationEngine.test.mjs` foi desenhada para cobrir com rigor absoluto todas as exigências do Marco 1:

1. **Aritmética BigInt Nativa e Precisão Decimal** (sem float IEEE-754).
2. **Verificação de Compatibilidade de Unidades** (`checkUnitCompatibility`).
3. **Regra de Conservação Matemática** (`disponível = original - soma das alocações ativas`).
4. **Cenário 1: Agrupamento ($N \to 1$)** com preservação da identidade de origem (`sourceInvoiceId + sourceItemId`) e não fusão de fornecedores distintos.
5. **Cenário 2: Divisão ($1 \to M$)** com frações periódicas e absorção de resíduos.
6. **Cenário 3: Preparação Mista ($N \to M$)** com matriz bidimensional de alocações.
7. **Rateio Proporcional de Despesas Acessórias Multiorigem** com zero drift ao centavo.
8. **Invariantes e Resiliência Adversarial** (injeções trojanas negativas, entradas malformadas, matriz vazia).

Abaixo está o código de design completo:

```javascript
/**
 * SmartNFe — Comprehensive Unit Test Suite: Unified Allocation Engine
 * 
 * Target: app/lib/calculations/allocationEngine.js
 * Scope: Milestone 1 (Domain Model & Unified Allocation Engine)
 * Requirements: R4 (ORIGINAL_REQUEST.md, PROJECT.md, SCOPE.md)
 * 
 * Verifies:
 * 1. BigInt pure decimal arithmetic (zero IEEE-754 binary float leakage).
 * 2. Unit compatibility checks (checkUnitCompatibility).
 * 3. Strict conservation rule (available = original - activeAllocations).
 * 4. Scenario N -> 1 (Grouping / Agrupamento) with origin identity preservation.
 * 5. Scenario 1 -> M (Division / Desmembramento) with exact remainder absorption.
 * 6. Scenario N -> M (Mixed Allocation / Preparação Mista) with composite keys.
 * 7. Multi-source accessory expense apportionment (frete, seguro, outras, desconto).
 * 8. Adversarial boundaries, negative quantity blocking, and invariant oracles.
 * 
 * Execution: node --no-warnings --test tests/unit/allocationEngine.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateAllocationMatrix,
  calculateItemBalance,
  checkUnitCompatibility,
  distributeEqually,
  distributeRemainingEqually,
  apportionExpenses,
  apportionMultiSourceExpenses,
  makeSourceKey,
  parseSourceKey,
} from '../../app/lib/calculations/allocationEngine.js';

import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
  roundDecimal,
} from '../../app/lib/calculations/decimal.js';

// ============================================================================
// SUITE 1: Native BigInt Math & Decimal Precision
// ============================================================================
describe('SUITE 1: Native BigInt Math & Decimal Precision in Allocation', () => {
  it('1.1: Elimina erro clássico IEEE-754 em somatórios de matriz de alocação (0.1 + 0.2 === 0.3000)', () => {
    const origQty = '0.3000';
    const balance = calculateItemBalance(origQty, ['0.1000', '0.2000']);
    assert.strictEqual(balance.status, 'ok');
    assert.strictEqual(balance.isOk, true);
    assert.strictEqual(balance.totalAllocatedStr, '0.3000');
    assert.strictEqual(balance.balanceStr, '0.0000');
    assert.strictEqual(balance.hasExcess, false);
  });

  it('1.2: Conserva rigorosamente 4 casas decimais em quantidades fiscais (ex: 125.1234)', () => {
    const origQty = '500.5555';
    const allocs = ['250.2222', '250.3333'];
    const balance = calculateItemBalance(origQty, allocs);
    assert.strictEqual(balance.status, 'ok');
    assert.strictEqual(balance.totalAllocatedStr, '500.5555');
    assert.strictEqual(balance.balanceStr, '0.0000');
  });

  it('1.3: Arredondamento fiscal Half-Up estrito no cálculo de valor de linha (preço * quantidade)', () => {
    // 33.3333 * 12.3456 = 411.51952288 -> Half-Up para 2 casas: 411.52
    const sourceItems = [
      {
        id: 'item-1',
        sourceInvoiceId: 'nfe-01',
        sourceItemId: 'i-1',
        codigo: 'PROD-A',
        quantidade: '33.3333',
        valorUnitario: '12.3456',
      },
    ];
    const destinationNotes = [
      {
        id: 'dest-1',
        allocations: {
          'nfe-01__i-1': '33.3333',
        },
      },
    ];

    const result = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const cell = result.matrix['dest-1']['nfe-01__i-1'];
    assert.ok(cell, 'Célula de matriz deve existir');
    assert.strictEqual(cell.allocatedQty, '33.3333');
    assert.strictEqual(cell.lineTotal, '411.52');
  });

  it('1.4: Rejeita e sinaliza valores negativos imediatamente (hasNegative / excess)', () => {
    const balance = calculateItemBalance('100.0000', ['50.0000', '-10.0000', '60.0000']);
    assert.strictEqual(balance.status, 'excess');
    assert.strictEqual(balance.hasExcess, true);
    assert.strictEqual(balance.hasNegative, true);
    assert.strictEqual(balance.isOk, false);
  });
});

// ============================================================================
// SUITE 2: Unit Compatibility Checks (checkUnitCompatibility)
// ============================================================================
describe('SUITE 2: Unit Compatibility Checks (checkUnitCompatibility)', () => {
  it('2.1: Unidades idênticas em strings são compatíveis (KG === KG, UN === UN)', () => {
    assert.strictEqual(checkUnitCompatibility('KG', 'KG'), true);
    assert.strictEqual(checkUnitCompatibility('UN', 'UN'), true);
    assert.strictEqual(checkUnitCompatibility('CX', 'CX'), true);
    assert.strictEqual(checkUnitCompatibility('M', 'M'), true);
  });

  it('2.2: Normaliza maiúsculas/minúsculas e espaços em branco ("  kg  " === "KG")', () => {
    assert.strictEqual(checkUnitCompatibility('  kg  ', 'KG'), true);
    assert.strictEqual(checkUnitCompatibility('un', 'UN'), true);
    assert.strictEqual(checkUnitCompatibility('cx ', ' CX'), true);
  });

  it('2.3: Rejeita unidades incompatíveis com naturezas físicas distintas ("KG" vs "UN")', () => {
    assert.strictEqual(checkUnitCompatibility('KG', 'UN'), false);
    assert.strictEqual(checkUnitCompatibility('TON', 'CX'), false);
    assert.strictEqual(checkUnitCompatibility('L', 'M'), false);
    assert.strictEqual(checkUnitCompatibility('PAR', 'M2'), false);
  });

  it('2.4: Suporta entrada como objetos fiscais de itens ({ unidade: "KG" })', () => {
    const item1 = { codigo: 'P1', unidade: 'KG' };
    const item2 = { codigo: 'P2', unidade: 'kg' };
    const item3 = { codigo: 'P3', uCom: 'KG' };
    const item4 = { codigo: 'P4', unidade: 'UN' };

    assert.strictEqual(checkUnitCompatibility(item1, item2), true);
    assert.strictEqual(checkUnitCompatibility(item1, item3), true);
    assert.strictEqual(checkUnitCompatibility(item1, item4), false);
  });

  it('2.5: Reconhece sinônimos padronizados aduaneiros (KG/KGS, UN/UNID, TON/T)', () => {
    assert.strictEqual(checkUnitCompatibility('KG', 'KGS'), true);
    assert.strictEqual(checkUnitCompatibility('UN', 'UNID'), true);
    assert.strictEqual(checkUnitCompatibility('TON', 'T'), true);
    assert.strictEqual(checkUnitCompatibility('CX', 'CXA'), true);
  });
});

// ============================================================================
// SUITE 3: Strict Mathematical Conservation Rule
// ============================================================================
describe('SUITE 3: Strict Conservation Rule (disponível = original - alocações ativas)', () => {
  it('3.1: Sem alocações: saldo disponível é identicamente igual ao original', () => {
    const sourceItems = [
      {
        id: 'i-1',
        sourceInvoiceId: 'nfe-10',
        sourceItemId: 'i-1',
        quantidade: '1000.0000',
        valorUnitario: '10.00',
      },
    ];
    const destinationNotes = [{ id: 'dest-1', allocations: {} }];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const key = makeSourceKey('nfe-10', 'i-1');
    const bal = res.sourceBalances[key];

    assert.strictEqual(bal.originalQty, '1000.0000');
    assert.strictEqual(bal.allocatedQtyTotal, '0.0000');
    assert.strictEqual(bal.remainingQty, '1000.0000');
    assert.strictEqual(bal.status, 'partial'); // ou 'ok' com saldo integral
    assert.strictEqual(bal.hasExcess, false);
    assert.strictEqual(res.canSave, true);
  });

  it('3.2: Alocação parcial: calcula saldo restante com exatidão sem sobras ocultas', () => {
    const sourceItems = [
      {
        id: 'i-1',
        sourceInvoiceId: 'nfe-10',
        sourceItemId: 'i-1',
        quantidade: '1000.0000',
        valorUnitario: '10.00',
      },
    ];
    const destinationNotes = [
      { id: 'dest-1', allocations: { 'nfe-10__i-1': '350.5000' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const bal = res.sourceBalances['nfe-10__i-1'];

    assert.strictEqual(bal.allocatedQtyTotal, '350.5000');
    assert.strictEqual(bal.remainingQty, '649.5000');
    assert.strictEqual(bal.status, 'partial');
    assert.strictEqual(bal.hasExcess, false);
    assert.strictEqual(res.canSave, true);
  });

  it('3.3: Alocação integral (100%): saldo disponível zera perfeitamente (status: ok)', () => {
    const sourceItems = [
      {
        id: 'i-1',
        sourceInvoiceId: 'nfe-10',
        sourceItemId: 'i-1',
        quantidade: '500.0000',
        valorUnitario: '50.00',
      },
    ];
    const destinationNotes = [
      { id: 'dest-1', allocations: { 'nfe-10__i-1': '500.0000' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const bal = res.sourceBalances['nfe-10__i-1'];

    assert.strictEqual(bal.allocatedQtyTotal, '500.0000');
    assert.strictEqual(bal.remainingQty, '0.0000');
    assert.strictEqual(bal.status, 'ok');
    assert.strictEqual(bal.hasExcess, false);
    assert.strictEqual(res.canSave, true);
  });

  it('3.4: Alocação em excesso bloqueia salvamento (canSave: false, hasExcess: true)', () => {
    const sourceItems = [
      {
        id: 'i-1',
        sourceInvoiceId: 'nfe-10',
        sourceItemId: 'i-1',
        quantidade: '100.0000',
        valorUnitario: '10.00',
      },
    ];
    const destinationNotes = [
      { id: 'dest-1', allocations: { 'nfe-10__i-1': '100.0001' } }, // Excesso de 0.0001
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const bal = res.sourceBalances['nfe-10__i-1'];

    assert.strictEqual(bal.hasExcess, true);
    assert.strictEqual(bal.status, 'excess');
    assert.strictEqual(bal.remainingQty, '-0.0001');
    assert.strictEqual(res.canSave, false);
  });

  it('3.5: Desconta alocações ativas externas de outras preparações antes da alocação corrente', () => {
    const sourceItems = [
      {
        id: 'i-1',
        sourceInvoiceId: 'nfe-10',
        sourceItemId: 'i-1',
        quantidade: '1000.0000',
        valorUnitario: '10.00',
      },
    ];
    // Outra preparação ativa já consumiu 400.0000 deste item
    const activeAllocations = {
      'nfe-10__i-1': '400.0000',
    };

    // Usuário tenta alocar 600.0000 (disponível = 1000 - 400 = 600) -> OK
    const destNotesOk = [
      { id: 'dest-1', allocations: { 'nfe-10__i-1': '600.0000' } },
    ];
    const resOk = calculateAllocationMatrix(sourceItems, destNotesOk, activeAllocations);
    assert.strictEqual(resOk.canSave, true);
    assert.strictEqual(resOk.sourceBalances['nfe-10__i-1'].remainingQty, '0.0000');

    // Usuário tenta alocar 600.0001 -> BLOQUEIA!
    const destNotesExcess = [
      { id: 'dest-1', allocations: { 'nfe-10__i-1': '600.0001' } },
    ];
    const resExcess = calculateAllocationMatrix(sourceItems, destNotesExcess, activeAllocations);
    assert.strictEqual(resExcess.canSave, false);
    assert.strictEqual(resExcess.sourceBalances['nfe-10__i-1'].hasExcess, true);
  });
});

// ============================================================================
// SUITE 4: Scenario 1 — Agrupamento (N Origens -> 1 Destino)
// ============================================================================
describe('SUITE 4: Scenario 1 — Agrupamento (N Origens -> 1 Destino)', () => {
  it('4.1: Agrupa itens de 2 fornecedores distintos em 1 nota de exportação', () => {
    const sourceItems = [
      {
        id: 'd1-1',
        sourceInvoiceId: 'demo-01',
        sourceItemId: 'd1-1',
        codigo: 'SOJA-01',
        descricao: 'Soja em Grãos Transgênica',
        ncm: '12019000',
        unidade: 'KG',
        quantidade: '500.0000',
        valorUnitario: '2.50',
      },
      {
        id: 'd5-1',
        sourceInvoiceId: 'demo-05',
        sourceItemId: 'd5-1',
        codigo: 'MILHO-02',
        descricao: 'Milho em Grãos Seco',
        ncm: '10059010',
        unidade: 'KG',
        quantidade: '1000.0000',
        valorUnitario: '1.80',
      },
    ];

    const destinationNotes = [
      {
        id: 'dest-exp-1',
        allocations: {
          'demo-01__d1-1': '500.0000',
          'demo-05__d5-1': '1000.0000',
        },
      },
    ];

    const result = calculateAllocationMatrix(sourceItems, destinationNotes, {});

    assert.strictEqual(result.canSave, true);
    assert.strictEqual(result.totals.totalSourceItems, 2);
    assert.strictEqual(result.totals.totalAllocatedItems, 2);

    // Totais financeiros: 500*2.50 (1250.00) + 1000*1.80 (1800.00) = 3050.00
    assert.strictEqual(result.totals.totalAllocatedValue, '3050.00');

    // Verifica células individuais da nota de destino
    const destMatrix = result.matrix['dest-exp-1'];
    assert.strictEqual(destMatrix['demo-01__d1-1'].lineTotal, '1250.00');
    assert.strictEqual(destMatrix['demo-05__d5-1'].lineTotal, '1800.00');
  });

  it('4.2: Preserva estritamente a identidade de origem (sourceInvoiceId + sourceItemId)', () => {
    const key1 = makeSourceKey('demo-01', 'item-42');
    const parsed1 = parseSourceKey(key1);
    assert.strictEqual(parsed1.sourceInvoiceId, 'demo-01');
    assert.strictEqual(parsed1.sourceItemId, 'item-42');

    const sourceItems = [
      {
        id: 'i-A',
        sourceInvoiceId: 'nfe-forn-1',
        sourceItemId: 'item-orig-1',
        codigo: 'PROD-A',
        quantidade: '100.0000',
        valorUnitario: '10.00',
      },
    ];
    const destinationNotes = [
      { id: 'dest-1', allocations: { 'nfe-forn-1__item-orig-1': '100.0000' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const cell = res.matrix['dest-1']['nfe-forn-1__item-orig-1'];
    assert.strictEqual(cell.sourceInvoiceId, 'nfe-forn-1');
    assert.strictEqual(cell.sourceItemId, 'item-orig-1');
  });

  it('4.3: JAMAIS funde mercadorias iguais de fornecedores distintos em uma única linha', () => {
    // Dois fornecedores distintos entregam Soja com mesmo código e mesmo NCM
    const sourceItems = [
      {
        id: 'f1-soja',
        sourceInvoiceId: 'fornecedor-alpha',
        sourceItemId: 'item-1',
        codigo: 'SOJA-GRAO',
        descricao: 'Soja em Grãos',
        ncm: '12019000',
        quantidade: '300.0000',
        valorUnitario: '2.00',
      },
      {
        id: 'f2-soja',
        sourceInvoiceId: 'fornecedor-beta',
        sourceItemId: 'item-1', // Mesmo itemId dentro de cada NF, mas invoices distintas!
        codigo: 'SOJA-GRAO',
        descricao: 'Soja em Grãos',
        ncm: '12019000',
        quantidade: '400.0000',
        valorUnitario: '2.10',
      },
    ];

    const destinationNotes = [
      {
        id: 'dest-1',
        allocations: {
          'fornecedor-alpha__item-1': '300.0000',
          'fornecedor-beta__item-1': '400.0000',
        },
      },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const destCells = res.matrix['dest-1'];

    // Devem existir DUAS chaves distintas na matriz do destino
    assert.ok(destCells['fornecedor-alpha__item-1'], 'Alpha deve existir como linha própria');
    assert.ok(destCells['fornecedor-beta__item-1'], 'Beta deve existir como linha própria');

    assert.strictEqual(destCells['fornecedor-alpha__item-1'].lineTotal, '600.00');
    assert.strictEqual(destCells['fornecedor-beta__item-1'].lineTotal, '840.00');
    assert.notStrictEqual(destCells['fornecedor-alpha__item-1'].sourceInvoiceId, destCells['fornecedor-beta__item-1'].sourceInvoiceId);
  });
});

// ============================================================================
// SUITE 5: Scenario 2 — Divisão (1 Origem -> M Destinos)
// ============================================================================
describe('SUITE 5: Scenario 2 — Divisão (1 Origem -> M Destinos)', () => {
  it('5.1: Divide 1 nota fiscal de 1500 KG perfeitamente entre 3 destinos (500 KG cada)', () => {
    const sourceItems = [
      {
        id: 'item-1',
        sourceInvoiceId: 'nfe-orig-1',
        sourceItemId: 'item-1',
        codigo: 'BOB-ACO',
        quantidade: '1500.0000',
        valorUnitario: '10.00',
      },
    ];

    const destinationNotes = [
      { id: 'dest-A', allocations: { 'nfe-orig-1__item-1': '500.0000' } },
      { id: 'dest-B', allocations: { 'nfe-orig-1__item-1': '500.0000' } },
      { id: 'dest-C', allocations: { 'nfe-orig-1__item-1': '500.0000' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    assert.strictEqual(res.canSave, true);
    assert.strictEqual(res.sourceBalances['nfe-orig-1__item-1'].status, 'ok');
    assert.strictEqual(res.sourceBalances['nfe-orig-1__item-1'].remainingQty, '0.0000');

    assert.strictEqual(res.matrix['dest-A']['nfe-orig-1__item-1'].lineTotal, '5000.00');
    assert.strictEqual(res.matrix['dest-B']['nfe-orig-1__item-1'].lineTotal, '5000.00');
    assert.strictEqual(res.matrix['dest-C']['nfe-orig-1__item-1'].lineTotal, '5000.00');
  });

  it('5.2: Divisão em partes iguais com dízima periódica (100.0000 / 3) via distributeEqually', () => {
    const slices = distributeEqually('100.0000', 3, 4);
    assert.strictEqual(slices.length, 3);
    assert.strictEqual(slices[0], '33.3333');
    assert.strictEqual(slices[1], '33.3333');
    assert.strictEqual(slices[2], '33.3334'); // Compensação de resíduo exato

    const sum = slices.reduce((acc, s) => decimalAdd(acc, s, 4), '0.0000');
    assert.strictEqual(sum, '100.0000');
  });

  it('5.3: distributeRemainingEqually zera o saldo remanescente entre destinos', () => {
    const orig = '500.0000';
    const current = ['200.0000', '100.0000']; // Restam 200.0000
    const updated = distributeRemainingEqually(orig, current, 4);

    assert.strictEqual(updated.length, 2);
    assert.strictEqual(updated[0], '300.0000'); // 200 + 100
    assert.strictEqual(updated[1], '200.0000'); // 100 + 100

    const sum = updated.reduce((acc, s) => decimalAdd(acc, s, 4), '0.0000');
    assert.strictEqual(sum, '500.0000');
  });
});

// ============================================================================
// SUITE 6: Scenario 3 — Preparação Mista (N Origens -> M Destinos)
// ============================================================================
describe('SUITE 6: Scenario 3 — Preparação Mista (N Origens -> M Destinos)', () => {
  it('6.1: Matriz completa com 3 origens e 2 destinos com alocações cruzadas', () => {
    const sourceItems = [
      {
        id: 's1-i1',
        sourceInvoiceId: 'nfe-s1',
        sourceItemId: 'i1',
        quantidade: '1000.0000',
        valorUnitario: '10.00',
      },
      {
        id: 's2-i1',
        sourceInvoiceId: 'nfe-s2',
        sourceItemId: 'i1',
        quantidade: '600.0000',
        valorUnitario: '20.00',
      },
      {
        id: 's3-i1',
        sourceInvoiceId: 'nfe-s3',
        sourceItemId: 'i1',
        quantidade: '400.0000',
        valorUnitario: '30.00',
      },
    ];

    // Dest 1 recebe: 600 de s1, 300 de s2, 0 de s3
    // Dest 2 recebe: 400 de s1, 300 de s2, 400 de s3
    const destinationNotes = [
      {
        id: 'dest-1',
        allocations: {
          'nfe-s1__i1': '600.0000',
          'nfe-s2__i1': '300.0000',
        },
      },
      {
        id: 'dest-2',
        allocations: {
          'nfe-s1__i1': '400.0000',
          'nfe-s2__i1': '300.0000',
          'nfe-s3__i1': '400.0000',
        },
      },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    assert.strictEqual(res.canSave, true);

    // Verifica balanço de cada origem: 100% alocadas
    assert.strictEqual(res.sourceBalances['nfe-s1__i1'].status, 'ok');
    assert.strictEqual(res.sourceBalances['nfe-s2__i1'].status, 'ok');
    assert.strictEqual(res.sourceBalances['nfe-s3__i1'].status, 'ok');

    // Totais por destino:
    // Dest 1: 600*10 (6000) + 300*20 (6000) = 12000.00
    // Dest 2: 400*10 (4000) + 300*20 (6000) + 400*30 (12000) = 22000.00
    const m1 = res.matrix['dest-1'];
    const totalDest1 = decimalAdd(m1['nfe-s1__i1'].lineTotal, m1['nfe-s2__i1'].lineTotal, 2);
    assert.strictEqual(totalDest1, '12000.00');

    const m2 = res.matrix['dest-2'];
    const totalDest2 = decimalAdd(
      decimalAdd(m2['nfe-s1__i1'].lineTotal, m2['nfe-s2__i1'].lineTotal, 2),
      m2['nfe-s3__i1'].lineTotal,
      2
    );
    assert.strictEqual(totalDest2, '22000.00');

    // Total consolidado: 12000 + 22000 = 34000.00
    assert.strictEqual(res.totals.totalAllocatedValue, '34000.00');
  });

  it('6.2: Conservação perfeita de itens: a soma alocada em todos os destinos confere exatamente', () => {
    const sourceItems = [
      {
        id: 'it-1',
        sourceInvoiceId: 'nf-1',
        sourceItemId: 'it-1',
        quantidade: '777.7777',
        valorUnitario: '5.00',
      },
    ];
    const destinationNotes = [
      { id: 'd-1', allocations: { 'nf-1__it-1': '250.0000' } },
      { id: 'd-2', allocations: { 'nf-1__it-1': '250.0000' } },
      { id: 'd-3', allocations: { 'nf-1__it-1': '277.7777' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const bal = res.sourceBalances['nf-1__it-1'];
    assert.strictEqual(bal.allocatedQtyTotal, '777.7777');
    assert.strictEqual(bal.remainingQty, '0.0000');
    assert.strictEqual(bal.status, 'ok');
  });
});

// ============================================================================
// SUITE 7: Proportional Accessory Expense Apportionment (Multi-Source Zero Drift)
// ============================================================================
describe('SUITE 7: Multi-Source Accessory Expense Apportionment', () => {
  it('7.1: Rateio de frete e despesas de 1 origem única entre 2 destinos (60% / 40%)', () => {
    const origFrete = '5000.00';
    const note1Products = '60000.00';
    const note2Products = '40000.00';
    const totalProducts = '100000.00';

    const f1 = apportionExpenses(origFrete, note1Products, totalProducts);
    const f2 = apportionExpenses(origFrete, note2Products, totalProducts);

    assert.strictEqual(f1, '3000.00');
    assert.strictEqual(f2, '2000.00');
    assert.strictEqual(decimalAdd(f1, f2, 2), origFrete);
  });

  it('7.2: Rateio com absorção exata de centavos ímpares (R$ 100,00 entre 3 notas iguais)', () => {
    const parentTotals = {
      valorFrete: '100.00',
      valorSeguro: '50.00',
      outrasDespesas: '10.00',
      valorDesconto: '20.00',
    };
    const notesWithProducts = [
      { id: 'd1', productTotal: '1000.00' },
      { id: 'd2', productTotal: '1000.00' },
      { id: 'd3', productTotal: '1000.00' },
    ];

    const result = apportionMultiSourceExpenses({ s1: parentTotals }, notesWithProducts, 's1');

    // 100 / 3 = 33.33, 33.33, 33.34
    assert.strictEqual(result.d1.valorFrete, '33.33');
    assert.strictEqual(result.d2.valorFrete, '33.33');
    assert.strictEqual(result.d3.valorFrete, '33.34');

    const sumFrete = decimalAdd(decimalAdd(result.d1.valorFrete, result.d2.valorFrete, 2), result.d3.valorFrete, 2);
    assert.strictEqual(sumFrete, '100.00', 'Soma do frete deve ser identicamente 100.00');

    // Suporta chaves em inglês
    assert.strictEqual(result.d3.freight, '33.34');
    assert.strictEqual(result.d3.insurance, '16.68'); // 50 / 3 -> 16.66 + 16.66 + 16.68
  });

  it('7.3: Rateio simultâneo de despesas acessórias de 2 origens distintas para 2 destinos', () => {
    // Origem 1 possui frete de 1000.00
    // Origem 2 possui frete de 2000.00
    const sourceInvoicesTotals = {
      orig1: { valorFrete: '1000.00', valorSeguro: '0.00', outrasDespesas: '0.00', valorDesconto: '0.00' },
      orig2: { valorFrete: '2000.00', valorSeguro: '0.00', outrasDespesas: '0.00', valorDesconto: '0.00' },
    };

    // Dest 1 recebe 50% de orig1 e 25% de orig2
    // Dest 2 recebe 50% de orig1 e 75% de orig2
    const allocationsBySource = {
      orig1: [
        { id: 'dest-1', productTotal: '5000.00' },
        { id: 'dest-2', productTotal: '5000.00' },
      ],
      orig2: [
        { id: 'dest-1', productTotal: '2500.00' },
        { id: 'dest-2', productTotal: '7500.00' },
      ],
    };

    // Rateio consolidado
    const r1 = apportionMultiSourceExpenses(sourceInvoicesTotals, allocationsBySource.orig1, 'orig1');
    const r2 = apportionMultiSourceExpenses(sourceInvoicesTotals, allocationsBySource.orig2, 'orig2');

    // Dest 1 recebe 500.00 de orig1 + 500.00 de orig2 = 1000.00
    const dest1FreteTotal = decimalAdd(r1['dest-1'].valorFrete, r2['dest-1'].valorFrete, 2);
    assert.strictEqual(dest1FreteTotal, '1000.00');

    // Dest 2 recebe 500.00 de orig1 + 1500.00 de orig2 = 2000.00
    const dest2FreteTotal = decimalAdd(r1['dest-2'].valorFrete, r2['dest-2'].valorFrete, 2);
    assert.strictEqual(dest2FreteTotal, '2000.00');

    // Total geral dos fretes: 1000 + 2000 = 3000.00
    assert.strictEqual(decimalAdd(dest1FreteTotal, dest2FreteTotal, 2), '3000.00');
  });

  it('7.4: Destino com total de produtos R$ 0,00 recebe R$ 0,00 de despesas acessórias', () => {
    const parentTotals = { valorFrete: '500.00' };
    const notesWithProducts = [
      { id: 'dest-ativa', productTotal: '2500.00' },
      { id: 'dest-zerada', productTotal: '0.00' },
    ];

    const res = apportionMultiSourceExpenses({ s1: parentTotals }, notesWithProducts, 's1');
    assert.strictEqual(res['dest-zerada'].valorFrete, '0.00');
    assert.strictEqual(res['dest-ativa'].valorFrete, '500.00');
  });
});

// ============================================================================
// SUITE 8: Invariant Oracles & Adversarial Boundaries
// ============================================================================
describe('SUITE 8: Invariant Oracles & Adversarial Boundaries', () => {
  it('8.1: Invariante: Em qualquer alocação válida, soma(alocada) + restante === original', () => {
    const sourceItems = [
      {
        id: 'it-inv',
        sourceInvoiceId: 'nfe-x',
        sourceItemId: 'it-inv',
        quantidade: '987.6543',
        valorUnitario: '15.00',
      },
    ];
    const destinationNotes = [
      { id: 'd1', allocations: { 'nfe-x__it-inv': '123.4567' } },
      { id: 'd2', allocations: { 'nfe-x__it-inv': '456.7890' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    const bal = res.sourceBalances['nfe-x__it-inv'];

    const sum = decimalAdd(bal.allocatedQtyTotal, bal.remainingQty, 4);
    assert.strictEqual(sum, '987.6543');
    assert.strictEqual(res.canSave, true);
  });

  it('8.2: Injeção trojana de quantidade negativa bloqueia canSave mesmo com soma < original', () => {
    const sourceItems = [
      {
        id: 'it-1',
        sourceInvoiceId: 'nfe-1',
        sourceItemId: 'it-1',
        quantidade: '100.0000',
        valorUnitario: '10.00',
      },
    ];
    const destinationNotes = [
      { id: 'd1', allocations: { 'nfe-1__it-1': '-10.0000' } },
      { id: 'd2', allocations: { 'nfe-1__it-1': '50.0000' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    assert.strictEqual(res.canSave, false, 'Deve bloquear salvamento com quantidade negativa');
    assert.strictEqual(res.sourceBalances['nfe-1__it-1'].hasExcess, true);
  });

  it('8.3: Tentativa de compensação por soma zero (+120 e -20 = 100) é estritamente bloqueada', () => {
    const sourceItems = [
      {
        id: 'it-1',
        sourceInvoiceId: 'nfe-1',
        sourceItemId: 'it-1',
        quantidade: '100.0000',
        valorUnitario: '10.00',
      },
    ];
    const destinationNotes = [
      { id: 'd1', allocations: { 'nfe-1__it-1': '120.0000' } },
      { id: 'd2', allocations: { 'nfe-1__it-1': '-20.0000' } },
    ];

    const res = calculateAllocationMatrix(sourceItems, destinationNotes, {});
    assert.strictEqual(res.canSave, false);
    assert.strictEqual(res.sourceBalances['nfe-1__it-1'].hasExcess, true);
  });

  it('8.4: Entradas vazias degradam graciosamente sem lançar exceções', () => {
    const res = calculateAllocationMatrix([], [], {});
    assert.strictEqual(res.canSave, true);
    assert.strictEqual(res.totals.totalSourceItems, 0);
    assert.strictEqual(res.totals.totalAllocatedItems, 0);
    assert.strictEqual(res.totals.totalAllocatedValue, '0.00');
    assert.deepStrictEqual(res.matrix, {});
  });
});
```

---

## 6. Recomendações e Plano de Ação para o Worker M1

1. **Implementar `allocationEngine.js`**:
   - Criar `app/lib/calculations/allocationEngine.js` exportando:
     - `calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations)`
     - `calculateItemBalance(originalQtyStr, allocatedQtyArray, activeAllocationsTotal = '0')`
     - `checkUnitCompatibility(itemA, itemB)`
     - `distributeEqually(originalQtyStr, numNotes, scale = 4)`
     - `distributeRemainingEqually(originalQtyStr, currentAllocations, scale = 4)`
     - `apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr)`
     - `apportionMultiSourceExpenses(sourceInvoicesTotals, destinationAllocationsBySource, sourceInvoiceId)`
     - `makeSourceKey(sourceInvoiceId, sourceItemId)`
     - `parseSourceKey(sourceKey)`
2. **Atualizar `app/lib/calculations/index.js`**:
   - Adicionar `export * from './allocationEngine.js';`.
3. **Refatorar `app/lib/calculations/divisionMath.js`**:
   - Aplicar a implementação detalhada na Seção 3.2.
4. **Implementar a Nova Suíte de Testes Unitários**:
   - Criar `tests/unit/allocationEngine.test.mjs` com as 8 suítes detalhadas na Seção 5.
5. **Verificação Completa de Qualidade**:
   - Rodar `node --no-warnings --test tests/unit/allocationEngine.test.mjs`.
   - Rodar `npm test` confirmando que os 383 testes de baseline continuam 100% aprovados, totalizando agora mais de 400 testes passando.
   - Rodar `npm run lint`.
