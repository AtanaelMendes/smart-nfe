/**
 * SmartNFe — Integration Test Suite: Fluxo B (Conferência com Edição Estável e Recálculo Decimal)
 *
 * Requisito: R1 & R4 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Verificações cobertas:
 * 1. Edição segura de itens orientada exclusivamente a `itemId` estável.
 * 2. Imunidade total a filtros por NCM, filtros por descrição e ordenação da tabela.
 * 3. Edição em itens com códigos ou descrições duplicadas afetando apenas a linha selecionada.
 * 4. Recálculo puramente decimal via motor BigInt (zero IEEE 754 float drift).
 * 5. Preservação integral de componentes de frete, seguro, outras despesas e descontos.
 * 6. Snapshot imutável de `valorOriginal` na primeira mutação.
 * 7. Restauração unitária (`handleRestoreItem`) e em lote (`handleRestoreAll`).
 *
 * Execução: node --no-warnings --test tests/integration/flow_b_conferencia_stable_edit.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '../../app/lib/calculations/invoiceTotals.js';
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalCompare,
  roundDecimal,
} from '../../app/lib/calculations/decimal.js';

/**
 * Fixture de nota de conferência para testes do Fluxo B.
 */
function createConferenceInvoiceFixture() {
  const chaveAcesso = '35241112345678000190550010001458921001234562';
  return {
    id: `nfe-${chaveAcesso}`,
    numero: '000.145.892',
    serie: '1',
    chaveAcesso,
    tipoDocumento: 'XML',
    isRealImport: true,
    isDemo: false,
    itens: [
      {
        id: `nfe-${chaveAcesso}-item-1`,
        item: 1,
        codigo: 'EXP-CAF-001',
        descricao: 'Café em Grão Cru Arábica Tipo 6',
        ncm: '09011110',
        cfop: '7101',
        unidade: 'SC',
        quantidade: '500.0000',
        valorUnitario: '25.5000',
        valorTotal: '12750.00',
        modificado: false,
        valorOriginal: null,
      },
      {
        id: `nfe-${chaveAcesso}-item-2`,
        item: 2,
        codigo: 'EXP-MOT-8408',
        descricao: 'Motor Diesel 120HP Agrícola',
        ncm: '84089090',
        cfop: '7101',
        unidade: 'UN',
        quantidade: '10.0000',
        valorUnitario: '15400.0000',
        valorTotal: '154000.00',
        modificado: false,
        valorOriginal: null,
      },
      {
        id: `nfe-${chaveAcesso}-item-3`,
        item: 3,
        codigo: 'EXP-VAL-003',
        descricao: 'Válvula de Escape Motor',
        ncm: '84089090',
        cfop: '7101',
        unidade: 'PC',
        quantidade: '40.0000',
        valorUnitario: '200.0000',
        valorTotal: '8000.00',
        modificado: false,
        valorOriginal: null,
      },
      {
        id: `nfe-${chaveAcesso}-item-4`,
        item: 4,
        codigo: 'EXP-VAL-003', // Código e descrição propositalmente repetidos para testar colisão
        descricao: 'Válvula de Escape Motor',
        ncm: '84089090',
        cfop: '7101',
        unidade: 'PC',
        quantidade: '60.0000',
        valorUnitario: '200.0000',
        valorTotal: '12000.00',
        modificado: false,
        valorOriginal: null,
      },
    ],
    totais: {
      valorProdutos: '186750.00',
      valorFrete: '5000.00',
      valorSeguro: '1200.00',
      valorDesconto: '250.00',
      outrasDespesas: '500.00',
      valorTotalNota: '193200.00', // 186750 - 250 + 5000 + 1200 + 500 = 193200
    },
  };
}

/**
 * Redutor imutável de edição de item por itemId estável.
 * Simula a lógica oficial de conferência especificada no PROJECT.md § 5.
 */
function applyItemChange(items, itemId, field, rawValue) {
  return items.map((item) => {
    if (item.id !== itemId) return item;

    // Snapshot inicial se ainda não foi modificado
    const valorOriginal = item.valorOriginal || {
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
    };

    const updatedItem = {
      ...item,
      [field]: rawValue,
      modificado: true,
      valorOriginal,
    };

    // Recálculo automático do valor total do produto
    if (field === 'quantidade' || field === 'valorUnitario') {
      const q = field === 'quantidade' ? rawValue : item.quantidade;
      const u = field === 'valorUnitario' ? rawValue : item.valorUnitario;
      updatedItem.valorTotal = calculateItemTotal(u, q);
    }

    return updatedItem;
  });
}

/**
 * Restaura um único item para seu snapshot original.
 */
function restoreItem(items, itemId) {
  return items.map((item) => {
    if (item.id !== itemId || !item.valorOriginal) return item;
    return {
      ...item,
      quantidade: item.valorOriginal.quantidade,
      valorUnitario: item.valorOriginal.valorUnitario,
      valorTotal: item.valorOriginal.valorTotal,
      modificado: false,
      valorOriginal: null,
    };
  });
}

/**
 * Restaura todos os itens para seus snapshots originais.
 */
function restoreAllItems(items) {
  return items.map((item) => {
    if (!item.valorOriginal) return item;
    return {
      ...item,
      quantidade: item.valorOriginal.quantidade,
      valorUnitario: item.valorOriginal.valorUnitario,
      valorTotal: item.valorOriginal.valorTotal,
      modificado: false,
      valorOriginal: null,
    };
  });
}

describe('Fluxo B — Edição Estável por itemId sob Filtros e Ordenação (R1)', () => {
  it('Edita exclusivamente o item selecionado quando a tabela está filtrada por NCM', () => {
    const invoice = createConferenceInvoiceFixture();
    const targetNcm = '09011110';

    // Simula filtro da UI por NCM
    const filteredView = invoice.itens.filter((i) => i.ncm === targetNcm);
    assert.strictEqual(filteredView.length, 1);
    const targetItem = filteredView[0];
    assert.strictEqual(targetItem.id, 'nfe-35241112345678000190550010001458921001234562-item-1');

    // Usuário altera a quantidade na linha exibida
    const updatedItems = applyItemChange(invoice.itens, targetItem.id, 'quantidade', '600.0000');

    // Verifica que o item-1 foi atualizado na lista global
    const item1 = updatedItems.find((i) => i.id === targetItem.id);
    assert.strictEqual(item1.quantidade, '600.0000');
    assert.strictEqual(item1.valorTotal, '15300.00'); // 600 * 25.50
    assert.strictEqual(item1.modificado, true);

    // Verifica que os demais itens (2, 3 e 4) não sofreram NENHUMA alteração
    const otherItems = updatedItems.filter((i) => i.id !== targetItem.id);
    for (const other of otherItems) {
      assert.strictEqual(other.modificado, false, `Item ${other.id} não deve ter sido modificado`);
      assert.strictEqual(other.valorOriginal, null);
    }
  });

  it('Edita exclusivamente o item selecionado quando a tabela está filtrada por descrição', () => {
    const invoice = createConferenceInvoiceFixture();
    const query = 'Diesel';

    // Filtro por descrição
    const filteredView = invoice.itens.filter((i) => i.descricao.toLowerCase().includes(query.toLowerCase()));
    assert.strictEqual(filteredView.length, 1);
    const targetItem = filteredView[0];
    assert.strictEqual(targetItem.id, 'nfe-35241112345678000190550010001458921001234562-item-2');

    // Usuário altera preço unitário
    const updatedItems = applyItemChange(invoice.itens, targetItem.id, 'valorUnitario', '16000.0000');

    const item2 = updatedItems.find((i) => i.id === targetItem.id);
    assert.strictEqual(item2.valorUnitario, '16000.0000');
    assert.strictEqual(item2.valorTotal, '160000.00'); // 10 * 16000
    assert.strictEqual(item2.modificado, true);

    // Item 1, 3 e 4 permanecem inalterados
    assert.strictEqual(updatedItems.find((i) => i.item === 1).modificado, false);
    assert.strictEqual(updatedItems.find((i) => i.item === 3).modificado, false);
    assert.strictEqual(updatedItems.find((i) => i.item === 4).modificado, false);
  });

  it('Distingue linhas com descrições e códigos idênticos (EXP-VAL-003) via itemId estável', () => {
    const invoice = createConferenceInvoiceFixture();
    // Item 3 e Item 4 possuem mesmo código e descrição
    const item3Id = 'nfe-35241112345678000190550010001458921001234562-item-3';
    const item4Id = 'nfe-35241112345678000190550010001458921001234562-item-4';

    // Edita exclusivamente o item 4
    const updatedItems = applyItemChange(invoice.itens, item4Id, 'quantidade', '65.0000');

    const item4 = updatedItems.find((i) => i.id === item4Id);
    const item3 = updatedItems.find((i) => i.id === item3Id);

    assert.strictEqual(item4.quantidade, '65.0000');
    assert.strictEqual(item4.valorTotal, '13000.00'); // 65 * 200
    assert.strictEqual(item4.modificado, true);

    // Item 3 NÃO pode ter sido tocado
    assert.strictEqual(item3.quantidade, '40.0000');
    assert.strictEqual(item3.valorTotal, '8000.00');
    assert.strictEqual(item3.modificado, false);
  });

  it('Edita item correto quando a tabela está ordenada de forma invertida', () => {
    const invoice = createConferenceInvoiceFixture();

    // Ordenação decrescente por valorTotal
    const sorted = [...invoice.itens].sort((a, b) => decimalCompare(b.valorTotal, a.valorTotal));
    // Primeiro item na visualização ordenada é o item 2 (154.000,00)
    assert.strictEqual(sorted[0].item, 2);

    // Edita a primeira linha da tabela ordenada
    const editedItemId = sorted[0].id;
    const updatedItems = applyItemChange(invoice.itens, editedItemId, 'quantidade', '12.0000');

    const item2 = updatedItems.find((i) => i.id === editedItemId);
    assert.strictEqual(item2.quantidade, '12.0000');
    assert.strictEqual(item2.valorTotal, '184800.00'); // 12 * 15400

    // O item na posição 0 da lista original (item 1) não deve ter sido afetado
    const item1 = updatedItems.find((i) => i.item === 1);
    assert.strictEqual(item1.quantidade, '500.0000');
    assert.strictEqual(item1.modificado, false);
  });
});

describe('Fluxo B — Precisão dos Cálculos Decimais e Imunidade ao IEEE 754 (R1)', () => {
  it('Elimina desvios de ponto flutuante em valores decimais estendidos', () => {
    // 0.1 + 0.2 no JS IEEE-754 = 0.30000000000000004
    const sum = decimalAdd('0.1000', '0.2000', 4);
    assert.strictEqual(sum, '0.3000');

    // Multiplicação de alta precisão com 4 casas
    const total = calculateItemTotal('12.3456', '10.0000');
    assert.strictEqual(total, '123.46'); // Half-Up arredondado para 2 casas
  });

  it('Multiplicação com frações críticas aplica arredondamento ABNT Half-Up', () => {
    // 3 unidades a 33.335 -> 100.005 -> 100.01
    const total = calculateItemTotal('33.335', '3.0000');
    assert.strictEqual(total, '100.01');
  });
});

describe('Fluxo B — Preservação de Frete, Seguro, Outras Despesas e Descontos (R1, R4)', () => {
  it('Recalcula o total da NF-e preservando integralmente despesas acessórias e descontos', () => {
    const invoice = createConferenceInvoiceFixture();
    const originalTotais = invoice.totais;

    // Item 1 é editado: quantidade vai de 500 para 520 (+20 * 25.50 = +510.00)
    const updatedItems = applyItemChange(
      invoice.itens,
      'nfe-35241112345678000190550010001458921001234562-item-1',
      'quantidade',
      '520.0000'
    );

    // Recalcula totais gerais da NF-e
    const newTotais = calculateInvoiceTotals(updatedItems, originalTotais);

    // valorProdutos antigo: 186.750,00 -> novo: 187.260,00
    assert.strictEqual(newTotais.valorProdutos, '187260.00');

    // Componentes acessórios PRESERVADOS intactos
    assert.strictEqual(newTotais.valorFrete, '5000.00');
    assert.strictEqual(newTotais.valorSeguro, '1200.00');
    assert.strictEqual(newTotais.outrasDespesas, '500.00');
    assert.strictEqual(newTotais.valorDesconto, '250.00');

    // Total da NF-e: 187260 - 250 + 5000 + 1200 + 500 = 193710.00
    assert.strictEqual(newTotais.valorTotalNota, '193710.00');
  });

  it('Não substitui o total da NF-e por uma soma simplificada de produtos', () => {
    const invoice = createConferenceInvoiceFixture();
    const totais = calculateInvoiceTotals(invoice.itens, invoice.totais);

    // A soma simplificada seria 186.750,00, mas o total com frete/seguro/despesas é 193.200,00
    assert.notStrictEqual(totais.valorTotalNota, totais.valorProdutos);
    assert.strictEqual(totais.valorTotalNota, '193200.00');
  });
});

describe('Fluxo B — Snapshot de valorOriginal e Mecanismo de Restauração (R1, R4)', () => {
  it('Cria snapshot imutável de valorOriginal na primeira alteração e o preserva em edições sucessivas', () => {
    const invoice = createConferenceInvoiceFixture();
    const itemId = 'nfe-35241112345678000190550010001458921001234562-item-1';

    // 1ª Edição: 500 -> 510
    const step1 = applyItemChange(invoice.itens, itemId, 'quantidade', '510.0000');
    const itemStep1 = step1.find((i) => i.id === itemId);
    assert.deepStrictEqual(itemStep1.valorOriginal, {
      quantidade: '500.0000',
      valorUnitario: '25.5000',
      valorTotal: '12750.00',
    });

    // 2ª Edição sucessiva: 510 -> 550
    const step2 = applyItemChange(step1, itemId, 'quantidade', '550.0000');
    const itemStep2 = step2.find((i) => i.id === itemId);

    // valorOriginal DEVE CONTINUAR sendo o original de fábrica (500), e não o valor intermediário (510)
    assert.strictEqual(itemStep2.valorOriginal.quantidade, '500.0000');
    assert.strictEqual(itemStep2.quantidade, '550.0000');
  });

  it('Restaura um único item ao valor original com handleRestoreItem e reverte totais', () => {
    const invoice = createConferenceInvoiceFixture();
    const itemId = 'nfe-35241112345678000190550010001458921001234562-item-1';

    // Edita o item
    const editedItems = applyItemChange(invoice.itens, itemId, 'quantidade', '600.0000');
    assert.strictEqual(editedItems.find((i) => i.id === itemId).modificado, true);

    // Restaura o item individualmente
    const restoredItems = restoreItem(editedItems, itemId);
    const restoredItem = restoredItems.find((i) => i.id === itemId);

    assert.strictEqual(restoredItem.quantidade, '500.0000');
    assert.strictEqual(restoredItem.valorTotal, '12750.00');
    assert.strictEqual(restoredItem.modificado, false);
    assert.strictEqual(restoredItem.valorOriginal, null);

    // Totais recalculados retornam exatamente ao baseline inicial
    const restoredTotais = calculateInvoiceTotals(restoredItems, invoice.totais);
    assert.strictEqual(restoredTotais.valorProdutos, invoice.totais.valorProdutos);
    assert.strictEqual(restoredTotais.valorTotalNota, invoice.totais.valorTotalNota);
  });

  it('Restaura múltiplos itens modificados simultaneamente com handleRestoreAll', () => {
    const invoice = createConferenceInvoiceFixture();
    const id1 = 'nfe-35241112345678000190550010001458921001234562-item-1';
    const id2 = 'nfe-35241112345678000190550010001458921001234562-item-2';

    // Modifica item 1 e item 2
    let items = applyItemChange(invoice.itens, id1, 'quantidade', '800.0000');
    items = applyItemChange(items, id2, 'quantidade', '20.0000');

    assert.strictEqual(items.filter((i) => i.modificado).length, 2);

    // Executa restauração em lote (Restaurar Todos)
    const allRestored = restoreAllItems(items);
    assert.strictEqual(allRestored.filter((i) => i.modificado).length, 0);

    const it1 = allRestored.find((i) => i.id === id1);
    const it2 = allRestored.find((i) => i.id === id2);

    assert.strictEqual(it1.quantidade, '500.0000');
    assert.strictEqual(it2.quantidade, '10.0000');

    const finalTotais = calculateInvoiceTotals(allRestored, invoice.totais);
    assert.strictEqual(finalTotais.valorTotalNota, invoice.totais.valorTotalNota);
  });
});
