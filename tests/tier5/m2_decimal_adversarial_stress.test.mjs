/**
 * SmartNFe — Tier 5 Adversarial Hardening Suite: Milestone 2 Decimal Engine
 *
 * Testes empíricos adversariais executados pelo Challenger para comprovar a
 * robustez matemática, eliminação de vazamento de ponto flutuante binário (IEEE 754),
 * conformidade estrita com ABNT NBR 5891 (Half-Up), tolerância a valores extremos
 * e integridade de distribuição em lotes com até 10 notas fiscais de destino.
 *
 * Execução: node --no-warnings --test tests/tier5/m2_decimal_adversarial_stress.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT_DIR = process.cwd();

// Carregamento dinâmico dos módulos de cálculo
const decimalPath = resolve(ROOT_DIR, 'app/lib/calculations/decimal.js');
const totalsPath = resolve(ROOT_DIR, 'app/lib/calculations/invoiceTotals.js');
const divisionPath = resolve(ROOT_DIR, 'app/lib/calculations/divisionMath.js');
const mockPath = resolve(ROOT_DIR, 'app/lib/data/mockInvoices.js');

const {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  roundDecimal,
  decimalCompare,
  isDecimalZero,
  isDecimalNegative,
  decimalAbs,
  normalizeDecimal,
  cleanDecimalString,
  parseDecimal,
  formatBigInt,
} = await import(pathToFileURL(decimalPath).href);

const {
  calculateItemTotal,
  calculateInvoiceTotals,
} = await import(pathToFileURL(totalsPath).href);

const {
  calculateRemainingBalance,
  validateDivisionBatch,
} = await import(pathToFileURL(divisionPath).href);

const {
  getMockInvoiceById,
} = await import(pathToFileURL(mockPath).href);

// ============================================================================
// SUITE 1: Floating Point Killer Inputs (Zero Float Leakage)
// ============================================================================
describe('Adversarial Challenger: Floating Point Killer Inputs', () => {
  it('Desafio 0.1 + 0.2: Imune a 0.30000000000000004 em múltiplas escalas', () => {
    // Escala natural preservada
    const resNatural = decimalAdd('0.1', '0.2');
    assert.strictEqual(resNatural, '0.3', '0.1 + 0.2 deve ser exatamente 0.3');

    // Escala 2 (monetária padrão)
    const resScale2 = decimalAdd('0.1', '0.2', 2);
    assert.strictEqual(resScale2, '0.30');

    // Escala 4 (quantidades fiscais)
    const resScale4 = decimalAdd('0.1', '0.2', 4);
    assert.strictEqual(resScale4, '0.3000');

    // Escala 8
    const resScale8 = decimalAdd('0.1', '0.2', 8);
    assert.strictEqual(resScale8, '0.30000000');

    // Subtração inversa: 0.3 - 0.2 deve ser 0.1 (não 0.09999999999999998)
    const resSub = decimalSubtract('0.3', '0.2');
    assert.strictEqual(resSub, '0.1');

    // 0.7 + 0.1 deve ser 0.8 (não 0.7999999999999999)
    assert.strictEqual(decimalAdd('0.7', '0.1'), '0.8');

    // 0.15 + 0.15 deve ser 0.30
    assert.strictEqual(decimalAdd('0.15', '0.15', 2), '0.30');
  });

  it('Desafio 0.0001 * 0.0001: Subtração e multiplicação sob precisão fina', () => {
    // Escala natural (4 + 4 = 8 casas)
    const resNatural = decimalMultiply('0.0001', '0.0001');
    assert.strictEqual(resNatural, '0.00000001');

    // Escala 8 explícita
    const resScale8 = decimalMultiply('0.0001', '0.0001', 8);
    assert.strictEqual(resScale8, '0.00000001');

    // Escala 4 (trunca com Half-Up para zero)
    const resScale4 = decimalMultiply('0.0001', '0.0001', 4);
    assert.strictEqual(resScale4, '0.0000');

    // Escala 2
    const resScale2 = decimalMultiply('0.0001', '0.0001', 2);
    assert.strictEqual(resScale2, '0.00');

    // Escala 12 (com preenchimento de zeros à direita)
    const resScale12 = decimalMultiply('0.0001', '0.0001', 12);
    assert.strictEqual(resScale12, '0.000000010000');
  });

  it('Desafio 0.001 * 333.3333: Produto decimal periódico', () => {
    // 0.001 * 333.3333 = 0.3333333 (escala 3 + 4 = 7)
    const resNatural = decimalMultiply('0.001', '333.3333');
    assert.strictEqual(resNatural, '0.3333333');

    // Escalas fiscais
    assert.strictEqual(decimalMultiply('0.001', '333.3333', 2), '0.33');
    assert.strictEqual(decimalMultiply('0.001', '333.3333', 4), '0.3333');
    assert.strictEqual(decimalMultiply('0.001', '333.3333', 8), '0.33333330');
    assert.strictEqual(decimalMultiply('0.001', '333.3333', 12), '0.333333300000');
  });

  it('Desafio 1 / 3 e 2 / 3 sob escalas arbitrárias (2, 4, 8, 12)', () => {
    // 1 / 3
    assert.strictEqual(decimalDivide('1', '3', 2), '0.33');
    assert.strictEqual(decimalDivide('1', '3', 4), '0.3333');
    assert.strictEqual(decimalDivide('1', '3', 8), '0.33333333');
    assert.strictEqual(decimalDivide('1', '3', 12), '0.333333333333');

    // 2 / 3 (arredonda Half-Up no último dígito)
    assert.strictEqual(decimalDivide('2', '3', 2), '0.67');
    assert.strictEqual(decimalDivide('2', '3', 4), '0.6667');
    assert.strictEqual(decimalDivide('2', '3', 8), '0.66666667');
    assert.strictEqual(decimalDivide('2', '3', 12), '0.666666666667');
  });

  it('Divisão por zero não lança exceção e retorna zeros formatados na escala', () => {
    assert.strictEqual(decimalDivide('100.00', '0', 2), '0.00');
    assert.strictEqual(decimalDivide('100.00', '0.0000', 4), '0.0000');
    assert.strictEqual(decimalDivide('100.00', '0', 8), '0.00000000');
    assert.strictEqual(decimalDivide('0', '0', 2), '0.00');
  });
});

// ============================================================================
// SUITE 2: Extreme Values, Precision & Boundary Inputs
// ============================================================================
describe('Adversarial Challenger: Extreme Values & Boundary Inputs', () => {
  it('Lida com quantidades e preços nulos ou zero em calculateItemTotal', () => {
    assert.strictEqual(calculateItemTotal('150.00', '0'), '0.00');
    assert.strictEqual(calculateItemTotal('0', '25.0000'), '0.00');
    assert.strictEqual(calculateItemTotal('0', '0'), '0.00');
    assert.strictEqual(calculateItemTotal(null, '10'), '0.00');
    assert.strictEqual(calculateItemTotal('10', undefined), '0.00');
    assert.strictEqual(calculateItemTotal(null, null), '0.00');
    assert.strictEqual(calculateItemTotal('', ''), '0.00');
    assert.strictEqual(calculateItemTotal('invalid', 'NaN'), '0.00');
  });

  it('Manipula strings de altíssima precisão (20 casas decimais) sem perda de dígitos', () => {
    const a = '0.12345678901234567890';
    const b = '0.98765432109876543210';
    const sum = decimalAdd(a, b);
    assert.strictEqual(sum, '1.11111111011111111100');

    const sub = decimalSubtract('1.00000000000000000000', '0.00000000000000000001');
    assert.strictEqual(sub, '0.99999999999999999999');

    const prod = decimalMultiply('0.0000000001', '0.0000000001');
    assert.strictEqual(prod, '0.00000000000000000001');
  });

  it('Opera sobre números gigantes (bilhões e trilhões) além de MAX_SAFE_INTEGER', () => {
    // 1 trilhão * 1000
    const trilhao = '1000000000000.00';
    const itemTotal = calculateItemTotal(trilhao, '1000.0000');
    assert.strictEqual(itemTotal, '1000000000000000.00');

    // 999.999.999.999,99 + 1 centavo
    const quaserTrilhao = '999999999999.99';
    const soma = decimalAdd(quaserTrilhao, '0.01', 2);
    assert.strictEqual(soma, '1000000000000.00');
  });

  it('Limpeza resiliente de strings pt-BR, moedas e caracteres inválidos', () => {
    assert.strictEqual(cleanDecimalString('R$ 1.234.567,89'), '1234567.89');
    assert.strictEqual(cleanDecimalString('-R$ 1.250,50'), '-1250.50');
    assert.strictEqual(cleanDecimalString('R$ -1.250,50'), '-1250.50');
    assert.strictEqual(cleanDecimalString('  1,234.56  '), '1234.56');
    assert.strictEqual(cleanDecimalString('.5'), '.5');
    assert.strictEqual(cleanDecimalString('-.5'), '-.5');
    assert.strictEqual(cleanDecimalString(null), '0');
    assert.strictEqual(cleanDecimalString(undefined), '0');
    assert.strictEqual(cleanDecimalString(''), '0');
    assert.strictEqual(cleanDecimalString('abc'), '0');
  });

  it('Comparações exatas e detecção de zero/negativo', () => {
    assert.strictEqual(decimalCompare('0', '-0'), 0);
    assert.strictEqual(decimalCompare('0.00', '0.0000'), 0);
    assert.strictEqual(decimalCompare('100.5', '100.5000'), 0);
    assert.strictEqual(decimalCompare('-50.00', '-50.01'), 1);
    assert.strictEqual(decimalCompare('-50.01', '-50.00'), -1);

    assert.strictEqual(isDecimalZero('0.0000'), true);
    assert.strictEqual(isDecimalZero('-0.00'), true);
    assert.strictEqual(isDecimalZero('0.0001'), false);

    assert.strictEqual(isDecimalNegative('-0.00'), false);
    assert.strictEqual(isDecimalNegative('-0.0001'), true);
    assert.strictEqual(isDecimalNegative('0.00'), false);

    assert.strictEqual(decimalAbs('-123.45'), '123.45');
    assert.strictEqual(decimalAbs('123.45'), '123.45');
  });
});

// ============================================================================
// SUITE 3: ABNT NBR 5891 Half-Up Rounding Formal Compliance
// ============================================================================
describe('Adversarial Challenger: ABNT NBR 5891 Half-Up Rounding', () => {
  it('Exato meio (.5) arredonda para cima em todos os dígitos de 0 a 9', () => {
    // 0.005 -> 0.01, 0.015 -> 0.02, ..., 0.095 -> 0.10
    const cases = [
      ['0.005', '0.01'],
      ['0.015', '0.02'],
      ['0.025', '0.03'],
      ['0.035', '0.04'],
      ['0.045', '0.05'],
      ['0.055', '0.06'],
      ['0.065', '0.07'],
      ['0.075', '0.08'],
      ['0.085', '0.09'],
      ['0.095', '0.10'],
      ['1.005', '1.01'],
      ['2.5', '3'],       // escala 0
      ['10.555', '10.56'], // escala 2
    ];

    for (const [input, expected] of cases) {
      const scale = expected.includes('.') ? expected.split('.')[1].length : 0;
      assert.strictEqual(
        roundDecimal(input, scale),
        expected,
        `roundDecimal(${input}, ${scale}) deve ser ${expected}`
      );
    }
  });

  it('Limite logo abaixo do meio (.499999) arredonda estritamente para baixo', () => {
    assert.strictEqual(roundDecimal('0.00499999', 2), '0.00');
    assert.strictEqual(roundDecimal('0.01499999', 2), '0.01');
    assert.strictEqual(roundDecimal('1.234999999', 2), '1.23');
    assert.strictEqual(roundDecimal('9.994999', 2), '9.99');
    assert.strictEqual(roundDecimal('99.994999', 2), '99.99');
  });

  it('Limite logo acima do meio (.500001) arredonda estritamente para cima', () => {
    assert.strictEqual(roundDecimal('0.00500001', 2), '0.01');
    assert.strictEqual(roundDecimal('0.01500001', 2), '0.02');
    assert.strictEqual(roundDecimal('1.235000001', 2), '1.24');
    assert.strictEqual(roundDecimal('9.99500001', 2), '10.00');
  });

  it('Números negativos seguem arredondamento simétrico afastando de zero (Half-Up formal)', () => {
    assert.strictEqual(roundDecimal('-0.005', 2), '-0.01');
    assert.strictEqual(roundDecimal('-0.015', 2), '-0.02');
    assert.strictEqual(roundDecimal('-1.005', 2), '-1.01');
    assert.strictEqual(roundDecimal('-2.5', 0), '-3');

    // Abaixo do meio em módulo arredonda em direção ao zero
    assert.strictEqual(roundDecimal('-0.004999', 2), '0.00'); // Nunca "-0.00"
    assert.strictEqual(roundDecimal('-1.234999', 2), '-1.23');

    // Acima do meio em módulo arredonda afastando do zero
    assert.strictEqual(roundDecimal('-0.005001', 2), '-0.01');
    assert.strictEqual(roundDecimal('-1.235001', 2), '-1.24');
  });

  it('Propagação em cascata de noves (9s rollover) sob Half-Up', () => {
    assert.strictEqual(roundDecimal('0.999', 2), '1.00');
    assert.strictEqual(roundDecimal('9.999', 2), '10.00');
    assert.strictEqual(roundDecimal('99.995', 2), '100.00');
    assert.strictEqual(roundDecimal('999999999.995', 2), '1000000000.00');
  });
});

// ============================================================================
// SUITE 4: Multi-Item Invoice Totals Aggregation & Recalculation
// ============================================================================
describe('Adversarial Challenger: Multi-Item Invoice Totals Recalculation', () => {
  it('Calcula nota fiscal com 100 itens garantindo vProd = soma dos itens sem erro acumulado', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      item: i + 1,
      valorUnitario: '10.05',
      quantidade: '1.0000',
    }));

    const result = calculateInvoiceTotals(items, '5.00', '10.00', '2.50', '1.00');

    // 100 * 10.05 = 1005.00
    assert.strictEqual(result.totalProducts, '1005.00');
    assert.strictEqual(result.valorProdutos, '1005.00');

    // Total NF = 1005.00 - 5.00 + 10.00 + 2.50 + 1.00 = 1013.50
    assert.strictEqual(result.totalInvoice, '1013.50');
    assert.strictEqual(result.valorTotalNota, '1013.50');
    assert.strictEqual(result.totalDiscount, '5.00');
    assert.strictEqual(result.totalFreight, '10.00');
    assert.strictEqual(result.totalInsurance, '2.50');
    assert.strictEqual(result.totalOtherExpenses, '1.00');
  });

  it('Suporta assinatura posicional e via objeto de opções com aliases pt-BR e en-US', () => {
    const items = [
      { valorUnitario: '50.00', quantidade: '2' }, // 100.00
    ];

    // Posicional
    const pos = calculateInvoiceTotals(items, '10.00', '15.00', '5.00', '2.00');
    assert.strictEqual(pos.totalInvoice, '112.00');

    // Objeto en-US
    const objEn = calculateInvoiceTotals(items, {
      discount: '10.00',
      freight: '15.00',
      insurance: '5.00',
      otherExpenses: '2.00',
    });
    assert.strictEqual(objEn.totalInvoice, '112.00');

    // Objeto pt-BR
    const objBr = calculateInvoiceTotals(items, {
      valorDesconto: '10.00',
      valorFrete: '15.00',
      valorSeguro: '5.00',
      outrasDespesas: '2.00',
    });
    assert.strictEqual(objBr.totalInvoice, '112.00');
  });

  it('Resistência a arrays vazios, nulos e itens malformados em calculateInvoiceTotals', () => {
    assert.strictEqual(calculateInvoiceTotals(null).totalInvoice, '0.00');
    assert.strictEqual(calculateInvoiceTotals([]).totalInvoice, '0.00');
    assert.strictEqual(calculateInvoiceTotals([null, undefined, {}]).totalInvoice, '0.00');

    const mixedItems = [
      { unitPrice: '20.00', quantity: '1' }, // 20.00
      { total: '30.00' },                     // 30.00
      { valorTotal: '50.00' },                // 50.00
      null,
      {},
    ];
    const res = calculateInvoiceTotals(mixedItems);
    assert.strictEqual(res.totalProducts, '100.00');
    assert.strictEqual(res.totalInvoice, '100.00');
  });

  it('Cenários extremos: descontos negativos e descontos superiores ao valor dos produtos', () => {
    const items = [{ valorUnitario: '100.00', quantidade: '1' }];

    // Desconto negativo (-20.00): Produtos (100) - Desconto (-20) = 120.00
    const resNeg = calculateInvoiceTotals(items, '-20.00');
    assert.strictEqual(resNeg.totalDiscount, '-20.00');
    assert.strictEqual(resNeg.totalInvoice, '120.00');

    // Desconto superior (150.00): Produtos (100) - Desconto (150) = -50.00
    const resExcess = calculateInvoiceTotals(items, '150.00');
    assert.strictEqual(resExcess.totalDiscount, '150.00');
    assert.strictEqual(resExcess.totalInvoice, '-50.00');
  });
});

// ============================================================================
// SUITE 5: Batch Division & Balance Integrity (Up to 10 Destination Notes)
// ============================================================================
describe('Adversarial Challenger: Batch Division & Balance Integrity', () => {
  it('Distribuição balanceada exata entre 10 notas fiscais de destino', () => {
    const origQty = '100.0000';
    // 10 notas com 10.0000 cada
    const alloc10 = Array.from({ length: 10 }, () => '10.0000');

    const res = calculateRemainingBalance(origQty, alloc10);
    assert.strictEqual(res.balanceStr, '0.0000');
    assert.strictEqual(res.status, 'ok');
    assert.strictEqual(res.totalAllocatedStr, '100.0000');
    assert.strictEqual(res.isOk, true);
    assert.strictEqual(res.hasRemaining, false);
    assert.strictEqual(res.hasExcess, false);
  });

  it('Distribuição parcial entre 10 notas com sobras remanescentes (1 / 10 periódica)', () => {
    const origQty = '100.0000';
    // 9 notas com 10.0000 e 1 nota com 9.9999
    const alloc10 = Array.from({ length: 10 }, (_, i) => (i < 9 ? '10.0000' : '9.9999'));

    const res = calculateRemainingBalance(origQty, alloc10);
    assert.strictEqual(res.balanceStr, '0.0001');
    assert.strictEqual(res.status, 'remaining');
    assert.strictEqual(res.totalAllocatedStr, '99.9999');
    assert.strictEqual(res.isOk, false);
    assert.strictEqual(res.hasRemaining, true);
    assert.strictEqual(res.hasExcess, false);
  });

  it('Distribuição com excesso entre 10 notas bloqueia salvamento', () => {
    const origQty = '100.0000';
    // 10 notas com 10.0001 cada (excesso total = 0.0010)
    const alloc10 = Array.from({ length: 10 }, () => '10.0001');

    const res = calculateRemainingBalance(origQty, alloc10);
    assert.strictEqual(res.balanceStr, '-0.0010');
    assert.strictEqual(res.status, 'excess');
    assert.strictEqual(res.totalAllocatedStr, '100.0010');
    assert.strictEqual(res.isOk, false);
    assert.strictEqual(res.hasRemaining, false);
    assert.strictEqual(res.hasExcess, true);
  });

  it('10 notas com alocações zero em notas intermediárias e saldo correto', () => {
    const origQty = '50.0000';
    // 8 notas com 0.0000 e 2 notas com 25.0000
    const alloc10 = [
      '0.0000', '25.0000', '0.0000', '0.0000',
      '25.0000', '0.0000', '0.0000', '0.0000', '0.0000', '0.0000'
    ];

    const res = calculateRemainingBalance(origQty, alloc10);
    assert.strictEqual(res.balanceStr, '0.0000');
    assert.strictEqual(res.status, 'ok');
    assert.strictEqual(res.isOk, true);
  });

  it('Lote completo com 10 notas de destino e múltiplos itens via validateDivisionBatch', () => {
    const originalItems = [
      { id: 'i-1', item: 1, codigo: 'P1', descricao: 'Produto 1', quantidade: '100.0000', valorUnitario: '50.00' },
      { id: 'i-2', item: 2, codigo: 'P2', descricao: 'Produto 2', quantidade: '50.0000', valorUnitario: '200.00' },
      { id: 'i-3', item: 3, codigo: 'P3', descricao: 'Produto 3', quantidade: '25.0000', valorUnitario: '100.00' },
    ];

    // 10 notas de destino
    const destNotes10 = Array.from({ length: 10 }, (_, idx) => ({
      id: `dest-${idx + 1}`,
      numero: `DEST-${String(idx + 1).padStart(2, '0')}`,
      itens: [
        { id: 'i-1', quantidade: '10.0000' },  // 10 * 10 = 100 (balanceado)
        { id: 'i-2', quantidade: '5.0000' },   // 10 * 5 = 50 (balanceado)
        { id: 'i-3', quantidade: '2.5000' },   // 10 * 2.5 = 25 (balanceado)
      ],
    }));

    const result = validateDivisionBatch(originalItems, destNotes10);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.canSave, true);
    assert.strictEqual(result.hasExcess, false);
    assert.strictEqual(result.hasRemaining, false);
    assert.strictEqual(result.isBalanced, true);

    assert.strictEqual(result.summary.totalItemsCount, 3);
    assert.strictEqual(result.summary.destinationNotesCount, 10);
    assert.strictEqual(result.summary.balancedCount, 3);
    assert.strictEqual(result.summary.remainingCount, 0);
    assert.strictEqual(result.summary.excessCount, 0);

    assert.strictEqual(result.notesSummary.length, 10);

    // Cada nota deve ter:
    // P1: 10 * 50 = 500.00
    // P2: 5 * 200 = 1000.00
    // P3: 2.5 * 100 = 250.00
    // Total por nota = 1750.00, Quantidade por nota = 17.5000
    for (const noteSum of result.notesSummary) {
      assert.strictEqual(noteSum.allocatedItemsCount, 3);
      assert.strictEqual(noteSum.totalQuantity, '17.5000');
      assert.strictEqual(noteSum.totalProducts, '1750.00');
    }
  });

  it('Divisão de demo-05 (15 itens) em 10 notas de destino em tempo real', () => {
    const d5 = getMockInvoiceById('demo-05');
    assert.ok(d5, 'demo-05 deve existir');
    assert.strictEqual(d5.itens.length, 15, 'demo-05 deve ter 15 itens');

    // Divide cada item em 10 fatias exatas
    const destNotes10 = Array.from({ length: 10 }, (_, nIdx) => ({
      id: `dest-d5-${nIdx + 1}`,
      numero: `DEST-${String(nIdx + 1).padStart(2, '0')}`,
      itens: d5.itens.map((item) => {
        // Divide quantidade por 10 via decimalDivide para escala 4
        const slice = decimalDivide(item.quantidade, '10', 4);
        return { id: item.id, quantidade: slice };
      }),
    }));

    const res = validateDivisionBatch(d5.itens, destNotes10);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.isBalanced, true);
    assert.strictEqual(res.canSave, true);
    assert.strictEqual(res.summary.totalItemsCount, 15);
    assert.strictEqual(res.summary.destinationNotesCount, 10);
    assert.strictEqual(res.summary.balancedCount, 15);
  });
});
