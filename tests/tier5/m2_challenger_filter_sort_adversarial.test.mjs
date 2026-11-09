/**
 * SmartNFe — Tier 5 Adversarial Stress Suite: Milestone 2 Conference Table
 * Challenger: ItemId Stability, Severe Filtering, Sort Flip-Flops & Snapshot Preservation
 *
 * Requirements: R1, R4 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Verificações adversariais cobertas:
 * 1. Static AST / Code Invariant Audit:
 *    - Eliminação estrita de parseFloat, toFixed, Math.round, Math.floor em conferencia/page.jsx.
 *    - Vinculação de inputs por itemId exclusivo (nenhuma ocorrência de mutação por index).
 *    - Preservação obrigatória de despesas acessórias (frete, seguro, outras despesas, descontos).
 * 2. Duplicate cProd / Código repetido (Cenário demo-05 — 15 itens, 3 códigos em 5 lotes):
 *    - Edição na linha 4 (d5-4, SOJA-GR-01) NUNCA corrompe a linha 1 (d5-1, SOJA-GR-01).
 *    - Edição simultânea em todas as 5 linhas duplicadas mantém isolamento estrito de estado.
 * 3. Edições rápidas sob restrições severas de filtro dinâmico:
 *    - Filtro por descrição parcial ('Lote L03', 'Soja', 'Milho').
 *    - Filtro por NCM de 8 dígitos ('12019000', '10059010', '10079000').
 *    - Filtro com resultado vazio (zero itens) e restauração para lista completa.
 *    - Bateria de 50 ciclos aleatórios de filtro + mutação com verificação de não-corrupção colateral.
 * 4. Inversão e alternância de ordenação de colunas (Sort Flip-Flops):
 *    - Ordenação ascendente por quantidade -> edição da linha no topo -> ordenação descendente.
 *    - Ordenação mista (item, descricao, valorTotal via decimalCompare, valorUnitario).
 *    - Garantia empírica de ancoragem de mutações ao itemId e não ao índice visual renderizado.
 * 5. Imutabilidade profunda do Snapshot e Rollback em cascata:
 *    - 10 edições sequenciais em cadeia no mesmo item retêm o snapshot original inicial v0.
 *    - Restauração unitária (handleRestoreItem) restaura o item com exatidão bit-a-bit e sem tocar nos demais.
 *    - Restauração em lote (handleRestoreAll) reverte múltiplos itens alterados simultaneamente.
 * 6. Preservação integral de despesas acessórias e cálculo decimal BigInt:
 *    - Conservação de frete, seguro, outras despesas e descontos em edições e recálculos.
 *    - Zero drift de ponto flutuante em quantias fracionadas e 4 casas decimais.
 *
 * Execução: node --no-warnings --test tests/tier5/m2_challenger_filter_sort_adversarial.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '../../app/lib/calculations/invoiceTotals.js';
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
  isDecimalZero,
  isDecimalNegative,
  cleanDecimalString,
} from '../../app/lib/calculations/decimal.js';
import { getMockInvoiceById } from '../../app/lib/data/mockInvoices.js';

const ROOT_DIR = process.cwd();
const CONFERENCIA_PAGE_PATH = resolve(ROOT_DIR, 'app/documentos/[id]/conferencia/page.jsx');

/**
 * Cria um controlador fiel de estado da tela de conferência para testes determinísticos.
 * Implementa exatamente a mesma máquina de estados e redutores de `app/documentos/[id]/conferencia/page.jsx`.
 */
function createConferenceController(initialInvoice) {
  let invoice = JSON.parse(JSON.stringify(initialInvoice));
  let items = JSON.parse(JSON.stringify(initialInvoice.itens || []));
  let searchTerm = '';
  let sortConfig = { key: null, direction: 'asc' };
  let hasChanges = false;

  const controller = {
    getInvoice: () => invoice,
    getItems: () => items,
    getSearchTerm: () => searchTerm,
    getSortConfig: () => ({ ...sortConfig }),
    getHasChanges: () => hasChanges,

    setSearchTerm: (term) => {
      searchTerm = term;
    },

    handleSort: (key) => {
      if (sortConfig.key === key) {
        sortConfig = {
          key,
          direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
        };
      } else {
        sortConfig = { key, direction: 'asc' };
      }
    },

    getFilteredAndSortedItems: () => {
      let result = items;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(
          (it) =>
            it.codigo?.toLowerCase().includes(term) ||
            it.descricao?.toLowerCase().includes(term) ||
            it.ncm?.toLowerCase().includes(term) ||
            it.cfop?.toLowerCase().includes(term)
        );
      }

      if (sortConfig.key) {
        result = [...result].sort((a, b) => {
          const valA = a[sortConfig.key];
          const valB = b[sortConfig.key];

          if (['quantidade', 'valorUnitario', 'valorTotal'].includes(sortConfig.key)) {
            const cmp = decimalCompare(valA || '0', valB || '0');
            return sortConfig.direction === 'asc' ? cmp : -cmp;
          }

          if (sortConfig.key === 'item') {
            const numA = Number(valA || 0);
            const numB = Number(valB || 0);
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }

          const strA = String(valA || '').toLowerCase();
          const strB = String(valB || '').toLowerCase();
          const cmp = strA.localeCompare(strB);
          return sortConfig.direction === 'asc' ? cmp : -cmp;
        });
      }

      return result;
    },

    handleItemChange: (itemId, field, value) => {
      items = items.map((item) => {
        if (item.id !== itemId) return item;

        const valorOriginal = item.valorOriginal || {
          item: item.item,
          codigo: item.codigo,
          descricao: item.descricao,
          ncm: item.ncm,
          cfop: item.cfop,
          unidade: item.unidade,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
        };

        const updated = {
          ...item,
          [field]: value,
          modificado: true,
          valorOriginal,
        };

        if (field === 'quantidade' || field === 'valorUnitario') {
          const q = field === 'quantidade' ? value : item.quantidade;
          const u = field === 'valorUnitario' ? value : item.valorUnitario;
          updated.valorTotal = calculateItemTotal(u, q);
        }

        return updated;
      });
      hasChanges = true;
    },

    handleRestoreItem: (itemId) => {
      items = items.map((item) => {
        if (item.id !== itemId || !item.valorOriginal) return item;
        return {
          ...item,
          ...item.valorOriginal,
          modificado: false,
          valorOriginal: null,
        };
      });
      hasChanges = items.some((it) => it.modificado);
    },

    handleRestoreAll: () => {
      items = items.map((item) => {
        if (!item.valorOriginal) return item;
        return {
          ...item,
          ...item.valorOriginal,
          modificado: false,
          valorOriginal: null,
        };
      });
      hasChanges = false;
    },

    getRecalculatedTotals: () => {
      return calculateInvoiceTotals(items, invoice?.totais || {});
    },

    getTotalsDiff: () => {
      const recalculated = calculateInvoiceTotals(items, invoice?.totais || {});
      const originalTotal = invoice?.totais?.valorTotalNota || '0.00';
      return decimalSubtract(recalculated.valorTotalNota, originalTotal, 2);
    },

    getItemsWithIssues: () => {
      return items.filter((item) => {
        const cleanNcm = String(item.ncm || '').replace(/\D/g, '');
        const missingNcm = cleanNcm.length !== 8;
        const missingCfop = !item.cfop || String(item.cfop).trim() === '';
        const cleanQty = cleanDecimalString(item.quantidade);
        const cleanPrice = cleanDecimalString(item.valorUnitario);
        const invalidQty = isDecimalZero(cleanQty) || isDecimalNegative(cleanQty);
        const invalidPrice = isDecimalZero(cleanPrice) || isDecimalNegative(cleanPrice);
        const lineExpected = calculateItemTotal(item.valorUnitario, item.quantidade);
        const cleanTotal = cleanDecimalString(item.valorTotal);
        const mathDiff = decimalCompare(lineExpected, cleanTotal) !== 0;
        const flagged =
          item.situacao === 'inconsistente' ||
          (Array.isArray(item.inconsistencias) && item.inconsistencias.length > 0);

        return missingNcm || missingCfop || invalidQty || invalidPrice || mathDiff || flagged;
      });
    },

    simulateSave: () => {
      for (const item of items) {
        if (isDecimalNegative(item.quantidade)) {
          throw new Error(`Item ${item.id}: A quantidade não pode ser negativa.`);
        }
        if (isDecimalNegative(item.valorUnitario)) {
          throw new Error(`Item ${item.id}: O valor unitário não pode ser negativo.`);
        }
        if (isDecimalZero(item.quantidade) || String(item.quantidade).trim() === '') {
          throw new Error(`Item ${item.id}: A quantidade deve ser maior que zero.`);
        }
      }

      const newTotals = calculateInvoiceTotals(items, invoice?.totais || {});
      invoice = {
        ...invoice,
        itens: items,
        totais: {
          ...invoice?.totais,
          valorProdutos: newTotals.valorProdutos,
          valorTotalProdutos: newTotals.valorProdutos,
          valorFrete: newTotals.valorFrete,
          valorSeguro: newTotals.valorSeguro,
          valorDesconto: newTotals.valorDesconto,
          outrasDespesas: newTotals.outrasDespesas,
          valorTotalNota: newTotals.valorTotalNota,
        },
      };
      hasChanges = false;
      return invoice;
    },
  };

  return controller;
}

// ============================================================================
// SUITE 1: Auditoria Estática e Invariantes do Código-Fonte
// ============================================================================
describe('CHALLENGER SUITE 1: Auditoria Estática de Código em conferencia/page.jsx', () => {
  const code = readFileSync(CONFERENCIA_PAGE_PATH, 'utf-8');

  it('1.1: Eliminação estrita de aritmética de ponto flutuante binário (IEEE-754)', () => {
    assert.strictEqual(
      /parseFloat\s*\(/.test(code),
      false,
      'Proibido: parseFloat não pode estar presente em conferencia/page.jsx'
    );
    assert.strictEqual(
      /\.toFixed\s*\(/.test(code),
      false,
      'Proibido: .toFixed() não pode estar presente em conferencia/page.jsx'
    );
    assert.strictEqual(
      /Math\.round\s*\(/.test(code),
      false,
      'Proibido: Math.round() não pode estar presente em conferencia/page.jsx'
    );
    assert.strictEqual(
      /Math\.floor\s*\(/.test(code),
      false,
      'Proibido: Math.floor() não pode estar presente em conferencia/page.jsx'
    );
  });

  it('1.2: Vinculação de inputs orientada exclusivamente a itemId (zero index-based mutation)', () => {
    // Proíbe assinaturas antigas como handleItemChange(index, ...) ou handleItemChange(rowIndex, ...)
    assert.strictEqual(
      /handleItemChange\s*=\s*\(\s*(index|rowIndex|i)\s*,/i.test(code),
      false,
      'handleItemChange NÃO pode receber índice numérico como primeiro argumento'
    );

    // Garante que a assinatura declara itemId
    assert.ok(
      /handleItemChange\s*=\s*\(\s*itemId\s*,/i.test(code),
      'handleItemChange deve receber explicitamente itemId como primeiro argumento'
    );

    // Garante que as chamadas no JSX passam item.id
    const onChangeMatches = [...code.matchAll(/onChange=\{(\([^)]*\)\s*=>\s*handleItemChange\([^)]*\))\}/g)];
    assert.ok(onChangeMatches.length >= 6, 'Devem existir no mínimo 6 campos editáveis chamando handleItemChange');
    for (const match of onChangeMatches) {
      assert.ok(
        match[1].includes('item.id'),
        `Chamada onChange deve passar item.id: ${match[1]}`
      );
      assert.strictEqual(
        match[1].includes('index,') || match[1].includes('rowIndex,'),
        false,
        `Chamada onChange NÃO pode passar índice numérico: ${match[1]}`
      );
    }
  });

  it('1.3: Preservação obrigatória de despesas acessórias nas operações de recálculo e save', () => {
    assert.ok(
      code.includes('calculateInvoiceTotals'),
      'Deve invocar calculateInvoiceTotals para consolidar totais da nota'
    );
    assert.ok(
      code.includes('valorFrete'),
      'Deve referenciar valorFrete'
    );
    assert.ok(
      code.includes('valorSeguro'),
      'Deve referenciar valorSeguro'
    );
    assert.ok(
      code.includes('outrasDespesas'),
      'Deve referenciar outrasDespesas'
    );
    assert.ok(
      code.includes('valorDesconto'),
      'Deve referenciar valorDesconto'
    );
  });

  it('1.4: Presença de Badges NF-e Mod. 55 e distinção de modos (Sessão vs Demo)', () => {
    assert.ok(
      code.includes('NF-e Mod. 55'),
      'Badge visual "NF-e Mod. 55" deve estar presente no cabeçalho'
    );
    assert.ok(
      code.includes('Importação Local (Memória Temporária de Sessão)'),
      'Identificador de sessão de importação local deve estar presente'
    );
    assert.ok(
      code.includes('Modo Demonstração'),
      'Identificador de Modo Demonstração deve estar presente'
    );
  });
});

// ============================================================================
// SUITE 2: Duplicate Product Codes (cProd) & Collision Resistance em demo-05
// ============================================================================
describe('CHALLENGER SUITE 2: Resiliência a Códigos e Descrições Repetidos (demo-05)', () => {
  it('2.1: demo-05 possui 15 itens distribuídos em 3 códigos idênticos por 5 lotes', () => {
    const d5 = getMockInvoiceById('demo-05');
    assert.ok(d5, 'demo-05 deve existir no repositório de mocks');
    assert.strictEqual(d5.itens.length, 15, 'demo-05 deve conter exatamente 15 itens');

    const sojaItems = d5.itens.filter((i) => i.codigo === 'SOJA-GR-01');
    const milhoItems = d5.itens.filter((i) => i.codigo === 'MILHO-GR-02');
    const sorgoItems = d5.itens.filter((i) => i.codigo === 'SORGO-GR-03');

    assert.strictEqual(sojaItems.length, 5, 'Devem existir 5 itens com código SOJA-GR-01');
    assert.strictEqual(milhoItems.length, 5, 'Devem existir 5 itens com código MILHO-GR-02');
    assert.strictEqual(sorgoItems.length, 5, 'Devem existir 5 itens com código SORGO-GR-03');
  });

  it('2.2: Edição da linha 4 (d5-4, SOJA) NUNCA contamina linha 1 (d5-1, SOJA) nem outros lotes', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    // Estado inicial de d5-1 e d5-4
    const initialItem1 = ctrl.getItems().find((i) => i.id === 'd5-1');
    const initialItem4 = ctrl.getItems().find((i) => i.id === 'd5-4');
    assert.strictEqual(initialItem1.codigo, 'SOJA-GR-01');
    assert.strictEqual(initialItem4.codigo, 'SOJA-GR-01');
    assert.strictEqual(initialItem1.quantidade, '50.0000');
    assert.strictEqual(initialItem4.quantidade, '54.0000');

    // Edita a linha 4: altera quantidade para 88.0000 e valorUnitario para 420.0000
    ctrl.handleItemChange('d5-4', 'quantidade', '88.0000');
    ctrl.handleItemChange('d5-4', 'valorUnitario', '420.0000');

    const itemsAfter = ctrl.getItems();
    const item4After = itemsAfter.find((i) => i.id === 'd5-4');
    const item1After = itemsAfter.find((i) => i.id === 'd5-1');

    // Item 4 deve estar atualizado
    assert.strictEqual(item4After.quantidade, '88.0000');
    assert.strictEqual(item4After.valorUnitario, '420.0000');
    assert.strictEqual(item4After.valorTotal, '36960.00'); // 88 * 420 = 36960.00
    assert.strictEqual(item4After.modificado, true);
    assert.deepStrictEqual(item4After.valorOriginal, {
      item: 4,
      codigo: 'SOJA-GR-01',
      descricao: 'Soja em Grãos - Lote L02',
      ncm: '12019000',
      cfop: '7101',
      unidade: 'TON',
      quantidade: '54.0000',
      valorUnitario: '400.0000',
      valorTotal: '21600.00',
    });

    // Item 1 (com MESMO CÓDIGO) DEVE PERMANECER 100% INTACTO
    assert.strictEqual(item1After.quantidade, '50.0000');
    assert.strictEqual(item1After.valorUnitario, '400.0000');
    assert.strictEqual(item1After.valorTotal, '20000.00');
    assert.strictEqual(item1After.modificado, false);
    assert.ok(!item1After.valorOriginal, 'Item 1 não deve ter snapshot valorOriginal');

    // Todos os outros 13 itens da nota devem estar sem modificação
    const untouched = itemsAfter.filter((i) => i.id !== 'd5-4');
    assert.strictEqual(untouched.length, 14);
    for (const it of untouched) {
      assert.strictEqual(it.modificado, false, `Item ${it.id} não deve ter flag modificado`);
      assert.ok(!it.valorOriginal, `Item ${it.id} não deve ter snapshot valorOriginal`);
    }
  });

  it('2.3: Mutações simultâneas em todas as 5 ocorrências de SOJA-GR-01 mantêm snapshots e valores isolados', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    const sojaIds = ['d5-1', 'd5-4', 'd5-7', 'd5-10', 'd5-13'];
    const customEdits = {
      'd5-1': { q: '51.1111', u: '401.0000', expectedTotal: '20495.55' },
      'd5-4': { q: '56.2222', u: '402.5000', expectedTotal: '22629.44' },
      'd5-7': { q: '61.3333', u: '405.0000', expectedTotal: '24839.99' },
      'd5-10': { q: '66.4444', u: '410.0000', expectedTotal: '27242.20' },
      'd5-13': { q: '71.5555', u: '415.0000', expectedTotal: '29695.53' },
    };

    // Aplica alterações linha por linha
    for (const [id, edit] of Object.entries(customEdits)) {
      ctrl.handleItemChange(id, 'quantidade', edit.q);
      ctrl.handleItemChange(id, 'valorUnitario', edit.u);
    }

    const items = ctrl.getItems();

    // Valida que cada linha possui exatamente os seus dados, sem misturar ou sobrescrever outras
    for (const [id, edit] of Object.entries(customEdits)) {
      const it = items.find((x) => x.id === id);
      assert.strictEqual(it.quantidade, edit.q);
      assert.strictEqual(it.valorUnitario, edit.u);
      assert.strictEqual(it.valorTotal, edit.expectedTotal);
      assert.strictEqual(it.modificado, true);
    }

    // Itens de milho e sorgo continuam intocados
    const nonSoja = items.filter((x) => !sojaIds.includes(x.id));
    assert.strictEqual(nonSoja.length, 10);
    for (const it of nonSoja) {
      assert.strictEqual(it.modificado, false);
      assert.ok(!it.valorOriginal);
    }

    // Restaura seletivamente apenas d5-7
    ctrl.handleRestoreItem('d5-7');
    const item7Restored = ctrl.getItems().find((x) => x.id === 'd5-7');
    assert.strictEqual(item7Restored.quantidade, '49.0000');
    assert.strictEqual(item7Restored.valorUnitario, '400.0000');
    assert.strictEqual(item7Restored.valorTotal, '19600.00');
    assert.strictEqual(item7Restored.modificado, false);
    assert.strictEqual(item7Restored.valorOriginal, null);

    // As outras 4 linhas de SOJA continuam modificadas
    for (const id of ['d5-1', 'd5-4', 'd5-10', 'd5-13']) {
      const it = ctrl.getItems().find((x) => x.id === id);
      assert.strictEqual(it.modificado, true);
      assert.strictEqual(it.quantidade, customEdits[id].q);
    }
  });
});

// ============================================================================
// SUITE 3: Edições Rápidas sob Restrições Severas de Filtro Dinâmico
// ============================================================================
describe('CHALLENGER SUITE 3: Edição Estável sob Filtros Dinâmicos Severos', () => {
  it('3.1: Filtro por descrição parcial restritiva ("Lote L03") e mutação na linha visual index 1', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    ctrl.setSearchTerm('Lote L03');
    const filtered = ctrl.getFilteredAndSortedItems();

    // No Lote L03 temos exatamente 3 produtos: d5-7 (Soja), d5-8 (Milho), d5-9 (Sorgo)
    assert.strictEqual(filtered.length, 3);
    assert.strictEqual(filtered[0].id, 'd5-7');
    assert.strictEqual(filtered[1].id, 'd5-8');
    assert.strictEqual(filtered[2].id, 'd5-9');

    // O usuário edita a linha na posição 1 da lista filtrada (d5-8)
    const targetItem = filtered[1];
    ctrl.handleItemChange(targetItem.id, 'quantidade', '80.0000');

    // Remove o filtro (visualização completa da nota)
    ctrl.setSearchTerm('');
    const allItems = ctrl.getFilteredAndSortedItems();
    assert.strictEqual(allItems.length, 15);

    // O item d5-8 (posição 7 na lista global) foi atualizado
    const item8 = allItems.find((i) => i.id === 'd5-8');
    assert.strictEqual(item8.quantidade, '80.0000');
    assert.strictEqual(item8.valorTotal, '28000.00'); // 80 * 350
    assert.strictEqual(item8.modificado, true);

    // O item na posição global 1 (d5-2: Milho Lote L01) NÃO pode ter sido alterado
    const item2 = allItems.find((i) => i.id === 'd5-2');
    assert.strictEqual(item2.quantidade, '60.0000');
    assert.strictEqual(item2.modificado, false);
  });

  it('3.2: Filtro por NCM exato de 8 dígitos ("10079000" - Sorgo)', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    ctrl.setSearchTerm('10079000');
    const filtered = ctrl.getFilteredAndSortedItems();
    assert.strictEqual(filtered.length, 5, 'Exatamente 5 itens com NCM de Sorgo');

    // Edita o último item visível na filtragem (d5-15, item 15)
    const lastFiltered = filtered[4];
    assert.strictEqual(lastFiltered.id, 'd5-15');

    ctrl.handleItemChange(lastFiltered.id, 'valorUnitario', '450.0000');

    const item15 = ctrl.getItems().find((i) => i.id === 'd5-15');
    assert.strictEqual(item15.valorUnitario, '450.0000');
    assert.strictEqual(item15.valorTotal, '33300.00'); // 74 * 450 = 33300
    assert.strictEqual(item15.modificado, true);

    // Nenhuma das outras 4 linhas de sorgo (d5-3, d5-6, d5-9, d5-12) foi afetada
    for (const otherId of ['d5-3', 'd5-6', 'd5-9', 'd5-12']) {
      const it = ctrl.getItems().find((i) => i.id === otherId);
      assert.strictEqual(it.modificado, false);
      assert.strictEqual(it.valorUnitario, '380.0000');
    }
  });

  it('3.3: Filtro com resultado zero (busca vazia) não causa quebra nem mutações espúrias', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    ctrl.setSearchTerm('BUSCA_IMPOSSIVEL_XYZ_9999');
    const filtered = ctrl.getFilteredAndSortedItems();
    assert.strictEqual(filtered.length, 0);

    // Tentar alterar um ID inexistente não quebra o controlador
    ctrl.handleItemChange('non-existent-id', 'quantidade', '10.0000');
    assert.strictEqual(ctrl.getItems().length, 15);
    assert.strictEqual(ctrl.getItems().filter((i) => i.modificado).length, 0);

    // Limpa a busca
    ctrl.setSearchTerm('');
    assert.strictEqual(ctrl.getFilteredAndSortedItems().length, 15);
  });

  it('3.4: Stress Test de 50 ciclos dinâmicos de filtro + edição aleatória', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    const filterTerms = ['Soja', 'Milho', 'Sorgo', '12019000', '10059010', '10079000', 'Lote L01', 'Lote L05', 'Grãos', '7101'];

    for (let cycle = 1; cycle <= 50; cycle++) {
      const term = filterTerms[cycle % filterTerms.length];
      ctrl.setSearchTerm(term);
      const visible = ctrl.getFilteredAndSortedItems();

      assert.ok(visible.length > 0, `Ciclo ${cycle}: filtro '${term}' deve retornar ao menos 1 item`);

      // Escolhe um item visível determinístico baseado no ciclo
      const selectedIndex = cycle % visible.length;
      const targetItem = visible[selectedIndex];
      const targetId = targetItem.id;

      // Salva snapshot de todos os outros itens antes da mutação
      const stateBefore = ctrl.getItems().map((i) => ({ ...i }));

      const newQty = `${50 + (cycle % 30)}.0000`;
      ctrl.handleItemChange(targetId, 'quantidade', newQty);

      // Validação de isolamento: somente targetId foi alterado
      const stateAfter = ctrl.getItems();
      for (const item of stateAfter) {
        if (item.id === targetId) {
          assert.strictEqual(item.quantidade, newQty);
          assert.strictEqual(item.modificado, true);
        } else {
          const before = stateBefore.find((b) => b.id === item.id);
          assert.strictEqual(
            item.quantidade,
            before.quantidade,
            `Ciclo ${cycle}: Item ${item.id} foi indevidamente corrompido ao editar ${targetId}`
          );
          assert.strictEqual(item.valorTotal, before.valorTotal);
          assert.strictEqual(item.modificado, before.modificado);
        }
      }
    }

    console.log('[CHALLENGER 3.4] 50 ciclos de filtro e edição concluídos com 100% de isolamento.');
  });
});

// ============================================================================
// SUITE 4: Column Sorting Flip-Flops (Inversões de Ordem)
// ============================================================================
describe('CHALLENGER SUITE 4: Alternância e Flip-Flop de Ordenação de Colunas', () => {
  it('4.1: Ordenação por quantidade ASC -> edição no topo -> ordenação DESC -> edição no topo', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    // 1. Ordena por quantidade ascendente
    ctrl.handleSort('quantidade');
    assert.deepStrictEqual(ctrl.getSortConfig(), { key: 'quantidade', direction: 'asc' });

    let sortedAsc = ctrl.getFilteredAndSortedItems();
    // Menor quantidade em demo-05 é d5-7 (49.0000)
    assert.strictEqual(sortedAsc[0].id, 'd5-7');
    assert.strictEqual(sortedAsc[0].quantidade, '49.0000');

    // Edita a primeira linha da tabela ordenada
    ctrl.handleItemChange('d5-7', 'quantidade', '150.0000');

    // 2. Inverte para ordenação descendente (flip-flop)
    ctrl.handleSort('quantidade');
    assert.deepStrictEqual(ctrl.getSortConfig(), { key: 'quantidade', direction: 'desc' });

    let sortedDesc = ctrl.getFilteredAndSortedItems();
    // d5-7 agora possui quantidade 150.0000 e DEVE saltar para a primeira posição
    assert.strictEqual(sortedDesc[0].id, 'd5-7');
    assert.strictEqual(sortedDesc[0].quantidade, '150.0000');

    // A última linha no sort descendente passa a ser d5-1 (50.0000)
    const lastRow = sortedDesc[sortedDesc.length - 1];
    assert.strictEqual(lastRow.id, 'd5-1');
    assert.strictEqual(lastRow.quantidade, '50.0000');

    // Edita a última linha
    ctrl.handleItemChange(lastRow.id, 'quantidade', '200.0000');

    // Verifica que na lista mestre de itens, somente d5-7 e d5-1 foram alterados
    const masterItems = ctrl.getItems();
    const it7 = masterItems.find((i) => i.id === 'd5-7');
    const it1 = masterItems.find((i) => i.id === 'd5-1');

    assert.strictEqual(it7.quantidade, '150.0000');
    assert.strictEqual(it1.quantidade, '200.0000');

    const others = masterItems.filter((i) => i.id !== 'd5-7' && i.id !== 'd5-1');
    for (const o of others) {
      assert.strictEqual(o.modificado, false, `Item ${o.id} não deve ter sido modificado`);
    }
  });

  it('4.2: Ordenação por valorTotal usando comparação decimal estrita (não léxica)', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    // Ordena por valorTotal ASC
    ctrl.handleSort('valorTotal');
    const sorted = ctrl.getFilteredAndSortedItems();

    // Verifica se os valores estão monotonicamente crescentes numericamente
    for (let i = 0; i < sorted.length - 1; i++) {
      const cmp = decimalCompare(sorted[i].valorTotal, sorted[i + 1].valorTotal);
      assert.ok(cmp <= 0, `Posição ${i} (${sorted[i].valorTotal}) deve ser <= posição ${i + 1} (${sorted[i + 1].valorTotal})`);
    }

    // Menor total em demo-05 é d5-8 (17.850,00)
    assert.strictEqual(sorted[0].id, 'd5-8');
    assert.strictEqual(sorted[0].valorTotal, '17850.00');

    // Maior total em demo-05 é d5-6 (28.500,00)
    assert.strictEqual(sorted[sorted.length - 1].id, 'd5-6');
    assert.strictEqual(sorted[sorted.length - 1].valorTotal, '28500.00');
  });

  it('4.3: Sequência contínua de alternância de ordenações (item -> descricao -> valorTotal -> ncm)', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    const sortSequence = ['item', 'descricao', 'valorTotal', 'ncm', 'quantidade'];

    for (const col of sortSequence) {
      ctrl.handleSort(col); // asc
      let itemsView = ctrl.getFilteredAndSortedItems();
      // Edita o 3º item da visualização atual
      const target = itemsView[2];
      ctrl.handleItemChange(target.id, 'descricao', `${target.descricao} - TESTED`);

      ctrl.handleSort(col); // desc
      itemsView = ctrl.getFilteredAndSortedItems();
      // Edita o 5º item da visualização invertida
      const targetDesc = itemsView[4];
      ctrl.handleItemChange(targetDesc.id, 'descricao', `${targetDesc.descricao} - FLIPPED`);
    }

    // Valida que todos os itens com id modificado retêm seu snapshot original
    const modified = ctrl.getItems().filter((i) => i.modificado);
    assert.ok(modified.length > 0);
    for (const m of modified) {
      assert.ok(m.valorOriginal !== null);
      assert.ok(!m.valorOriginal.descricao.includes('- TESTED'));
      assert.ok(!m.valorOriginal.descricao.includes('- FLIPPED'));
    }
  });
});

// ============================================================================
// SUITE 5: Imutabilidade do Snapshot e Rollback em Cascata
// ============================================================================
describe('CHALLENGER SUITE 5: Imutabilidade do Snapshot e Restauração Exata', () => {
  it('5.1: 10 mutações sucessivas em cadeia no mesmo item retêm o valorOriginal v0 original de fábrica', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);
    const targetId = 'd5-1';

    // Baseline de fábrica: 50.0000, 400.0000, 20000.00
    const baseline = {
      quantidade: '50.0000',
      valorUnitario: '400.0000',
      valorTotal: '20000.00',
    };

    // 10 edições sucessivas
    for (let step = 1; step <= 10; step++) {
      const q = `${50 + step}.0000`;
      const u = `${400 + step * 2}.0000`;
      ctrl.handleItemChange(targetId, 'quantidade', q);
      ctrl.handleItemChange(targetId, 'valorUnitario', u);

      const it = ctrl.getItems().find((i) => i.id === targetId);
      assert.strictEqual(
        it.valorOriginal.quantidade,
        baseline.quantidade,
        `Passo ${step}: valorOriginal.quantidade deve ser sempre o baseline inicial 50.0000`
      );
      assert.strictEqual(
        it.valorOriginal.valorUnitario,
        baseline.valorUnitario,
        `Passo ${step}: valorOriginal.valorUnitario deve ser sempre 400.0000`
      );
      assert.strictEqual(
        it.valorOriginal.valorTotal,
        baseline.valorTotal,
        `Passo ${step}: valorOriginal.valorTotal deve ser sempre 20000.00`
      );
    }

    // Agora restaura o item individualmente
    ctrl.handleRestoreItem(targetId);

    const restored = ctrl.getItems().find((i) => i.id === targetId);
    assert.strictEqual(restored.quantidade, baseline.quantidade);
    assert.strictEqual(restored.valorUnitario, baseline.valorUnitario);
    assert.strictEqual(restored.valorTotal, baseline.valorTotal);
    assert.strictEqual(restored.modificado, false);
    assert.strictEqual(restored.valorOriginal, null);
    assert.strictEqual(ctrl.getHasChanges(), false);
  });

  it('5.2: Restauração em lote (handleRestoreAll) reverte múltiplos itens alterados simultaneamente', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    // Altera 6 itens distintos
    const editedIds = ['d5-1', 'd5-3', 'd5-5', 'd5-7', 'd5-9', 'd5-11'];
    for (const id of editedIds) {
      ctrl.handleItemChange(id, 'quantidade', '99.0000');
    }

    assert.strictEqual(ctrl.getItems().filter((i) => i.modificado).length, 6);
    assert.strictEqual(ctrl.getHasChanges(), true);

    // Executa restauração em lote
    ctrl.handleRestoreAll();

    assert.strictEqual(ctrl.getItems().filter((i) => i.modificado).length, 0);
    assert.strictEqual(ctrl.getHasChanges(), false);

    // Total da nota deve ser exatamente o inicial (342.000,00)
    const totals = ctrl.getRecalculatedTotals();
    assert.strictEqual(totals.valorProdutos, '342000.00');
    assert.strictEqual(totals.valorTotalNota, '342000.00');
    assert.strictEqual(ctrl.getTotalsDiff(), '0.00');
  });
});

// ============================================================================
// SUITE 6: Preservação de Frete, Seguro, Descontos e Pure Decimal Math
// ============================================================================
describe('CHALLENGER SUITE 6: Preservação Fiscal de Despesas Acessórias e Rigor Decimal', () => {
  it('6.1: Conservação estrita de Frete, Seguro, Outras Despesas e Desconto durante edições', () => {
    // Fixture com despesas completas
    const complexInvoice = {
      id: 'inv-complex-01',
      numero: '12345',
      itens: [
        {
          id: 'item-c1',
          item: 1,
          codigo: 'EXP-101',
          descricao: 'Motor Marítimo 300HP',
          ncm: '84089090',
          cfop: '7101',
          unidade: 'UN',
          quantidade: '2.0000',
          valorUnitario: '50000.0000',
          valorTotal: '100000.00',
          modificado: false,
          valorOriginal: null,
        },
        {
          id: 'item-c2',
          item: 2,
          codigo: 'EXP-102',
          descricao: 'Hélice de Bronze Naval',
          ncm: '84871000',
          cfop: '7101',
          unidade: 'PC',
          quantidade: '4.0000',
          valorUnitario: '12500.0000',
          valorTotal: '50000.00',
          modificado: false,
          valorOriginal: null,
        },
      ],
      totais: {
        valorProdutos: '150000.00',
        valorFrete: '8500.00',
        valorSeguro: '1500.00',
        valorDesconto: '2000.00',
        outrasDespesas: '1000.00',
        valorTotalNota: '159000.00', // 150000 - 2000 + 8500 + 1500 + 1000 = 159000.00
      },
    };

    const ctrl = createConferenceController(complexInvoice);

    // Edita item 1: quantidade passa de 2 para 3 (+50.000,00 nos produtos)
    ctrl.handleItemChange('item-c1', 'quantidade', '3.0000');

    const recalculated = ctrl.getRecalculatedTotals();

    // Produtos vão de 150.000 para 200.000
    assert.strictEqual(recalculated.valorProdutos, '200000.00');

    // Despesas acessórias mantidas integralmente
    assert.strictEqual(recalculated.valorFrete, '8500.00');
    assert.strictEqual(recalculated.valorSeguro, '1500.00');
    assert.strictEqual(recalculated.valorDesconto, '2000.00');
    assert.strictEqual(recalculated.outrasDespesas, '1000.00');

    // Total NF-e: 200000 - 2000 + 8500 + 1500 + 1000 = 209000.00
    assert.strictEqual(recalculated.valorTotalNota, '209000.00');

    // Simula salvamento
    const saved = ctrl.simulateSave();
    assert.strictEqual(saved.totais.valorTotalNota, '209000.00');
    assert.strictEqual(saved.totais.valorFrete, '8500.00');
    assert.strictEqual(saved.totais.valorSeguro, '1500.00');
  });

  it('6.2: Rejeição estrita de quantidades ou valores unitários negativos na validação de save', () => {
    const d5 = getMockInvoiceById('demo-05');
    const ctrl = createConferenceController(d5);

    ctrl.handleItemChange('d5-1', 'quantidade', '-10.0000');

    assert.throws(
      () => {
        ctrl.simulateSave();
      },
      {
        message: /não pode ser negativa/,
      }
    );
  });

  it('6.3: Multiplicação com 4 casas decimais e arredondamento ABNT NBR 5891 Half-Up', () => {
    // 33.335 * 3 = 100.005 -> 100.01
    assert.strictEqual(calculateItemTotal('33.335', '3.0000'), '100.01');

    // 12.3454 * 10 = 123.454 -> 123.45
    assert.strictEqual(calculateItemTotal('12.3454', '10.0000'), '123.45');

    // 12.3455 * 10 = 123.455 -> 123.46
    assert.strictEqual(calculateItemTotal('12.3455', '10.0000'), '123.46');
  });
});
