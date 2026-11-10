/**
 * SmartNFe — Tier 5 Adversarial Challenge Suite: Milestone 4 Ancillary Expense Apportionment & Multi-Note Stress
 *
 * Challenger: teamwork_challenger_m4_divisao_2
 * Target: Milestone 4 (M4_Invoice_Splitting_Balance_Conservation)
 * Requirements: R1, R4 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Empirical verification of:
 * 1. Exact cent balance conservation across 2, 3, 5 destination notes without IEEE-754 drift.
 *    - Asserts sum(frete_i) === parentFrete
 *    - Asserts sum(seguro_i) === parentSeguro
 *    - Asserts sum(outrasDespesas_i) === parentOutrasDespesas
 *    - Asserts sum(desconto_i) === parentDesconto
 *    - Asserts sum(totalNota_i) === parentTotalNota (when line totals conserve product total)
 * 2. Asymmetric allocations (e.g. 99%/1%, 80%/15%/5%, 50%/25%/15%/7%/3%) and zero-product destination notes.
 * 3. Dynamic multi-note management (addition, removal, and minimum 2 notes constraint).
 * 4. Boundary traps: negative allocations, zero-sum tricks (+excess/-neg), partial allocations.
 * 5. 100-cycle randomized Monte Carlo stress test on apportionAllInvoiceExpenses.
 * 6. Prepared invoice persistence and full schema conformance in preparedInvoiceRepository.
 *
 * Execution: node --no-warnings --test tests/tier5/m4_challenger_expenses_persistence_adversarial.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Motores de cálculo e divisão
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
  roundDecimal,
  decimalCompare,
  isDecimalZero,
  isDecimalNegative,
  cleanDecimalString,
} from '../../app/lib/calculations/decimal.js';

import { calculateInvoiceTotals } from '../../app/lib/calculations/invoiceTotals.js';

// Repositórios e armazenamento
import {
  localStorageService,
  STORAGE_KEYS,
  setCustomStorage,
} from '../../app/lib/storage/localStorageService.js';
import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { preparedInvoiceRepository } from '../../app/features/preparedInvoiceRepository.js';

// Parsing XML para documento real de exportação
import { parseNFeXml } from '../../app/features/xml/nfeXmlParser.js';
import { mapXmlToInvoice } from '../../app/features/xml/xmlToInvoiceMapper.js';

const FIXTURES_DIR = resolve(process.cwd(), 'tests/fixtures');

// ============================================================================
// SUITE 1: Ancillary Expense Apportionment & Exact Cent Balance Conservation
// ============================================================================
describe('CHALLENGER 2 SUITE 1: Ancillary Expense Apportionment across 2, 3, 5 Notes', () => {

  it('1.1: Divisão em 2 notas com alocação assimétrica extrema (99% e 1%) preserva 100% das despesas e total', () => {
    const parentTotals = {
      valorProdutos: '100000.00',
      valorFrete: '4500.55',
      valorSeguro: '1250.33',
      outrasDespesas: '375.12',
      valorDesconto: '850.40',
      // TotalNota = 100000.00 - 850.40 + 4500.55 + 1250.33 + 375.12 = 105275.60
      valorTotalNota: '105275.60',
    };

    // Nota 1 recebe 99% (99.000,00) e Nota 2 recebe 1% (1.000,00)
    const destinationNotes = [
      { id: 'note-01', totalProducts: '99000.00' },
      { id: 'note-02', totalProducts: '1000.00' },
    ];

    const result = apportionAllInvoiceExpenses(parentTotals, destinationNotes);

    // Soma das despesas rateadas
    const sumFrete = decimalAdd(result['note-01'].valorFrete, result['note-02'].valorFrete, 2);
    const sumSeguro = decimalAdd(result['note-01'].valorSeguro, result['note-02'].valorSeguro, 2);
    const sumOutras = decimalAdd(result['note-01'].outrasDespesas, result['note-02'].outrasDespesas, 2);
    const sumDesconto = decimalAdd(result['note-01'].valorDesconto, result['note-02'].valorDesconto, 2);

    assert.strictEqual(sumFrete, parentTotals.valorFrete, 'Frete total deve ser conservado exatamente');
    assert.strictEqual(sumSeguro, parentTotals.valorSeguro, 'Seguro total deve ser conservado exatamente');
    assert.strictEqual(sumOutras, parentTotals.outrasDespesas, 'Outras despesas devem ser conservadas exatamente');
    assert.strictEqual(sumDesconto, parentTotals.valorDesconto, 'Desconto total deve ser conservado exatamente');

    // Totais completos recalculados via calculateInvoiceTotals
    const tot1 = calculateInvoiceTotals(
      [{ quantidade: '1', valorUnitario: '99000.00', valorTotal: '99000.00' }],
      {
        freight: result['note-01'].valorFrete,
        insurance: result['note-01'].valorSeguro,
        otherExpenses: result['note-01'].outrasDespesas,
        discount: result['note-01'].valorDesconto,
      }
    );
    const tot2 = calculateInvoiceTotals(
      [{ quantidade: '1', valorUnitario: '1000.00', valorTotal: '1000.00' }],
      {
        freight: result['note-02'].valorFrete,
        insurance: result['note-02'].valorSeguro,
        otherExpenses: result['note-02'].outrasDespesas,
        discount: result['note-02'].valorDesconto,
      }
    );

    const sumTotalNota = decimalAdd(tot1.valorTotalNota, tot2.valorTotalNota, 2);
    assert.strictEqual(
      sumTotalNota,
      parentTotals.valorTotalNota,
      'Total da nota combinado deve ser identicamente igual ao pai sem drift de centavo'
    );
  });

  it('1.2: Divisão em 3 notas com frações periódicas (1/3, 1/3, 1/3) e resíduo absorvido na última nota', () => {
    // Parent com valores com centavos ímpares para forçar dízima de rateio
    const parentTotals = {
      valorProdutos: '30000.00',
      valorFrete: '1000.01',
      valorSeguro: '333.33',
      outrasDespesas: '111.11',
      valorDesconto: '77.77',
      // Total = 30000.00 - 77.77 + 1000.01 + 333.33 + 111.11 = 31366.68
      valorTotalNota: '31366.68',
    };

    // 3 notas com produtos iguais: 10.000,00 cada
    const notes = [
      { id: 'dest-1', totalProducts: '10000.00' },
      { id: 'dest-2', totalProducts: '10000.00' },
      { id: 'dest-3', totalProducts: '10000.00' },
    ];

    const result = apportionAllInvoiceExpenses(parentTotals, notes);

    // Frete 1000.01 / 3 = 333.3366...
    // Note 1: 333.34
    // Note 2: 333.34
    // Note 3 (absorve resíduo): 1000.01 - 333.34 - 333.34 = 333.33
    assert.strictEqual(result['dest-1'].valorFrete, '333.34');
    assert.strictEqual(result['dest-2'].valorFrete, '333.34');
    assert.strictEqual(result['dest-3'].valorFrete, '333.33');

    // Seguro 333.33 / 3 = 111.11
    assert.strictEqual(result['dest-1'].valorSeguro, '111.11');
    assert.strictEqual(result['dest-2'].valorSeguro, '111.11');
    assert.strictEqual(result['dest-3'].valorSeguro, '111.11');

    // Outras 111.11 / 3 = 37.0366...
    // Note 1: 37.04
    // Note 2: 37.04
    // Note 3: 111.11 - 74.08 = 37.03
    assert.strictEqual(result['dest-1'].outrasDespesas, '37.04');
    assert.strictEqual(result['dest-2'].outrasDespesas, '37.04');
    assert.strictEqual(result['dest-3'].outrasDespesas, '37.03');

    // Desconto 77.77 / 3 = 25.9233...
    // Note 1: 25.92
    // Note 2: 25.92
    // Note 3: 77.77 - 51.84 = 25.93
    assert.strictEqual(result['dest-1'].valorDesconto, '25.92');
    assert.strictEqual(result['dest-2'].valorDesconto, '25.92');
    assert.strictEqual(result['dest-3'].valorDesconto, '25.93');

    // Verificação de soma estrita das 3 notas
    let sumF = '0.00', sumS = '0.00', sumO = '0.00', sumD = '0.00', sumTot = '0.00';
    for (const noteId of ['dest-1', 'dest-2', 'dest-3']) {
      const exp = result[noteId];
      sumF = decimalAdd(sumF, exp.valorFrete, 2);
      sumS = decimalAdd(sumS, exp.valorSeguro, 2);
      sumO = decimalAdd(sumO, exp.outrasDespesas, 2);
      sumD = decimalAdd(sumD, exp.valorDesconto, 2);

      const tot = calculateInvoiceTotals(
        [{ quantidade: '1', valorUnitario: '10000.00', valorTotal: '10000.00' }],
        {
          freight: exp.valorFrete,
          insurance: exp.valorSeguro,
          otherExpenses: exp.outrasDespesas,
          discount: exp.valorDesconto,
        }
      );
      sumTot = decimalAdd(sumTot, tot.valorTotalNota, 2);
    }

    assert.strictEqual(sumF, parentTotals.valorFrete);
    assert.strictEqual(sumS, parentTotals.valorSeguro);
    assert.strictEqual(sumO, parentTotals.outrasDespesas);
    assert.strictEqual(sumD, parentTotals.valorDesconto);
    assert.strictEqual(sumTot, parentTotals.valorTotalNota);
  });

  it('1.3: Divisão em 5 notas com distribuição fortemente assimétrica (40%, 25%, 20%, 10%, 5%)', () => {
    const parentTotals = {
      valorProdutos: '200000.00',
      valorFrete: '8765.43',
      valorSeguro: '2345.67',
      outrasDespesas: '1234.56',
      valorDesconto: '987.65',
      // Total = 200000 - 987.65 + 8765.43 + 2345.67 + 1234.56 = 211358.01
      valorTotalNota: '211358.01',
    };

    const notes = [
      { id: 'n5-1', totalProducts: '80000.00' }, // 40%
      { id: 'n5-2', totalProducts: '50000.00' }, // 25%
      { id: 'n5-3', totalProducts: '40000.00' }, // 20%
      { id: 'n5-4', totalProducts: '20000.00' }, // 10%
      { id: 'n5-5', totalProducts: '10000.00' }, // 5%
    ];

    const result = apportionAllInvoiceExpenses(parentTotals, notes);

    let sumF = '0.00', sumS = '0.00', sumO = '0.00', sumD = '0.00', sumTot = '0.00';
    for (const n of notes) {
      const exp = result[n.id];
      sumF = decimalAdd(sumF, exp.valorFrete, 2);
      sumS = decimalAdd(sumS, exp.valorSeguro, 2);
      sumO = decimalAdd(sumO, exp.outrasDespesas, 2);
      sumD = decimalAdd(sumD, exp.valorDesconto, 2);

      const tot = calculateInvoiceTotals(
        [{ quantidade: '1', valorUnitario: n.totalProducts, valorTotal: n.totalProducts }],
        {
          freight: exp.valorFrete,
          insurance: exp.valorSeguro,
          otherExpenses: exp.outrasDespesas,
          discount: exp.valorDesconto,
        }
      );
      sumTot = decimalAdd(sumTot, tot.valorTotalNota, 2);
    }

    assert.strictEqual(sumF, parentTotals.valorFrete);
    assert.strictEqual(sumS, parentTotals.valorSeguro);
    assert.strictEqual(sumO, parentTotals.outrasDespesas);
    assert.strictEqual(sumD, parentTotals.valorDesconto);
    assert.strictEqual(sumTot, parentTotals.valorTotalNota);
  });

  it('1.4: Notas de destino com produto zero recebem R$ 0,00 de despesas enquanto as ativas conservam 100%', () => {
    const parentTotals = {
      valorProdutos: '50000.00',
      valorFrete: '1500.00',
      valorSeguro: '450.00',
      outrasDespesas: '200.00',
      valorDesconto: '100.00',
      valorTotalNota: '52050.00',
    };

    // 4 notas de destino configuradas, mas Nota 1 e Nota 4 têm R$ 0,00 alocados
    const notes = [
      { id: 'dest-zero-1', totalProducts: '0.00' },
      { id: 'dest-active-2', totalProducts: '30000.00' },
      { id: 'dest-active-3', totalProducts: '20000.00' },
      { id: 'dest-zero-4', totalProducts: '0.00' },
    ];

    const result = apportionAllInvoiceExpenses(parentTotals, notes);

    // Notas com produto zero não podem receber despesas
    assert.strictEqual(result['dest-zero-1'].valorFrete, '0.00');
    assert.strictEqual(result['dest-zero-1'].valorSeguro, '0.00');
    assert.strictEqual(result['dest-zero-1'].outrasDespesas, '0.00');
    assert.strictEqual(result['dest-zero-1'].valorDesconto, '0.00');

    assert.strictEqual(result['dest-zero-4'].valorFrete, '0.00');
    assert.strictEqual(result['dest-zero-4'].valorSeguro, '0.00');
    assert.strictEqual(result['dest-zero-4'].outrasDespesas, '0.00');
    assert.strictEqual(result['dest-zero-4'].valorDesconto, '0.00');

    // Notas ativas absorvem 100% das despesas
    const activeFrete = decimalAdd(result['dest-active-2'].valorFrete, result['dest-active-3'].valorFrete, 2);
    const activeSeguro = decimalAdd(result['dest-active-2'].valorSeguro, result['dest-active-3'].valorSeguro, 2);
    const activeOutras = decimalAdd(result['dest-active-2'].outrasDespesas, result['dest-active-3'].outrasDespesas, 2);
    const activeDesconto = decimalAdd(result['dest-active-2'].valorDesconto, result['dest-active-3'].valorDesconto, 2);

    assert.strictEqual(activeFrete, parentTotals.valorFrete);
    assert.strictEqual(activeSeguro, parentTotals.valorSeguro);
    assert.strictEqual(activeOutras, parentTotals.outrasDespesas);
    assert.strictEqual(activeDesconto, parentTotals.valorDesconto);
  });

  it('1.5: Caso patológico: quando todas as notas têm R$ 0,00 de produtos, despesas são divididas igualmente com conservação', () => {
    const parentTotals = {
      valorProdutos: '0.00',
      valorFrete: '100.01',
      valorSeguro: '33.33',
      outrasDespesas: '17.77',
      valorDesconto: '5.05',
      valorTotalNota: '146.06',
    };

    const notes = [
      { id: 'zero-1', totalProducts: '0.00' },
      { id: 'zero-2', totalProducts: '0.00' },
      { id: 'zero-3', totalProducts: '0.00' },
    ];

    const result = apportionAllInvoiceExpenses(parentTotals, notes);

    // Conservação exata
    const sumF = decimalAdd(decimalAdd(result['zero-1'].valorFrete, result['zero-2'].valorFrete, 2), result['zero-3'].valorFrete, 2);
    const sumS = decimalAdd(decimalAdd(result['zero-1'].valorSeguro, result['zero-2'].valorSeguro, 2), result['zero-3'].valorSeguro, 2);
    const sumO = decimalAdd(decimalAdd(result['zero-1'].outrasDespesas, result['zero-2'].outrasDespesas, 2), result['zero-3'].outrasDespesas, 2);
    const sumD = decimalAdd(decimalAdd(result['zero-1'].valorDesconto, result['zero-2'].valorDesconto, 2), result['zero-3'].valorDesconto, 2);

    assert.strictEqual(sumF, parentTotals.valorFrete);
    assert.strictEqual(sumS, parentTotals.valorSeguro);
    assert.strictEqual(sumO, parentTotals.outrasDespesas);
    assert.strictEqual(sumD, parentTotals.valorDesconto);

    // Resíduo no último lote: 100.01 / 3 = 33.33 + 33.33 + 33.35 = 100.01
    assert.strictEqual(result['zero-1'].valorFrete, '33.33');
    assert.strictEqual(result['zero-2'].valorFrete, '33.33');
    assert.strictEqual(result['zero-3'].valorFrete, '33.35');
  });

  it('1.6: Monte Carlo Stress Test: 100 ciclos aleatórios com N notas (2 a 6) e centavos ímpares sem drift IEEE-754', () => {
    for (let cycle = 1; cycle <= 100; cycle++) {
      const numNotes = 2 + (cycle % 5); // 2 a 6 notas
      const parentFrete = `${(1000 + (cycle * 13.37) % 9999).toFixed(2)}`;
      const parentSeguro = `${(200 + (cycle * 7.19) % 2500).toFixed(2)}`;
      const parentOutras = `${(50 + (cycle * 3.41) % 1000).toFixed(2)}`;
      const parentDesconto = `${(30 + (cycle * 2.11) % 500).toFixed(2)}`;

      const parentTotals = {
        valorProdutos: '100000.00',
        valorFrete: parentFrete,
        valorSeguro: parentSeguro,
        outrasDespesas: parentOutras,
        valorDesconto: parentDesconto,
      };

      // Gera divisões assimétricas de produtos
      const notes = [];
      let allocatedProd = '0.00';
      const baseShare = Math.floor(100000 / numNotes);

      for (let i = 0; i < numNotes; i++) {
        const isLast = i === numNotes - 1;
        let noteProd;
        if (!isLast) {
          const jitter = ((cycle * (i + 1) * 31) % (baseShare / 2)).toFixed(2);
          noteProd = `${(baseShare + parseFloat(jitter)).toFixed(2)}`;
          allocatedProd = decimalAdd(allocatedProd, noteProd, 2);
        } else {
          noteProd = decimalSubtract('100000.00', allocatedProd, 2);
        }
        notes.push({ id: `mc-note-${i + 1}`, totalProducts: noteProd });
      }

      const res = apportionAllInvoiceExpenses(parentTotals, notes);

      let sumFrete = '0.00', sumSeguro = '0.00', sumOutras = '0.00', sumDesconto = '0.00';
      for (const n of notes) {
        sumFrete = decimalAdd(sumFrete, res[n.id].valorFrete, 2);
        sumSeguro = decimalAdd(sumSeguro, res[n.id].valorSeguro, 2);
        sumOutras = decimalAdd(sumOutras, res[n.id].outrasDespesas, 2);
        sumDesconto = decimalAdd(sumDesconto, res[n.id].valorDesconto, 2);
      }

      assert.strictEqual(
        sumFrete,
        parentFrete,
        `Ciclo ${cycle} (${numNotes} notas): Frete divergiu de ${parentFrete}`
      );
      assert.strictEqual(
        sumSeguro,
        parentSeguro,
        `Ciclo ${cycle} (${numNotes} notas): Seguro divergiu de ${parentSeguro}`
      );
      assert.strictEqual(
        sumOutras,
        parentOutras,
        `Ciclo ${cycle} (${numNotes} notas): Outras despesas divergiram de ${parentOutras}`
      );
      assert.strictEqual(
        sumDesconto,
        parentDesconto,
        `Ciclo ${cycle} (${numNotes} notas): Desconto divergiu de ${parentDesconto}`
      );
    }
  });
});

// ============================================================================
// SUITE 2: Dynamic Multi-Note Management & Strict Validation Traps
// ============================================================================
describe('CHALLENGER 2 SUITE 2: Dynamic Multi-Note Management & Boundary Traps', () => {

  const testItems = [
    { id: 'it-alpha', codigo: 'ALP-01', quantidade: '100.0000', valorUnitario: '50.0000' },
    { id: 'it-beta', codigo: 'BET-02', quantidade: '250.0000', valorUnitario: '12.0000' },
  ];

  it('2.1: Requisito de no mínimo 2 notas de destino: bloqueia canSave quando destinationNotes < 2', () => {
    // 1 única nota com 100% dos produtos alocados NÃO é uma divisão
    const singleNote = [
      {
        id: 'dest-only-1',
        itens: [
          { id: 'it-alpha', quantidade: '100.0000' },
          { id: 'it-beta', quantidade: '250.0000' },
        ],
      },
    ];

    const repSingle = validateDivisionBatch(testItems, singleNote);
    assert.strictEqual(repSingle.isBalanced, true, 'Itens estão alocados, mas lote tem apenas 1 nota');
    assert.strictEqual(repSingle.canSave, false, 'canSave DEVE ser false para menos de 2 notas (exige ao menos 2 notas para divisão)');
    assert.strictEqual(repSingle.summary.destinationNotesCount, 1);

    // 0 notas
    const repZero = validateDivisionBatch(testItems, []);
    assert.strictEqual(repZero.canSave, false, 'canSave DEVE ser false para 0 notas');
    assert.strictEqual(repZero.isBalanced, false, 'Sem notas o lote não está balanceado');
    assert.strictEqual(repZero.summary.destinationNotesCount, 0);
  });

  it('2.2: Adição dinâmica de 3ª, 4ª e 5ª notas de destino com validação reativa de balanço', () => {
    // Início: 2 notas com 50% de cada item alocado (restam 50%)
    let notes = [
      {
        id: 'note-1',
        itens: [
          { id: 'it-alpha', quantidade: '50.0000' },
          { id: 'it-beta', quantidade: '125.0000' },
        ],
      },
      {
        id: 'note-2',
        itens: [
          { id: 'it-alpha', quantidade: '25.0000' },
          { id: 'it-beta', quantidade: '50.0000' },
        ],
      },
    ];

    let rep = validateDivisionBatch(testItems, notes);
    assert.strictEqual(rep.hasRemaining, true, 'Deve ter saldo restante pendente');
    assert.strictEqual(rep.canSave, false, 'Não pode permitir salvar com saldo pendente');
    assert.strictEqual(rep.summary.remainingCount, 2);

    // Usuário clica em "+ Adicionar Nota de Destino 3" e aloca o restante
    notes.push({
      id: 'note-3',
      itens: [
        { id: 'it-alpha', quantidade: '25.0000' }, // 50 + 25 + 25 = 100 (ok)
        { id: 'it-beta', quantidade: '75.0000' },  // 125 + 50 + 75 = 250 (ok)
      ],
    });

    rep = validateDivisionBatch(testItems, notes);
    assert.strictEqual(rep.hasRemaining, false);
    assert.strictEqual(rep.hasExcess, false);
    assert.strictEqual(rep.isBalanced, true, 'Lote deve estar balanceado com 3 notas');
    assert.strictEqual(rep.canSave, true, 'canSave DEVE ser liberado com 3 notas 100% balanceadas');
    assert.strictEqual(rep.summary.destinationNotesCount, 3);
  });

  it('2.3: Remoção de nota de destino desbalanceia o lote e bloqueia finalização imediatamente', () => {
    let notes = [
      {
        id: 'note-1',
        itens: [
          { id: 'it-alpha', quantidade: '50.0000' },
          { id: 'it-beta', quantidade: '125.0000' },
        ],
      },
      {
        id: 'note-2',
        itens: [
          { id: 'it-alpha', quantidade: '25.0000' },
          { id: 'it-beta', quantidade: '75.0000' },
        ],
      },
      {
        id: 'note-3',
        itens: [
          { id: 'it-alpha', quantidade: '25.0000' },
          { id: 'it-beta', quantidade: '50.0000' },
        ],
      },
    ];

    assert.strictEqual(validateDivisionBatch(testItems, notes).canSave, true);

    // Remove a nota 3
    notes = notes.filter((n) => n.id !== 'note-3');
    const repAfterRemove = validateDivisionBatch(testItems, notes);

    assert.strictEqual(repAfterRemove.canSave, false, 'Remover nota deve bloquear canSave');
    assert.strictEqual(repAfterRemove.hasRemaining, true);
    assert.strictEqual(repAfterRemove.itemReports[0].balanceStr, '25.0000');
    assert.strictEqual(repAfterRemove.itemReports[1].balanceStr, '50.0000');
  });

  it('2.4: Armadilha de alocação negativa: entrada negativa em qualquer nota aciona excesso e bloqueio', () => {
    const notesWithNeg = [
      {
        id: 'n-1',
        itens: [{ id: 'it-alpha', quantidade: '120.0000' }],
      },
      {
        id: 'n-2',
        itens: [{ id: 'it-alpha', quantidade: '-20.0000' }], // Tentativa de anular excesso
      },
    ];

    const rep = validateDivisionBatch(testItems, notesWithNeg);
    assert.strictEqual(rep.hasExcess, true, 'Entrada negativa DEVE disparar flag de excesso/bloqueio');
    assert.strictEqual(rep.canSave, false);
    assert.strictEqual(rep.isValid, false);
  });

  it('2.5: Armadilha de alocação de soma zero (+150 e -50 = 100): nunca deve ludibriar a validação', () => {
    const origQty = '100.0000';
    const allocations = ['150.0000', '-50.0000'];

    const balance = calculateRemainingBalance(origQty, allocations);
    assert.strictEqual(balance.hasNegative, true, 'Deve detectar alocação negativa');
    assert.strictEqual(balance.status, 'excess', 'Status deve ser excess');
    assert.strictEqual(balance.isOk, false, 'isOk DEVE ser false');
  });

  it('2.6: Auxiliar distributeRemainingEqually zera pendências remanescentes em lote perfeitamente', () => {
    // Item com 100.0000, 3 notas: nota 1 já tinha 10.0000, restam 90.0000
    const orig = '100.0000';
    const current = ['10.0000', '0.0000', '0.0000'];

    const distributed = distributeRemainingEqually(orig, current, 4);
    assert.strictEqual(distributed.length, 3);

    // 90.0000 / 3 = 30.0000 cada
    // Nota 1: 10 + 30 = 40.0000
    // Nota 2: 0 + 30 = 30.0000
    // Nota 3: 0 + 30 = 30.0000
    assert.strictEqual(distributed[0], '40.0000');
    assert.strictEqual(distributed[1], '30.0000');
    assert.strictEqual(distributed[2], '30.0000');

    const check = calculateRemainingBalance(orig, distributed);
    assert.strictEqual(check.status, 'ok');
    assert.strictEqual(check.balanceStr, '0.0000');
  });
});

// ============================================================================
// SUITE 3: Prepared Invoice Persistence Contract & Schema Conformance
// ============================================================================
describe('CHALLENGER 2 SUITE 3: Prepared Invoices Full Lifecycle & Schema Conformance', () => {

  beforeEach(async () => {
    setCustomStorage(null);
    sessionInvoices.clear();
    await preparedInvoiceRepository.resetDemoData();
    await invoiceRepository.resetDemoData();
  });

  it('3.1: Divisão completa de documento real de XML exportação em 3 notas preparadas salvas no repositório', async () => {
    // 1. Carrega XML de exportação real (2 itens, frete 5000, seguro 1200, outras 500)
    const xml = readFileSync(resolve(FIXTURES_DIR, 'synthetic_nfe_export_proc.xml'), 'utf-8');
    const parsed = parseNFeXml(xml);
    assert.strictEqual(parsed.success, true);

    const invoice = mapXmlToInvoice(parsed.data);
    await invoiceRepository.create(invoice);

    const parentId = invoice.id;
    assert.strictEqual(invoice.totais.valorProdutos, '166750.00');
    assert.strictEqual(invoice.totais.valorTotalNota, '173450.00');

    // 2. Configura 3 notas de destino com distribuição exata
    // Item 1 (500.0000 SC): 200.0000, 200.0000, 100.0000
    // Item 2 (10.0000 UN): 4.0000, 3.0000, 3.0000
    const targetNotesConfig = [
      {
        id: 'dest-A',
        nome: 'Lote Roterdã A',
        razaoSocial: 'Rotterdam Grain Terminals B.V.',
        cnpj: '',
        uf: '',
        pais: 'Holanda',
        paisCodigo: 'NL',
        itens: {
          [invoice.itens[0].id]: '200.0000',
          [invoice.itens[1].id]: '4.0000',
        },
      },
      {
        id: 'dest-B',
        nome: 'Lote Hamburgo B',
        razaoSocial: 'Hamburg Hafen Logistics GmbH',
        cnpj: '',
        uf: '',
        pais: 'Alemanha',
        paisCodigo: 'DE',
        itens: {
          [invoice.itens[0].id]: '200.0000',
          [invoice.itens[1].id]: '3.0000',
        },
      },
      {
        id: 'dest-C',
        nome: 'Lote Antuérpia C',
        razaoSocial: 'Antwerp Port Silos N.V.',
        cnpj: '',
        uf: '',
        pais: 'Bélgica',
        paisCodigo: 'BE',
        itens: {
          [invoice.itens[0].id]: '100.0000',
          [invoice.itens[1].id]: '3.0000',
        },
      },
    ];

    // Valida o lote
    const batchRep = validateDivisionBatch(invoice.itens, targetNotesConfig);
    assert.strictEqual(batchRep.canSave, true, 'Lote deve ser 100% válido para salvamento');
    assert.strictEqual(batchRep.hasExcess, false);
    assert.strictEqual(batchRep.hasRemaining, false);
    assert.strictEqual(batchRep.isBalanced, true);

    // 3. Monta dados de cada nota preparada com totais calculados
    const preparedNotesData = [];
    for (let i = 0; i < targetNotesConfig.length; i++) {
      const note = targetNotesConfig[i];
      const distributedItems = invoice.itens
        .map((origItem, itemIdx) => {
          const qtyStr = cleanDecimalString(note.itens[origItem.id] || '0');
          if (decimalCompare(qtyStr, '0') <= 0) return null;
          const lineTotal = decimalMultiply(origItem.valorUnitario, qtyStr, 2);
          return {
            ...origItem,
            item: itemIdx + 1,
            quantidade: qtyStr,
            valorTotal: lineTotal,
          };
        })
        .filter(Boolean);

      const productTotal = distributedItems.reduce(
        (acc, it) => decimalAdd(acc, it.valorTotal, 2),
        '0.00'
      );

      preparedNotesData.push({ note, index: i, distributedItems, productTotal });
    }

    // Rateio proporcional estrito SEFAZ
    const expensesByNote = apportionAllInvoiceExpenses(
      invoice.totais,
      preparedNotesData.map((p) => ({ id: p.note.id, productTotal: p.productTotal }))
    );

    // 4. Criação atômica no preparedInvoiceRepository
    const createdNotes = [];
    for (let pIdx = 0; pIdx < preparedNotesData.length; pIdx++) {
      const { note, index, distributedItems } = preparedNotesData[pIdx];
      const suffix = String.fromCharCode(65 + index);
      const exp = expensesByNote[note.id];

      const noteTotais = calculateInvoiceTotals(distributedItems, {
        discount: exp.valorDesconto,
        freight: exp.valorFrete,
        insurance: exp.valorSeguro,
        otherExpenses: exp.outrasDespesas,
      });

      const entry = await preparedInvoiceRepository.create({
        parentInvoiceId: invoice.id,
        documentoOrigemId: invoice.id,
        origemNumero: invoice.numero,
        numeroOrigem: invoice.numero,
        numero: `${invoice.numero}-${suffix}`,
        serie: invoice.serie || '1',
        nomePreparacao: note.nome,
        descricaoLote: `${note.nome} — Destino: ${note.razaoSocial}`,
        emitente: invoice.emitente,
        destinatario: {
          nome: note.razaoSocial,
          cnpj: note.cnpj,
          uf: note.uf,
          pais: note.pais,
          paisCodigo: note.paisCodigo,
        },
        itens: distributedItems,
        quantidadeItens: distributedItems.length,
        valorProdutos: noteTotais.valorProdutos,
        valorFrete: noteTotais.valorFrete,
        valorSeguro: noteTotais.valorSeguro,
        outrasDespesas: noteTotais.outrasDespesas,
        valorDesconto: noteTotais.valorDesconto,
        valorTotal: noteTotais.valorTotalNota,
        valorTotalNota: noteTotais.valorTotalNota,
        totais: noteTotais,
        status: 'preparado',
        dataCriacao: new Date().toISOString(),
      });

      createdNotes.push(entry);
    }

    // 5. Atualiza status da nota original para 'dividida'
    await invoiceRepository.update(invoice.id, { status: 'dividida' });

    // =========================================================================
    // VERIFICAÇÕES DE CONFORMIDADE DE ESQUEMA E PERSISTÊNCIA
    // =========================================================================

    // A. Quantidade de notas criadas
    assert.strictEqual(createdNotes.length, 3);

    // B. Listagem filtrada por parentInvoiceId
    const listed = await preparedInvoiceRepository.list({ parentInvoiceId: invoice.id });
    assert.strictEqual(listed.length, 3, 'Deve encontrar exatamente as 3 notas da NF original');

    // C. Verificação estrita de esquema em cada nota preparada
    for (let i = 0; i < createdNotes.length; i++) {
      const note = createdNotes[i];
      const reloaded = await preparedInvoiceRepository.findById(note.id);
      assert.ok(reloaded, `Nota ${note.id} deve existir no repositório`);

      // Identificadores e metadados
      assert.match(reloaded.id, /^prep-/, 'ID deve ter prefixo prep-');
      assert.strictEqual(reloaded.parentInvoiceId, invoice.id);
      assert.strictEqual(reloaded.documentoOrigemId, invoice.id);
      assert.strictEqual(reloaded.origemNumero, invoice.numero);
      assert.strictEqual(reloaded.status, 'preparado');
      assert.ok(reloaded.dataCriacao, 'Deve ter dataCriacao ISO');

      // Destinatário
      assert.ok(reloaded.destinatario.nome);
      assert.ok(reloaded.destinatario.pais);

      // Itens
      assert.strictEqual(Array.isArray(reloaded.itens), true);
      assert.strictEqual(reloaded.quantidadeItens, reloaded.itens.length);
      for (const item of reloaded.itens) {
        assert.ok(item.codigo);
        assert.ok(item.descricao);
        assert.ok(item.quantidade);
        assert.ok(item.valorUnitario);
        assert.ok(item.valorTotal);
      }

      // Totais flat e objeto totais
      assert.ok(reloaded.valorProdutos);
      assert.ok(reloaded.valorFrete);
      assert.ok(reloaded.valorSeguro);
      assert.ok(reloaded.outrasDespesas);
      assert.ok(reloaded.valorDesconto);
      assert.ok(reloaded.valorTotalNota);
      assert.strictEqual(reloaded.valorTotal, reloaded.valorTotalNota);

      assert.strictEqual(reloaded.totais.valorProdutos, reloaded.valorProdutos);
      assert.strictEqual(reloaded.totais.valorFrete, reloaded.valorFrete);
      assert.strictEqual(reloaded.totais.valorSeguro, reloaded.valorSeguro);
      assert.strictEqual(reloaded.totais.outrasDespesas, reloaded.outrasDespesas);
      assert.strictEqual(reloaded.totais.valorDesconto, reloaded.valorDesconto);
      assert.strictEqual(reloaded.totais.valorTotalNota, reloaded.valorTotalNota);
    }

    // D. Conservação estrita de balanço contábil entre todas as notas criadas e a NF original
    let sumProd = '0.00', sumFrete = '0.00', sumSeguro = '0.00', sumOutras = '0.00', sumDesc = '0.00', sumTotal = '0.00';
    for (const note of createdNotes) {
      sumProd = decimalAdd(sumProd, note.valorProdutos, 2);
      sumFrete = decimalAdd(sumFrete, note.valorFrete, 2);
      sumSeguro = decimalAdd(sumSeguro, note.valorSeguro, 2);
      sumOutras = decimalAdd(sumOutras, note.outrasDespesas, 2);
      sumDesc = decimalAdd(sumDesc, note.valorDesconto, 2);
      sumTotal = decimalAdd(sumTotal, note.valorTotalNota, 2);
    }

    assert.strictEqual(sumProd, invoice.totais.valorProdutos, 'Soma dos produtos deve igualar o pai');
    assert.strictEqual(sumFrete, invoice.totais.valorFrete, 'Soma do frete deve igualar o pai');
    assert.strictEqual(sumSeguro, invoice.totais.valorSeguro, 'Soma do seguro deve igualar o pai');
    assert.strictEqual(sumOutras, invoice.totais.outrasDespesas, 'Soma das outras despesas deve igualar o pai');
    assert.strictEqual(sumDesc, invoice.totais.valorDesconto, 'Soma dos descontos deve igualar o pai');
    assert.strictEqual(sumTotal, invoice.totais.valorTotalNota, 'Soma do total das notas deve igualar o pai');

    // E. Atualização do status da nota pai para 'dividida'
    const updatedParent = await invoiceRepository.findById(invoice.id);
    assert.strictEqual(updatedParent.status, 'dividida', 'Status da nota original deve ser "dividida"');
  });

  it('3.2: Exclusão de notas preparadas via preparedInvoiceRepository.delete', async () => {
    const listInitial = await preparedInvoiceRepository.list();
    const target = listInitial[0];
    assert.ok(target, 'Deve existir nota inicial de fábrica');

    const removed = await preparedInvoiceRepository.delete(target.id);
    assert.strictEqual(removed, true, 'Deve retornar true na exclusão bem-sucedida');

    const reloaded = await preparedInvoiceRepository.findById(target.id);
    assert.strictEqual(reloaded, null, 'Nota excluída não deve mais ser encontrada');

    // Tentativa de excluir ID inexistente
    const removedNonExistent = await preparedInvoiceRepository.delete('prep-inexistente');
    assert.strictEqual(removedNonExistent, false, 'Deve retornar false para id inexistente');
  });

  it('3.3: Filtros de busca textual por número, destinatário e descrição de lote', async () => {
    // Insere nota preparada específica
    await preparedInvoiceRepository.create({
      id: 'prep-test-search-99',
      numero: '999.888.777-X',
      parentInvoiceId: 'demo-01',
      descricaoLote: 'Contêiner Criogênico Especial Tóquio',
      destinatario: { nome: 'Mitsubishi Corporation Logistics' },
      valorTotalNota: '50000.00',
    });

    // Busca por número
    const byNum = await preparedInvoiceRepository.list({ query: '999.888' });
    assert.ok(byNum.some((n) => n.id === 'prep-test-search-99'));

    // Busca por destinatário
    const byDest = await preparedInvoiceRepository.list({ query: 'Mitsubishi' });
    assert.ok(byDest.some((n) => n.id === 'prep-test-search-99'));

    // Busca por descrição de lote
    const byDesc = await preparedInvoiceRepository.list({ query: 'Criogênico' });
    assert.ok(byDesc.some((n) => n.id === 'prep-test-search-99'));

    // Busca com termo inexistente
    const emptySearch = await preparedInvoiceRepository.list({ query: 'TermoInexistenteXYZ123' });
    assert.strictEqual(emptySearch.length, 0);
  });
});
