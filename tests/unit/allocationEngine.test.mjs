/**
 * SmartNFe — Comprehensive Unit Test Suite: Unified Allocation Engine & Dual-Storage Repositories
 * 
 * Scope: Milestone 1 (Core Allocation Engine & Repositories)
 * Requirements: R3, R4, R5 (ORIGINAL_REQUEST.md, PROJECT.md, SCOPE.md)
 * 
 * Verifies:
 * 1. BigInt pure decimal arithmetic (zero IEEE-754 binary float leakage).
 * 2. Unit compatibility checks (checkUnitCompatibility).
 * 3. Strict conservation rule (available = original - activeAllocations).
 * 4. Scenario N -> 1 (Grouping / Agrupamento) with origin identity preservation.
 * 5. Scenario 1 -> M (Division / Desmembramento) with exact remainder absorption.
 * 6. Scenario N -> M (Mixed Allocation / Preparação Mista) with composite keys.
 * 7. Multi-source accessory expense apportionment with zero drift cent conservation.
 * 8. Adversarial boundaries, negative quantity blocking, and invariant oracles.
 * 9. Dual-storage isolation (session Map vs localStorage) in repositories.
 * 
 * Execution: node --no-warnings --test tests/unit/allocationEngine.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateAllocationMatrix,
  calculateItemBalance,
  calculateItemConservationBalance,
  checkUnitCompatibility,
  distributeEqually,
  distributeRemainingEqually,
  apportionExpenses,
  apportionMultiSourceExpenses,
  makeSourceKey,
  parseSourceKey,
  buildCompositeKey,
  parseCompositeKey,
} from '../../app/lib/calculations/allocationEngine.js';

import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalCompare,
  roundDecimal,
  decimalSum,
  decimalMin,
  decimalMax,
  isDecimalPositive,
  isDecimalZero,
  isDecimalNegative,
} from '../../app/lib/calculations/decimal.js';

import {
  preparedInvoiceRepository,
  sessionPreparedInvoices,
} from '../../app/features/preparedInvoiceRepository.js';

import {
  preparationRepository,
  sessionPreparations,
} from '../../app/features/preparationRepository.js';

import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';

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

  it('1.2: Conserva rigorosamente 4 casas decimais em quantidades fiscais (ex: 500.5555)', () => {
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

  it('1.5: Operações vetoriais de decimal.js operam com precisão BigInt pura sem libs externas', () => {
    const sum = decimalSum(['10.1234', '20.5678', '30.3088'], 4);
    assert.strictEqual(sum, '61.0000');

    assert.strictEqual(decimalMin('15.50', '2.30', '99.99'), '2.30');
    assert.strictEqual(decimalMax('15.50', '2.30', '99.99'), '99.99');
    assert.strictEqual(isDecimalPositive('0.0001'), true);
    assert.strictEqual(isDecimalPositive('0.0000'), false);
    assert.strictEqual(isDecimalZero('0.0000'), true);
    assert.strictEqual(isDecimalNegative('-0.0001'), true);
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
    assert.strictEqual(checkUnitCompatibility('CX', 'CXS'), true);
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
    assert.strictEqual(bal.status, 'partial');
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
      { id: 'dest-1', allocations: { 'nfe-10__i-1': '100.0001' } },
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
    const activeAllocations = {
      'nfe-10__i-1': '400.0000',
    };

    const destNotesOk = [
      { id: 'dest-1', allocations: { 'nfe-10__i-1': '600.0000' } },
    ];
    const resOk = calculateAllocationMatrix(sourceItems, destNotesOk, activeAllocations);
    assert.strictEqual(resOk.canSave, true);
    assert.strictEqual(resOk.sourceBalances['nfe-10__i-1'].remainingQty, '0.0000');

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
    assert.strictEqual(result.totals.totalAllocatedValue, '3050.00');

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
        sourceItemId: 'item-1',
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
    assert.strictEqual(slices[2], '33.3334');

    const sum = slices.reduce((acc, s) => decimalAdd(acc, s, 4), '0.0000');
    assert.strictEqual(sum, '100.0000');
  });

  it('5.3: distributeRemainingEqually zera o saldo remanescente entre destinos', () => {
    const orig = '500.0000';
    const current = ['200.0000', '100.0000'];
    const updated = distributeRemainingEqually(orig, current, 4);

    assert.strictEqual(updated.length, 2);
    assert.strictEqual(updated[0], '300.0000');
    assert.strictEqual(updated[1], '200.0000');

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

    assert.strictEqual(res.sourceBalances['nfe-s1__i1'].status, 'ok');
    assert.strictEqual(res.sourceBalances['nfe-s2__i1'].status, 'ok');
    assert.strictEqual(res.sourceBalances['nfe-s3__i1'].status, 'ok');

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

    assert.strictEqual(result.d1.valorFrete, '33.33');
    assert.strictEqual(result.d2.valorFrete, '33.33');
    assert.strictEqual(result.d3.valorFrete, '33.34');

    const sumFrete = decimalAdd(decimalAdd(result.d1.valorFrete, result.d2.valorFrete, 2), result.d3.valorFrete, 2);
    assert.strictEqual(sumFrete, '100.00', 'Soma do frete deve ser identicamente 100.00');

    assert.strictEqual(result.d3.freight, '33.34');
    assert.strictEqual(result.d3.insurance, '16.66'); // Half-Up: 16.67 + 16.67 + 16.66 = 50.00
    const sumSeguro = decimalAdd(decimalAdd(result.d1.insurance, result.d2.insurance, 2), result.d3.insurance, 2);
    assert.strictEqual(sumSeguro, '50.00', 'Soma do seguro deve ser identicamente 50.00');
  });

  it('7.3: Rateio simultâneo de despesas acessórias de 2 origens distintas para 2 destinos', () => {
    const sourceInvoicesTotals = {
      orig1: { valorFrete: '1000.00', valorSeguro: '0.00', outrasDespesas: '0.00', valorDesconto: '0.00' },
      orig2: { valorFrete: '2000.00', valorSeguro: '0.00', outrasDespesas: '0.00', valorDesconto: '0.00' },
    };

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

    const r1 = apportionMultiSourceExpenses(sourceInvoicesTotals, allocationsBySource.orig1, 'orig1');
    const r2 = apportionMultiSourceExpenses(sourceInvoicesTotals, allocationsBySource.orig2, 'orig2');

    const dest1FreteTotal = decimalAdd(r1['dest-1'].valorFrete, r2['dest-1'].valorFrete, 2);
    assert.strictEqual(dest1FreteTotal, '1000.00');

    const dest2FreteTotal = decimalAdd(r1['dest-2'].valorFrete, r2['dest-2'].valorFrete, 2);
    assert.strictEqual(dest2FreteTotal, '2000.00');

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

// ============================================================================
// SUITE 9: Dual-Storage Repositories & Volatile Memory Isolation (R4, R5)
// ============================================================================
describe('SUITE 9: Dual-Storage Isolation (Session Map vs LocalStorage)', () => {
  beforeEach(async () => {
    await preparedInvoiceRepository.resetDemoData();
    await preparationRepository.resetDemoData();
  });

  it('9.1: Prepared Invoice Real: Armazena estritamente em sessionPreparedInvoices e NÃO em localStorage', async () => {
    const realPrep = await preparedInvoiceRepository.create({
      id: 'prep-real-test-001',
      parentInvoiceId: 'nfe-352411000145892-01', // ID real que não começa com demo-
      isRealImport: true,
      origemNumero: '000.145.892',
      numero: 'EXP-REAL-001',
      descricaoLote: 'Lote Exportação Roterdã',
      valorTotal: '50000.00',
    });

    assert.ok(sessionPreparedInvoices.has('prep-real-test-001'), 'Deve residir em sessionPreparedInvoices');

    // Verifica que NÃO foi gravado no localStorageService
    const stored = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, []);
    const inStorage = stored.some((p) => p.id === 'prep-real-test-001');
    assert.strictEqual(inStorage, false, 'XML REAL NÃO PODE ESTAR NO LOCALSTORAGE');

    // Mas a busca findById e list encontram a nota perfeitamente
    const found = await preparedInvoiceRepository.findById('prep-real-test-001');
    assert.ok(found, 'findById deve encontrar nota da sessão');
    assert.strictEqual(found.id, 'prep-real-test-001');

    const listed = await preparedInvoiceRepository.list({ parentInvoiceId: 'nfe-352411000145892-01' });
    assert.strictEqual(listed.length, 1);
  });

  it('9.2: Prepared Invoice Demo: Notas demo-01..05 são persistidas no localStorageService', async () => {
    const demoPrep = await preparedInvoiceRepository.create({
      id: 'prep-demo-test-002',
      parentInvoiceId: 'demo-01',
      isDemo: true,
      origemNumero: '000.145.892',
      numero: 'EXP-DEMO-002',
    });

    assert.strictEqual(sessionPreparedInvoices.has('prep-demo-test-002'), false, 'Demo não deve poluir a sessão');

    const stored = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, []);
    const inStorage = stored.some((p) => p.id === 'prep-demo-test-002');
    assert.strictEqual(inStorage, true, 'Demo deve ser persistida no localStorage');
  });

  it('9.3: Preparation Repository: Criação, atualização e isolamento de sessão', async () => {
    const realPreparation = await preparationRepository.create({
      id: 'prep-nm-001',
      titulo: 'Preparação Mista Grãos',
      tipo: 'mista',
      status: 'active',
      isRealImport: true,
      origens: [{ invoiceId: 'nfe-real-grain-1', numero: '001' }],
      alocacoes: {
        'nfe-real-grain-1__item-1__dest-1': '300.0000',
        'nfe-real-grain-1__item-1__dest-2': '200.0000',
      },
    });

    assert.ok(sessionPreparations.has('prep-nm-001'), 'Preparação real deve estar em sessionPreparations');

    const found = await preparationRepository.findById('prep-nm-001');
    assert.ok(found);
    assert.strictEqual(found.status, 'active');

    // Atualiza status
    await preparationRepository.update('prep-nm-001', { status: 'completed' });
    const updated = await preparationRepository.findById('prep-nm-001');
    assert.strictEqual(updated.status, 'completed');
  });

  it('9.4: Preparation Repository getActiveAllocations: Acumula alocações ativas e respeita exclusões', async () => {
    // Prep 1: Ativa com 300 de item-1
    await preparationRepository.create({
      id: 'prep-alloc-1',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'nf-1__item-1__dest-1': '300.0000',
      },
    });

    // Prep 2: Rascunho com 200 de item-1 e 100 de item-2
    await preparationRepository.create({
      id: 'prep-alloc-2',
      status: 'draft',
      isRealImport: true,
      alocacoes: {
        'nf-1__item-1__dest-2': '200.0000',
        'nf-1__item-2__dest-1': '100.0000',
      },
    });

    // Prep 3: Cancelada com 500 de item-1 (não deve reter saldo!)
    await preparationRepository.create({
      id: 'prep-alloc-3',
      status: 'cancelled',
      isRealImport: true,
      alocacoes: {
        'nf-1__item-1__dest-1': '500.0000',
      },
    });

    // Consulta geral: 300 + 200 = 500 para nf-1__item-1
    const activeAll = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeAll.get('nf-1__item-1'), '500.0000');
    assert.strictEqual(activeAll.get('nf-1__item-2'), '100.0000');

    // Exclusão da prep-alloc-2 (ex: edição da própria preparação): deve retornar apenas 300
    const activeExcluding2 = await preparationRepository.getActiveAllocations('prep-alloc-2');
    assert.strictEqual(activeExcluding2.get('nf-1__item-1'), '300.0000');
    assert.strictEqual(activeExcluding2.get('nf-1__item-2') || '0.0000', '0.0000');

    // Sem rascunhos: apenas 300
    const activeNoDrafts = await preparationRepository.getActiveAllocations(null, { includeDrafts: false });
    assert.strictEqual(activeNoDrafts.get('nf-1__item-1'), '300.0000');
  });
});
