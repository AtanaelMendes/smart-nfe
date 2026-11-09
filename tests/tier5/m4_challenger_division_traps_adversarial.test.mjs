/**
 * SmartNFe — Tier 5 Adversarial Stress Test Suite: Milestone 4 Division Math & Traps
 *
 * Challenger: teamwork_challenger_m4_divisao_1
 * Target: Milestone 4 (M4_Invoice_Splitting_Balance_Conservation) — Features 16, 17, 18, 19
 * Scope: app/lib/calculations/divisionMath.js & app/documentos/[id]/divisao/page.jsx
 * Requirements: R1, R4 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Empirical verification of:
 * 1. High-precision division corner cases (10.0000 / 3, 1.0000 / 7, 0.0004 / 6, 99999.9999 / 4, etc.).
 * 2. Strict `canSave` blocker: unallocated remaining balance (even 0.0001) MUST block finalization.
 * 3. Excess allocation: allocating > original quantity MUST block finalization (canSave: false).
 * 4. Negative allocation injection: negative values must be rejected and must NOT offset excesses.
 * 5. Exact mathematical balance conservation: sum(pieces) === originalQtyStr with zero drift.
 * 6. Destination notes count boundaries (0 notes, 1 note, N notes).
 * 7. Ancillary expense apportionment with exact cent conservation (frete, seguro, outras, desconto).
 * 8. Property-based randomized stress harness (1,000+ iterations with invariant oracles).
 * 9. End-to-end split invoice generation and persistence verification with preparedInvoiceRepository.
 *
 * Execution: node --no-warnings --test tests/tier5/m4_challenger_division_traps_adversarial.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateRemainingBalance,
  validateDivisionBatch,
  distributeEqually,
  distributeRemainingEqually,
  apportionExpenses,
  apportionAllInvoiceExpenses,
} from '../../app/lib/calculations/divisionMath.js';

import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalCompare,
  cleanDecimalString,
  isDecimalNegative,
  isDecimalZero,
  roundDecimal,
  parseDecimal,
} from '../../app/lib/calculations/decimal.js';

import { calculateInvoiceTotals } from '../../app/lib/calculations/invoiceTotals.js';
import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { preparedInvoiceRepository } from '../../app/features/preparedInvoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';

// ============================================================================
// SUITE 1: High-Precision Division Corner Cases & Zero Drift Conservation
// ============================================================================
describe('CHALLENGER M4 SUITE 1: High-Precision Division Corner Cases (BigInt Conservation)', () => {

  it('1.1: Período infinito 10.0000 / 3 -> [3.3333, 3.3333, 3.3334] com soma exata 10.0000', () => {
    const orig = '10.0000';
    const pieces = distributeEqually(orig, 3, 4);

    assert.strictEqual(pieces.length, 3);
    assert.strictEqual(pieces[0], '3.3333');
    assert.strictEqual(pieces[1], '3.3333');
    assert.strictEqual(pieces[2], '3.3334');

    const sum = pieces.reduce((acc, p) => decimalAdd(acc, p, 4), '0.0000');
    assert.strictEqual(sum, '10.0000', 'A soma das 3 fatias deve ser identicamente 10.0000');

    const bal = calculateRemainingBalance(orig, pieces);
    assert.strictEqual(bal.status, 'ok');
    assert.strictEqual(bal.isOk, true);
    assert.strictEqual(bal.balanceStr, '0.0000');
    assert.strictEqual(bal.hasRemaining, false);
    assert.strictEqual(bal.hasExcess, false);
  });

  it('1.2: Período dízima 1.0000 / 7 -> 6 notas com 0.1428 e 1 nota com 0.1432, soma 1.0000', () => {
    const orig = '1.0000';
    const pieces = distributeEqually(orig, 7, 4);

    assert.strictEqual(pieces.length, 7);
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(pieces[i], '0.1428', `Nota ${i} deve receber 0.1428`);
    }
    assert.strictEqual(pieces[6], '0.1432', 'Última nota deve absorver o resto 4/10000 -> 0.1432');

    const sum = pieces.reduce((acc, p) => decimalAdd(acc, p, 4), '0.0000');
    assert.strictEqual(sum, '1.0000');

    const bal = calculateRemainingBalance(orig, pieces);
    assert.strictEqual(bal.status, 'ok');
    assert.strictEqual(bal.balanceStr, '0.0000');
  });

  it('1.3: Micro-quantidade 0.0004 / 6 -> 5 notas com 0.0000 e 1 nota com 0.0004', () => {
    const orig = '0.0004';
    const pieces = distributeEqually(orig, 6, 4);

    assert.strictEqual(pieces.length, 6);
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(pieces[i], '0.0000');
    }
    assert.strictEqual(pieces[5], '0.0004');

    const sum = pieces.reduce((acc, p) => decimalAdd(acc, p, 4), '0.0000');
    assert.strictEqual(sum, '0.0004');

    const bal = calculateRemainingBalance(orig, pieces);
    assert.strictEqual(bal.status, 'ok');
    assert.strictEqual(bal.balanceStr, '0.0000');
  });

  it('1.4: Menor unidade positiva 0.0001 / 2 e 0.0001 / 10', () => {
    const orig = '0.0001';

    // 0.0001 / 2 -> ['0.0000', '0.0001']
    const pieces2 = distributeEqually(orig, 2, 4);
    assert.deepStrictEqual(pieces2, ['0.0000', '0.0001']);
    assert.strictEqual(calculateRemainingBalance(orig, pieces2).status, 'ok');

    // 0.0001 / 10 -> 9 com 0.0000 e 1 com 0.0001
    const pieces10 = distributeEqually(orig, 10, 4);
    assert.strictEqual(pieces10.length, 10);
    assert.strictEqual(pieces10.slice(0, 9).every((p) => p === '0.0000'), true);
    assert.strictEqual(pieces10[9], '0.0001');
    assert.strictEqual(calculateRemainingBalance(orig, pieces10).balanceStr, '0.0000');
  });

  it('1.5: Quantidade máxima limítrofe 99999.9999 / 4 com conservação exata', () => {
    const orig = '99999.9999';
    const pieces = distributeEqually(orig, 4, 4);

    // 999999999 / 4 = 249999999 rem 3
    assert.strictEqual(pieces[0], '24999.9999');
    assert.strictEqual(pieces[1], '24999.9999');
    assert.strictEqual(pieces[2], '24999.9999');
    assert.strictEqual(pieces[3], '25000.0002');

    const sum = pieces.reduce((acc, p) => decimalAdd(acc, p, 4), '0.0000');
    assert.strictEqual(sum, '99999.9999');
    assert.strictEqual(calculateRemainingBalance(orig, pieces).status, 'ok');
  });

  it('1.6: Quantidade zero (0.0000 / 5) e quantidade negativa (-10.0000 / 3)', () => {
    const zeroPieces = distributeEqually('0.0000', 5, 4);
    assert.strictEqual(zeroPieces.length, 5);
    assert.strictEqual(zeroPieces.every((p) => p === '0.0000'), true);

    // Quantidade negativa não gera alocações válidas
    const negPieces = distributeEqually('-10.0000', 3, 4);
    assert.strictEqual(negPieces.length, 3);
    assert.strictEqual(negPieces.every((p) => p === '0.0000'), true);
  });

  it('1.7: distributeRemainingEqually zera pendências remanescentes em alocações parciais existentes', () => {
    const orig = '1000.0000';
    const current = ['250.0000', '150.0000', '100.0000']; // Total 500.0000, restam 500.0000
    const updated = distributeRemainingEqually(orig, current, 4);

    assert.strictEqual(updated.length, 3);
    // 500.0000 / 3 = 166.6666 e sobra 0.0002 -> [166.6666, 166.6666, 166.6668]
    // 250 + 166.6666 = 416.6666
    // 150 + 166.6666 = 316.6666
    // 100 + 166.6668 = 266.6668
    assert.strictEqual(updated[0], '416.6666');
    assert.strictEqual(updated[1], '316.6666');
    assert.strictEqual(updated[2], '266.6668');

    const bal = calculateRemainingBalance(orig, updated);
    assert.strictEqual(bal.status, 'ok');
    assert.strictEqual(bal.balanceStr, '0.0000');
    assert.strictEqual(bal.isOk, true);
  });

  it('1.8: distributeRemainingEqually não altera se saldo já for zero ou excessivo', () => {
    const orig = '100.0000';
    const currentBalanced = ['50.0000', '50.0000'];
    const resBalanced = distributeRemainingEqually(orig, currentBalanced, 4);
    assert.deepStrictEqual(resBalanced, ['50.0000', '50.0000']);

    const currentExcess = ['60.0000', '50.0000']; // 110 > 100
    const resExcess = distributeRemainingEqually(orig, currentExcess, 4);
    assert.deepStrictEqual(resExcess, ['60.0000', '50.0000']);
  });
});

// ============================================================================
// SUITE 2: Strict canSave Blocker & Validation Traps
// ============================================================================
describe('CHALLENGER M4 SUITE 2: Strict canSave Blocker & Validation Traps (Zero-Tolerance)', () => {

  const baseItems = [
    {
      id: 'prod-01',
      item: 1,
      codigo: 'EXP-001',
      descricao: 'Café Grão Exportação',
      quantidade: '1000.0000',
      valorUnitario: '20.0000',
    },
    {
      id: 'prod-02',
      item: 2,
      codigo: 'EXP-002',
      descricao: 'Soja em Grãos',
      quantidade: '500.0000',
      valorUnitario: '15.0000',
    },
  ];

  it('2.1: TRAP: Saldo não alocado residual de 0.0001 DEVE bloquear finalização (canSave: false)', () => {
    const notes = [
      {
        id: 'nota-1',
        itens: [
          { id: 'prod-01', quantidade: '500.0000' },
          { id: 'prod-02', quantidade: '250.0000' },
        ],
      },
      {
        id: 'nota-2',
        itens: [
          { id: 'prod-01', quantidade: '499.9999' }, // Falta 0.0001!
          { id: 'prod-02', quantidade: '250.0000' },
        ],
      },
    ];

    const result = validateDivisionBatch(baseItems, notes);

    assert.strictEqual(result.hasRemaining, true, 'hasRemaining deve ser true');
    assert.strictEqual(result.canSave, false, 'canSave DEVE ser false mesmo por 0.0001 de sobra');
    assert.strictEqual(result.isValid, false, 'isValid deve ser false');
    assert.strictEqual(result.isBalanced, false, 'isBalanced deve ser false');
    assert.strictEqual(result.summary.remainingCount, 1);

    const reportProd1 = result.itemReports.find((r) => r.itemId === 'prod-01');
    assert.strictEqual(reportProd1.balanceStr, '0.0001');
    assert.strictEqual(reportProd1.status, 'remaining');
  });

  it('2.2: TRAP: Alocação com excesso de 0.0001 DEVE bloquear finalização (canSave: false, hasExcess: true)', () => {
    const notes = [
      {
        id: 'nota-1',
        itens: [
          { id: 'prod-01', quantidade: '500.0000' },
          { id: 'prod-02', quantidade: '250.0000' },
        ],
      },
      {
        id: 'nota-2',
        itens: [
          { id: 'prod-01', quantidade: '500.0001' }, // Excesso de 0.0001!
          { id: 'prod-02', quantidade: '250.0000' },
        ],
      },
    ];

    const result = validateDivisionBatch(baseItems, notes);

    assert.strictEqual(result.hasExcess, true, 'hasExcess deve ser true');
    assert.strictEqual(result.canSave, false, 'canSave DEVE ser false por excesso');
    assert.strictEqual(result.isValid, false, 'isValid deve ser false');
    assert.strictEqual(result.isBalanced, false);
    assert.strictEqual(result.summary.excessCount, 1);

    const reportProd1 = result.itemReports.find((r) => r.itemId === 'prod-01');
    assert.strictEqual(reportProd1.balanceStr, '-0.0001');
    assert.strictEqual(reportProd1.status, 'excess');
  });

  it('2.3: TRAP: Injeção negativa trojana (+15 e -5 para original 10) DEVE ser rejeitada', () => {
    // Tentativa de mascarar excesso com quantidade negativa na outra nota
    const origSingle = [{ id: 'prod-01', quantidade: '10.0000' }];
    const notes = [
      { id: 'nota-1', itens: [{ id: 'prod-01', quantidade: '15.0000' }] },
      { id: 'nota-2', itens: [{ id: 'prod-01', quantidade: '-5.0000' }] },
    ];

    const result = validateDivisionBatch(origSingle, notes);

    assert.strictEqual(result.hasExcess, true, 'Injeção negativa deve ser classificada como excesso/inválido');
    assert.strictEqual(result.canSave, false, 'canSave DEVE ser false contra compensação negativa');
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.isBalanced, false);

    const report = result.itemReports[0];
    assert.strictEqual(report.status, 'excess');
  });

  it('2.4: TRAP: Quantidade negativa isolada com soma inferior à original', () => {
    const origSingle = [{ id: 'prod-01', quantidade: '10.0000' }];
    const notes = [
      { id: 'nota-1', itens: [{ id: 'prod-01', quantidade: '5.0000' }] },
      { id: 'nota-2', itens: [{ id: 'prod-01', quantidade: '-1.0000' }] },
    ];

    const result = validateDivisionBatch(origSingle, notes);

    assert.strictEqual(result.hasExcess, true);
    assert.strictEqual(result.canSave, false);
    assert.strictEqual(result.isValid, false);
  });

  it('2.5: TRAP: Limite de notas de destino (0 notas e 1 nota devem bloquear canSave)', () => {
    // 0 notas
    const rep0 = validateDivisionBatch(baseItems, []);
    assert.strictEqual(rep0.canSave, false, '0 notas de destino não podem permitir canSave');
    assert.strictEqual(rep0.hasRemaining, true);

    // 1 nota com 100% alocado (Divisão exige no mínimo 2 notas)
    const rep1 = validateDivisionBatch(baseItems, [
      {
        id: 'nota-1',
        itens: [
          { id: 'prod-01', quantidade: '1000.0000' },
          { id: 'prod-02', quantidade: '500.0000' },
        ],
      },
    ]);
    assert.strictEqual(rep1.canSave, false, 'Apenas 1 nota de destino deve bloquear canSave (mínimo 2 notas)');
    assert.strictEqual(rep1.hasRemaining, false);
    assert.strictEqual(rep1.hasExcess, false);
    assert.strictEqual(rep1.isBalanced, true);
  });

  it('2.6: TRAP: Lote vazio de itens originais ([]) não pode salvar', () => {
    const notes = [
      { id: 'nota-1', itens: [] },
      { id: 'nota-2', itens: [] },
    ];
    const rep = validateDivisionBatch([], notes);
    assert.strictEqual(rep.canSave, false, 'Lote vazio sem itens não deve ser salvável');
    assert.strictEqual(rep.isBalanced, false);
  });

  it('2.7: Cenário perfeitamente balanceado em 3 notas DEVE autorizar canSave: true', () => {
    const notes = [
      {
        id: 'nota-1',
        itens: [
          { id: 'prod-01', quantidade: '333.3333' },
          { id: 'prod-02', quantidade: '166.6666' },
        ],
      },
      {
        id: 'nota-2',
        itens: [
          { id: 'prod-01', quantidade: '333.3333' },
          { id: 'prod-02', quantidade: '166.6666' },
        ],
      },
      {
        id: 'nota-3',
        itens: [
          { id: 'prod-01', quantidade: '333.3334' },
          { id: 'prod-02', quantidade: '166.6668' },
        ],
      },
    ];

    const result = validateDivisionBatch(baseItems, notes);

    assert.strictEqual(result.hasExcess, false);
    assert.strictEqual(result.hasRemaining, false);
    assert.strictEqual(result.isBalanced, true);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.canSave, true, 'Lote 100% balanceado com 3 notas DEVE autorizar canSave');
    assert.strictEqual(result.summary.balancedCount, 2);
  });
});

// ============================================================================
// SUITE 3: Ancillary Expense Apportionment & Strict Fiscal Reconciliation
// ============================================================================
describe('CHALLENGER M4 SUITE 3: Ancillary Expense Apportionment (Exact Cent Conservation)', () => {

  it('3.1: Rateio de frete com centavos ímpares (R$ 0.01 entre 3 notas) -> absorção exata no último lote', () => {
    const parentTotals = {
      valorFrete: '0.01',
      valorSeguro: '0.00',
      outrasDespesas: '0.00',
      valorDesconto: '0.00',
    };

    const notesWithProducts = [
      { id: 'n1', productTotal: '100.00' },
      { id: 'n2', productTotal: '100.00' },
      { id: 'n3', productTotal: '100.00' },
    ];

    const expenses = apportionAllInvoiceExpenses(parentTotals, notesWithProducts);

    assert.strictEqual(expenses.n1.valorFrete, '0.00');
    assert.strictEqual(expenses.n2.valorFrete, '0.00');
    assert.strictEqual(expenses.n3.valorFrete, '0.01', 'A última nota deve absorver o resíduo de 0.01');

    const totalFrete = decimalAdd(
      decimalAdd(expenses.n1.valorFrete, expenses.n2.valorFrete, 2),
      expenses.n3.valorFrete,
      2
    );
    assert.strictEqual(totalFrete, '0.01');
  });

  it('3.2: Rateio simultâneo de frete, seguro, outras despesas e desconto com proporções assimétricas', () => {
    const parentTotals = {
      valorFrete: '1250.75',
      valorSeguro: '345.20',
      outrasDespesas: '89.99',
      valorDesconto: '200.50',
    };

    // Notas com produtos assimétricos: 10%, 30%, 60%
    const notesWithProducts = [
      { id: 'n1', productTotal: '10000.00' }, // 10%
      { id: 'n2', productTotal: '30000.00' }, // 30%
      { id: 'n3', productTotal: '60000.00' }, // 60%
    ];

    const exp = apportionAllInvoiceExpenses(parentTotals, notesWithProducts);

    // Reconciliação do Frete (1250.75):
    // n1 = 125.08, n2 = 375.23, n3 = 1250.75 - 125.08 - 375.23 = 750.44
    assert.strictEqual(exp.n1.valorFrete, '125.08');
    assert.strictEqual(exp.n2.valorFrete, '375.23');
    assert.strictEqual(exp.n3.valorFrete, '750.44');
    const sumFrete = ['n1', 'n2', 'n3'].reduce((acc, k) => decimalAdd(acc, exp[k].valorFrete, 2), '0.00');
    assert.strictEqual(sumFrete, '1250.75');

    // Reconciliação do Seguro (345.20):
    const sumSeguro = ['n1', 'n2', 'n3'].reduce((acc, k) => decimalAdd(acc, exp[k].valorSeguro, 2), '0.00');
    assert.strictEqual(sumSeguro, '345.20');

    // Reconciliação de Outras Despesas (89.99):
    const sumOutras = ['n1', 'n2', 'n3'].reduce((acc, k) => decimalAdd(acc, exp[k].outrasDespesas, 2), '0.00');
    assert.strictEqual(sumOutras, '89.99');

    // Reconciliação de Desconto (200.50):
    const sumDesconto = ['n1', 'n2', 'n3'].reduce((acc, k) => decimalAdd(acc, exp[k].valorDesconto, 2), '0.00');
    assert.strictEqual(sumDesconto, '200.50');
  });

  it('3.3: Caso patológico: total de produtos é ZERO -> divide despesas igualmente entre notas', () => {
    const parentTotals = {
      valorFrete: '10.00',
      valorSeguro: '5.00',
      outrasDespesas: '1.00',
      valorDesconto: '0.00',
    };

    const notesWithZeroProducts = [
      { id: 'n1', productTotal: '0.00' },
      { id: 'n2', productTotal: '0.00' },
      { id: 'n3', productTotal: '0.00' },
    ];

    const exp = apportionAllInvoiceExpenses(parentTotals, notesWithZeroProducts);

    // 10.00 / 3 -> [3.33, 3.33, 3.34]
    assert.strictEqual(exp.n1.valorFrete, '3.33');
    assert.strictEqual(exp.n2.valorFrete, '3.33');
    assert.strictEqual(exp.n3.valorFrete, '3.34');
    const sumFrete = decimalAdd(decimalAdd(exp.n1.valorFrete, exp.n2.valorFrete, 2), exp.n3.valorFrete, 2);
    assert.strictEqual(sumFrete, '10.00');
  });

  it('3.4: Reconciliação SEFAZ completa: soma do valorTotalNota de todas as notas preparadas === original', () => {
    // Nota pai com produtos R$ 100.000,00 + Frete R$ 1.500,00 + Seguro R$ 300,00 + Outras R$ 200,00 - Desconto R$ 1.000,00
    // Total original: 100000.00 + 1500.00 + 300.00 + 200.00 - 1000.00 = 101000.00
    const parentTotals = {
      valorProdutos: '100000.00',
      valorFrete: '1500.00',
      valorSeguro: '300.00',
      outrasDespesas: '200.00',
      valorDesconto: '1000.00',
      valorTotalNota: '101000.00',
    };

    const notesWithProducts = [
      { id: 'nota-A', productTotal: '35000.00' },
      { id: 'nota-B', productTotal: '65000.00' },
    ];

    const exp = apportionAllInvoiceExpenses(parentTotals, notesWithProducts);

    // Calcula notaTotais para Nota A
    const totalsA = calculateInvoiceTotals(
      [{ valorTotal: '35000.00' }],
      {
        freight: exp['nota-A'].valorFrete,
        insurance: exp['nota-A'].valorSeguro,
        otherExpenses: exp['nota-A'].outrasDespesas,
        discount: exp['nota-A'].valorDesconto,
      }
    );

    // Calcula notaTotais para Nota B
    const totalsB = calculateInvoiceTotals(
      [{ valorTotal: '65000.00' }],
      {
        freight: exp['nota-B'].valorFrete,
        insurance: exp['nota-B'].valorSeguro,
        otherExpenses: exp['nota-B'].outrasDespesas,
        discount: exp['nota-B'].valorDesconto,
      }
    );

    const sumTotalNotas = decimalAdd(totalsA.valorTotalNota, totalsB.valorTotalNota, 2);
    assert.strictEqual(sumTotalNotas, parentTotals.valorTotalNota, 'Soma do valorTotalNota DEVE ser exatamente 101000.00');
  });
});

// ============================================================================
// SUITE 4: Property-Based Randomized Stress Harness (Fuzzing 1,000+ Iterations)
// ============================================================================
describe('CHALLENGER M4 SUITE 4: Property-Based Randomized Stress Harness (1,000+ Oracles)', () => {

  it('4.1: Property 1: 1.000 iterações aleatórias de distributeEqually mantêm soma idêntica e fatias não-negativas', () => {
    for (let i = 0; i < 1000; i++) {
      // Gera quantidade aleatória com até 4 casas decimais entre 0.0001 e 99999.9999
      const intPart = Math.floor(Math.random() * 50000);
      const decPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const qtyStr = `${intPart}.${decPart}`;

      // Notas aleatórias entre 2 e 15
      const numNotes = Math.floor(Math.random() * 14) + 2;

      const pieces = distributeEqually(qtyStr, numNotes, 4);

      // Invariante 1: Tamanho exato
      assert.strictEqual(pieces.length, numNotes, `Iter ${i}: Tamanho incorreto`);

      // Invariante 2: Todas não-negativas
      for (let j = 0; j < numNotes; j++) {
        assert.strictEqual(
          decimalCompare(pieces[j], '0') >= 0,
          true,
          `Iter ${i}: Fatia ${j} negativa (${pieces[j]})`
        );
      }

      // Invariante 3: Conservação exata da soma
      let sum = '0.0000';
      for (const p of pieces) {
        sum = decimalAdd(sum, p, 4);
      }
      assert.strictEqual(
        sum,
        qtyStr,
        `Iter ${i}: Desvio de conservação em ${qtyStr} / ${numNotes}! Obtido: ${sum}`
      );

      // Invariante 4: Dispersão mínima (fatias diferem no máximo em 0.0001)
      const parsedBase = parseDecimal(pieces[0]).intVal;
      const parsedLast = parseDecimal(pieces[numNotes - 1]).intVal;
      const diff = parsedLast >= parsedBase ? parsedLast - parsedBase : parsedBase - parsedLast;
      assert.strictEqual(
        diff < BigInt(numNotes),
        true,
        `Iter ${i}: Dispersão excessiva entre fatias!`
      );

      // Invariante 5: calculateRemainingBalance acusa ok
      const bal = calculateRemainingBalance(qtyStr, pieces);
      assert.strictEqual(bal.status, 'ok', `Iter ${i}: Status do balanço não é ok`);
      assert.strictEqual(bal.balanceStr, '0.0000');
    }
  });

  it('4.2: Property 2: 500 iterações aleatórias de validação bloqueiam estritamente canSave sob perturbações', () => {
    for (let i = 0; i < 500; i++) {
      const origQty = `${Math.floor(Math.random() * 5000) + 10}.0000`;
      const numNotes = Math.floor(Math.random() * 5) + 2; // 2 a 6 notas
      const pieces = distributeEqually(origQty, numNotes, 4);

      const items = [{ id: 'prod-fuzz', quantidade: origQty }];
      const makeNotes = (allocs) => allocs.map((qty, idx) => ({
        id: `nota-${idx + 1}`,
        itens: [{ id: 'prod-fuzz', quantidade: qty }],
      }));

      // Cenário A: Alocação Perfeita -> canSave deve ser TRUE
      const validRep = validateDivisionBatch(items, makeNotes(pieces));
      assert.strictEqual(validRep.canSave, true, `Iter ${i}: Lote perfeito deve ter canSave = true`);

      // Cenário B: Perturbação por falta (-0.0001 na primeira nota) -> canSave DEVE ser FALSE
      const deficitPieces = [...pieces];
      deficitPieces[0] = decimalSubtract(deficitPieces[0], '0.0001', 4);
      const deficitRep = validateDivisionBatch(items, makeNotes(deficitPieces));
      assert.strictEqual(deficitRep.canSave, false, `Iter ${i}: Déficit de 0.0001 DEVE bloquear canSave`);
      assert.strictEqual(deficitRep.hasRemaining, true);

      // Cenário C: Perturbação por excesso (+0.0001 na última nota) -> canSave DEVE ser FALSE
      const excessPieces = [...pieces];
      excessPieces[numNotes - 1] = decimalAdd(excessPieces[numNotes - 1], '0.0001', 4);
      const excessRep = validateDivisionBatch(items, makeNotes(excessPieces));
      assert.strictEqual(excessRep.canSave, false, `Iter ${i}: Excesso de 0.0001 DEVE bloquear canSave`);
      assert.strictEqual(excessRep.hasExcess, true);

      // Cenário D: Injeção de valor negativo -> canSave DEVE ser FALSE
      const negPieces = [...pieces];
      negPieces[0] = '-1.0000';
      const negRep = validateDivisionBatch(items, makeNotes(negPieces));
      assert.strictEqual(negRep.canSave, false, `Iter ${i}: Injeção negativa DEVE bloquear canSave`);
      assert.strictEqual(negRep.hasExcess, true);
    }
  });

  it('4.3: Property 3: 300 iterações de apportionAllInvoiceExpenses conservam estritamente o centavo', () => {
    for (let i = 0; i < 300; i++) {
      const origFrete = `${Math.floor(Math.random() * 5000)}.${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
      const origSeguro = `${Math.floor(Math.random() * 2000)}.${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
      const origOutras = `${Math.floor(Math.random() * 1000)}.${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
      const origDesconto = `${Math.floor(Math.random() * 500)}.${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;

      const numNotes = Math.floor(Math.random() * 6) + 2; // 2 a 7 notas
      const notesWithProducts = [];
      for (let n = 0; n < numNotes; n++) {
        const prodVal = `${Math.floor(Math.random() * 50000) + 100}.${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
        notesWithProducts.push({ id: `nota-${n + 1}`, productTotal: prodVal });
      }

      const parentTotals = {
        valorFrete: origFrete,
        valorSeguro: origSeguro,
        outrasDespesas: origOutras,
        valorDesconto: origDesconto,
      };

      const result = apportionAllInvoiceExpenses(parentTotals, notesWithProducts);

      let sumFrete = '0.00';
      let sumSeguro = '0.00';
      let sumOutras = '0.00';
      let sumDesconto = '0.00';

      for (const n of notesWithProducts) {
        sumFrete = decimalAdd(sumFrete, result[n.id].valorFrete, 2);
        sumSeguro = decimalAdd(sumSeguro, result[n.id].valorSeguro, 2);
        sumOutras = decimalAdd(sumOutras, result[n.id].outrasDespesas, 2);
        sumDesconto = decimalAdd(sumDesconto, result[n.id].valorDesconto, 2);
      }

      assert.strictEqual(sumFrete, origFrete, `Iter ${i}: Desvio em Frete! ${sumFrete} vs ${origFrete}`);
      assert.strictEqual(sumSeguro, origSeguro, `Iter ${i}: Desvio em Seguro! ${sumSeguro} vs ${origSeguro}`);
      assert.strictEqual(sumOutras, origOutras, `Iter ${i}: Desvio em Outras Despesas! ${sumOutras} vs ${origOutras}`);
      assert.strictEqual(sumDesconto, origDesconto, `Iter ${i}: Desvio em Desconto! ${sumDesconto} vs ${origDesconto}`);
    }
  });
});

// ============================================================================
// SUITE 5: Full Division Workflow Simulation & Persistence Contract
// ============================================================================
describe('CHALLENGER M4 SUITE 5: Division UI Workflow Simulation & Persistence Integration', () => {

  it('5.1: Simula fluxo completo de divisão da NF-e demo-01 em 2 lotes com conservação e persistência em preparedInvoiceRepository', async () => {
    const origInvoice = await invoiceRepository.findById('demo-01');
    assert.ok(origInvoice, 'NF-e original demo-01 deve existir no repositório');

    const numNotes = 2;
    const targetNotes = [
      { id: 'nota-1', nome: 'Lote Roterdã', itens: {} },
      { id: 'nota-2', nome: 'Lote Antuérpia', itens: {} },
    ];

    // Simula clique em "Distribuir Igualmente" (handleDistributeEqually)
    origInvoice.itens.forEach((it) => {
      const slices = distributeEqually(it.quantidade, numNotes, 4);
      targetNotes.forEach((n, idx) => {
        n.itens[it.id] = slices[idx];
      });
    });

    // Auditoria via batch
    const batchResult = validateDivisionBatch(origInvoice.itens, targetNotes);
    assert.strictEqual(batchResult.canSave, true, 'Divisão em 2 lotes deve autorizar canSave');
    assert.strictEqual(batchResult.hasExcess, false);
    assert.strictEqual(batchResult.hasRemaining, false);

    // Rateio de despesas acessórias da nota
    const activeNotesForExpenses = targetNotes.map((n) => {
      let prodSum = '0.00';
      origInvoice.itens.forEach((it) => {
        const q = n.itens[it.id];
        const lineTotal = decimalMultiply(it.valorUnitario, q, 2);
        prodSum = decimalAdd(prodSum, lineTotal, 2);
      });
      return { id: n.id, productTotal: prodSum };
    });

    const expensesByNote = apportionAllInvoiceExpenses(origInvoice.totais || {}, activeNotesForExpenses);

    // Geração das notas preparadas
    const createdNotes = [];
    for (let i = 0; i < targetNotes.length; i++) {
      const note = targetNotes[i];
      const suffix = String.fromCharCode(65 + i);
      const exp = expensesByNote[note.id];

      const distributedItems = origInvoice.itens.map((origItem, itemIdx) => {
        const q = note.itens[origItem.id];
        return {
          ...origItem,
          item: itemIdx + 1,
          quantidade: q,
          valorTotal: decimalMultiply(origItem.valorUnitario, q, 2),
        };
      });

      const noteTotais = calculateInvoiceTotals(distributedItems, {
        freight: exp.valorFrete,
        insurance: exp.valorSeguro,
        otherExpenses: exp.outrasDespesas,
        discount: exp.valorDesconto,
      });

      const created = await preparedInvoiceRepository.create({
        parentInvoiceId: origInvoice.id,
        origemNumero: origInvoice.numero,
        numero: `${origInvoice.numero}-${suffix}`,
        serie: origInvoice.serie || '1',
        nomePreparacao: note.nome,
        itens: distributedItems,
        quantidadeItens: distributedItems.length,
        valorProdutos: noteTotais.valorProdutos,
        valorFrete: noteTotais.valorFrete,
        valorSeguro: noteTotais.valorSeguro,
        outrasDespesas: noteTotais.outrasDespesas,
        valorDesconto: noteTotais.valorDesconto,
        valorTotalNota: noteTotais.valorTotalNota,
        totais: noteTotais,
        status: 'preparado',
      });

      createdNotes.push(created);
    }

    assert.strictEqual(createdNotes.length, 2);

    // Atualiza status da NF original para 'dividida'
    await invoiceRepository.update(origInvoice.id, { status: 'dividida' });
    const reloadedParent = await invoiceRepository.findById(origInvoice.id);
    assert.strictEqual(reloadedParent.status, 'dividida');

    // Verifica que a soma dos totais das notas preparadas bate exatamente com o total da nota pai
    const sumAllPrepTotals = createdNotes.reduce(
      (acc, n) => decimalAdd(acc, n.valorTotalNota, 2),
      '0.00'
    );
    assert.strictEqual(
      sumAllPrepTotals,
      origInvoice.totais.valorTotalNota,
      'Soma das notas preparadas DEVE reconciliar 100% com o total da NF original'
    );

    // Consulta no preparedInvoiceRepository com filtro parentInvoiceId
    const listed = await preparedInvoiceRepository.list({ parentInvoiceId: origInvoice.id });
    assert.strictEqual(listed.length >= 2, true);
  });

  it('5.2: Simula desmembramento por lotes de contêineres na NF-e demo-02 (itens 1..12 e 13..25)', async () => {
    const origInvoice = await invoiceRepository.findById('demo-02');
    assert.ok(origInvoice, 'NF-e original demo-02 deve existir');

    const targetNotes = [
      { id: 'nota-cntr-1', nome: 'Contêiner 1 - Itens Leves', itens: {} },
      { id: 'nota-cntr-2', nome: 'Contêiner 2 - Itens Pesados', itens: {} },
    ];

    // Aloca itens 1..12 na Nota 1 e 13..25 na Nota 2
    origInvoice.itens.forEach((it, idx) => {
      if (idx < 12) {
        targetNotes[0].itens[it.id] = it.quantidade;
        targetNotes[1].itens[it.id] = '0.0000';
      } else {
        targetNotes[0].itens[it.id] = '0.0000';
        targetNotes[1].itens[it.id] = it.quantidade;
      }
    });

    const rep = validateDivisionBatch(origInvoice.itens, targetNotes);
    assert.strictEqual(rep.canSave, true);
    assert.strictEqual(rep.hasExcess, false);
    assert.strictEqual(rep.hasRemaining, false);
    assert.strictEqual(rep.isBalanced, true);

    const activeNotes = targetNotes.map((n) => ({
      id: n.id,
      productTotal: rep.notesSummary.find((s) => s.noteId === n.id).totalProducts,
    }));
    const expenses = apportionAllInvoiceExpenses(origInvoice.totais || {}, activeNotes);

    let sumPrep = '0.00';
    for (let i = 0; i < targetNotes.length; i++) {
      const n = targetNotes[i];
      const distItems = origInvoice.itens
        .filter((it) => decimalCompare(n.itens[it.id] || '0', '0') > 0)
        .map((it) => ({
          ...it,
          valorTotal: decimalMultiply(it.valorUnitario, n.itens[it.id], 2),
        }));

      const exp = expenses[n.id];
      const t = calculateInvoiceTotals(distItems, {
        freight: exp.valorFrete,
        insurance: exp.valorSeguro,
        otherExpenses: exp.outrasDespesas,
        discount: exp.valorDesconto,
      });
      sumPrep = decimalAdd(sumPrep, t.valorTotalNota, 2);
    }

    assert.strictEqual(sumPrep, origInvoice.totais.valorTotalNota, 'Desmembramento por lotes deve conciliar 100%');
  });

  it('5.3: UI Guard Invariant: Tentativa de finalização com canSave: false deve ser bloqueada', () => {
    const invalidBatch = {
      canSave: false,
      hasExcess: true,
      hasRemaining: false,
    };

    // Função de simulação do guard em handleFinalizeDivision
    const tryFinalize = (batch) => {
      if (!batch.canSave) {
        throw new Error('Bloqueio: finalização impedida devido a inconsistências na divisão');
      }
      return 'saved';
    };

    assert.throws(
      () => tryFinalize(invalidBatch),
      /Bloqueio: finalização impedida/
    );
  });
});
