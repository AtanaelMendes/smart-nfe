/**
 * SmartNFe — Integration Test Suite: Fluxo C (Divisão de Notas com Conservação de Saldos e Decimais)
 *
 * Requisito: R1 & R4 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Verificações cobertas:
 * 1. Divisão precisa com conservação de 4 casas decimais sem arredondamento prematuro.
 * 2. Ação de distribuição equilibrada (divisão em partes iguais com conservação do último decimal).
 * 3. Ação de distribuição de saldo restante para uma nota específica.
 * 4. Bloqueio rigoroso de alocação excessiva (quantidade alocada > quantidade original).
 * 5. Bloqueio de finalização de divisão quando existem saldos remanescentes pendentes de alocação.
 * 6. Suporte dinâmico à adição e remoção de notas de destino com recálculo automático.
 * 7. Rateio proporcional e conservação integral de despesas acessórias (frete, seguro, despesas).
 *
 * Execução: node --no-warnings --test tests/integration/flow_c_division_balances.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateRemainingBalance,
  validateDivisionBatch,
} from '../../app/lib/calculations/divisionMath.js';
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  decimalCompare,
  roundDecimal,
} from '../../app/lib/calculations/decimal.js';
import { calculateInvoiceTotals } from '../../app/lib/calculations/invoiceTotals.js';

/**
 * Fixture de produtos para divisão.
 */
function createDivisionItemsFixture() {
  return [
    {
      id: 'item-01',
      item: 1,
      codigo: 'EXP-CAF-001',
      descricao: 'Café em Grão Cru Arábica',
      quantidade: '500.0000',
      valorUnitario: '25.5000',
      valorTotal: '12750.00',
    },
    {
      id: 'item-02',
      item: 2,
      codigo: 'EXP-MOT-8408',
      descricao: 'Motores Diesel 120HP',
      quantidade: '10.0000',
      valorUnitario: '15400.0000',
      valorTotal: '154000.00',
    },
    {
      id: 'item-03',
      item: 3,
      codigo: 'EXP-VAL-003',
      descricao: 'Válvula de Escape Motor',
      quantidade: '333.3333', // Quantidade ímpar com 4 casas decimais
      valorUnitario: '12.5000',
      valorTotal: '4166.67',
    },
  ];
}

/**
 * Função utilitária de rateio equilibrado em N notas.
 * Distribui quantidade em partes iguais com atribuição da sobra ao último lote para garantir conservação exata.
 */
function distributeEqually(quantityStr, numNotes, scale = 4) {
  const qStr = String(quantityStr).trim();
  const n = parseInt(numNotes, 10);
  if (n <= 0) return [];
  if (n === 1) return [qStr];

  // Base dividida arredondando para baixo na escala
  const baseQty = decimalDivide(qStr, String(n), scale);
  const result = [];
  let allocatedSum = '0.' + '0'.repeat(scale);

  for (let i = 0; i < n - 1; i++) {
    result.push(baseQty);
    allocatedSum = decimalAdd(allocatedSum, baseQty, scale);
  }

  // A última nota recebe o saldo exato (quantidade original - soma das anteriores)
  const lastQty = decimalSubtract(qStr, allocatedSum, scale);
  result.push(lastQty);

  return result;
}

/**
 * Rateio de despesas acessórias proporcionais ao valor de produtos alocado.
 */
function apportionExpenses(originalExpenseStr, noteProductTotalStr, originalProductTotalStr) {
  if (decimalCompare(originalProductTotalStr, '0') <= 0) return '0.00';
  const ratio = decimalDivide(noteProductTotalStr, originalProductTotalStr, 8);
  return decimalMultiply(originalExpenseStr, ratio, 2);
}

describe('Fluxo C — Divisão com Conservação de 4 Casas Decimais (R1, R4)', () => {
  it('Distribui quantidades com até 4 casas decimais sem arredondamento prematuro para 2 casas', () => {
    const originalQty = '333.3333';
    const note1Alloc = '200.1234';
    const note2Alloc = '133.2099';

    // 200.1234 + 133.2099 = 333.3333
    const { balanceStr, status, isOk, totalAllocatedStr } = calculateRemainingBalance(originalQty, [
      note1Alloc,
      note2Alloc,
    ]);

    assert.strictEqual(status, 'ok');
    assert.strictEqual(isOk, true);
    assert.strictEqual(totalAllocatedStr, '333.3333');
    assert.strictEqual(balanceStr, '0.0000');
  });

  it('Calcula e conserva multiplicação de preço unitário e quantidade de 4 casas na nota de destino', () => {
    const qty = '125.4321';
    const unitPrice = '18.7500';
    // 125.4321 * 18.7500 = 2351.851875 -> 2351.85
    const lineTotal = decimalMultiply(unitPrice, qty, 2);
    assert.strictEqual(lineTotal, '2351.85');
  });
});

describe('Fluxo C — Ações de Distribuição Equilibrada e Saldo Restante (R4)', () => {
  it('Distribui saldo restante integral para uma nota específica zerando a pendência', () => {
    const originalQty = '500.0000';
    const note1Alloc = '315.5000';

    // Calcula saldo que restou
    const initialCheck = calculateRemainingBalance(originalQty, [note1Alloc]);
    assert.strictEqual(initialCheck.status, 'remaining');
    assert.strictEqual(initialCheck.balanceStr, '184.5000');
    assert.strictEqual(initialCheck.hasRemaining, true);

    // Ação "Distribuir saldo restante para Nota 2"
    const note2Alloc = initialCheck.balanceStr;
    const finalCheck = calculateRemainingBalance(originalQty, [note1Alloc, note2Alloc]);

    assert.strictEqual(finalCheck.status, 'ok');
    assert.strictEqual(finalCheck.isOk, true);
    assert.strictEqual(finalCheck.balanceStr, '0.0000');
  });

  it('Distribui em partes iguais conservando 100% da quantidade total em dízimas periódicas', () => {
    const originalQty = '100.0000';
    const numNotes = 3;

    const allocations = distributeEqually(originalQty, numNotes, 4);
    assert.strictEqual(allocations.length, 3);
    assert.strictEqual(allocations[0], '33.3333');
    assert.strictEqual(allocations[1], '33.3333');
    assert.strictEqual(allocations[2], '33.3334'); // Compensação de 0.0001 no último lote

    const balance = calculateRemainingBalance(originalQty, allocations);
    assert.strictEqual(balance.status, 'ok');
    assert.strictEqual(balance.totalAllocatedStr, '100.0000');
    assert.strictEqual(balance.balanceStr, '0.0000');
  });
});

describe('Fluxo C — Bloqueio de Alocação Excessiva e Inconsistências (R1, R4)', () => {
  it('Identifica e bloqueia rigorosamente alocação superior à quantidade original (status: excess)', () => {
    const originalQty = '10.0000';
    const note1Alloc = '6.0000';
    const note2Alloc = '5.0000'; // Total: 11.0000 > 10.0000

    const balance = calculateRemainingBalance(originalQty, [note1Alloc, note2Alloc]);
    assert.strictEqual(balance.status, 'excess');
    assert.strictEqual(balance.hasExcess, true);
    assert.strictEqual(balance.isOk, false);
    assert.strictEqual(balance.balanceStr, '-1.0000');
  });

  it('validateDivisionBatch sinaliza canSave: false quando há itens com excesso', () => {
    const originalItems = createDivisionItemsFixture();
    const destinationNotes = [
      {
        id: 'nota-dest-1',
        numero: 'DEST-01',
        itens: [
          { id: 'item-01', quantidade: '300.0000' },
          { id: 'item-02', quantidade: '8.0000' },
        ],
      },
      {
        id: 'nota-dest-2',
        numero: 'DEST-02',
        itens: [
          { id: 'item-01', quantidade: '200.0000' }, // Total item-01: 500 (ok)
          { id: 'item-02', quantidade: '4.0000' },   // Total item-02: 12 > 10 (EXCESSO!)
        ],
      },
    ];

    const report = validateDivisionBatch(originalItems, destinationNotes);
    assert.strictEqual(report.hasExcess, true, 'Deve apontar existência de excesso');
    assert.strictEqual(report.canSave, false, 'Deve bloquear salvamento/finalização');
    assert.strictEqual(report.isValid, false, 'Lote deve ser marcado como inválido');
    assert.strictEqual(report.summary.excessCount, 1);
  });
});

describe('Fluxo C — Bloqueio de Finalização com Saldos Pendentes (R4)', () => {
  it('Detecta saldos remanescentes não alocados e indica que o lote não está totalmente balanceado', () => {
    const originalItems = createDivisionItemsFixture();
    const destinationNotes = [
      {
        id: 'nota-dest-1',
        numero: 'DEST-01',
        itens: [
          { id: 'item-01', quantidade: '250.0000' }, // Restam 250
          { id: 'item-02', quantidade: '10.0000' },  // Balanceado
          { id: 'item-03', quantidade: '333.3333' }, // Balanceado
        ],
      },
    ];

    const report = validateDivisionBatch(originalItems, destinationNotes);
    assert.strictEqual(report.hasRemaining, true, 'Deve acusar saldos remanescentes pendentes');
    assert.strictEqual(report.isBalanced, false, 'Lote não está 100% balanceado');
    assert.strictEqual(report.summary.remainingCount, 1);
  });

  it('Confirma liberação e balanceamento completo quando 100% dos itens são alocados perfeitamente', () => {
    const originalItems = createDivisionItemsFixture();
    const destinationNotes = [
      {
        id: 'nota-dest-1',
        numero: 'DEST-01',
        itens: [
          { id: 'item-01', quantidade: '250.0000' },
          { id: 'item-02', quantidade: '5.0000' },
          { id: 'item-03', quantidade: '133.3333' },
        ],
      },
      {
        id: 'nota-dest-2',
        numero: 'DEST-02',
        itens: [
          { id: 'item-01', quantidade: '250.0000' },
          { id: 'item-02', quantidade: '5.0000' },
          { id: 'item-03', quantidade: '200.0000' },
        ],
      },
    ];

    const report = validateDivisionBatch(originalItems, destinationNotes);
    assert.strictEqual(report.hasExcess, false);
    assert.strictEqual(report.hasRemaining, false);
    assert.strictEqual(report.isBalanced, true, 'Todos os itens devem estar balanceados');
    assert.strictEqual(report.summary.balancedCount, 3);
  });
});

describe('Fluxo C — Adição e Remoção Dinâmica de Notas e Rateio de Despesas (R1, R4)', () => {
  it('Recalcula balanço global ao adicionar uma 3ª nota de destino', () => {
    const originalItems = [
      { id: 'item-01', quantidade: '300.0000', valorUnitario: '10.0000' },
    ];

    // Começa com 2 notas (alocadas 100 + 100 = 200, restam 100)
    let notes = [
      { id: 'nota-1', itens: [{ id: 'item-01', quantidade: '100.0000' }] },
      { id: 'nota-2', itens: [{ id: 'item-01', quantidade: '100.0000' }] },
    ];
    let rep = validateDivisionBatch(originalItems, notes);
    assert.strictEqual(rep.hasRemaining, true);

    // Usuário clica em "+ Adicionar Nota de Destino" e aloca os 100 restantes na Nota 3
    notes.push({ id: 'nota-3', itens: [{ id: 'item-01', quantidade: '100.0000' }] });
    rep = validateDivisionBatch(originalItems, notes);

    assert.strictEqual(rep.isBalanced, true);
    assert.strictEqual(rep.summary.destinationNotesCount, 3);
  });

  it('Recalcula balanço global ao remover uma nota de destino liberando o saldo', () => {
    const originalItems = [
      { id: 'item-01', quantidade: '300.0000', valorUnitario: '10.0000' },
    ];
    let notes = [
      { id: 'nota-1', itens: [{ id: 'item-01', quantidade: '150.0000' }] },
      { id: 'nota-2', itens: [{ id: 'item-01', quantidade: '150.0000' }] },
    ];
    assert.strictEqual(validateDivisionBatch(originalItems, notes).isBalanced, true);

    // Remove nota 2
    notes = [notes[0]];
    const rep = validateDivisionBatch(originalItems, notes);

    assert.strictEqual(rep.isBalanced, false);
    assert.strictEqual(rep.hasRemaining, true);
    assert.strictEqual(rep.itemReports[0].balanceStr, '150.0000');
  });

  it('Rateia despesas acessórias (frete de 5.000,00) proporcionalmente entre notas preservando total', () => {
    const totalFrete = '5000.00';
    const totalProducts = '100000.00';

    const note1Products = '60000.00'; // 60%
    const note2Products = '40000.00'; // 40%

    const note1Frete = apportionExpenses(totalFrete, note1Products, totalProducts);
    const note2Frete = apportionExpenses(totalFrete, note2Products, totalProducts);

    assert.strictEqual(note1Frete, '3000.00');
    assert.strictEqual(note2Frete, '2000.00');

    // A soma dos fretes rateados DEVE ser estritamente igual ao frete original
    const sumFrete = decimalAdd(note1Frete, note2Frete, 2);
    assert.strictEqual(sumFrete, totalFrete);
  });
});
