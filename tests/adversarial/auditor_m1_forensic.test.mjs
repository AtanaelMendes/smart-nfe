import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  cleanDecimalString,
  parseDecimal,
  formatBigInt,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  roundDecimal,
  decimalSum,
  decimalMin,
  decimalMax,
  decimalAverage,
  decimalDistributeEqually,
  decimalApportionProportional,
  isDecimalPositive,
  isDecimalZero,
  isDecimalNegative,
} from '../../app/lib/calculations/decimal.js';

import {
  calculateAllocationMatrix,
  calculateItemConservationBalance,
  calculateItemBalance,
  checkUnitCompatibility,
  distributeEqually,
  distributeRemainingEqually,
  apportionExpenses,
  apportionMultiSourceExpenses,
  validateAllocationBatch,
  buildCompositeKey,
  parseCompositeKey,
} from '../../app/lib/calculations/allocationEngine.js';

import {
  calculateRemainingBalance,
  validateDivisionBatch,
  apportionAllInvoiceExpenses,
} from '../../app/lib/calculations/divisionMath.js';

import {
  preparedInvoiceRepository,
  sessionPreparedInvoices,
  isRealPreparedInvoice,
} from '../../app/features/preparedInvoiceRepository.js';

import {
  preparationRepository,
  sessionPreparations,
  isRealPreparation,
} from '../../app/features/preparationRepository.js';

import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';

describe('FORENSIC AUDITOR INDEPENDENT VERIFICATION', () => {
  it('Check 1: Zero forbidden dependencies in package.json and imports', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const forbidden = ['bignumber.js', 'decimal.js', 'mathjs', 'big.js', 'fraction.js', 'dinero.js'];
    const allDeps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const f of forbidden) {
      assert.ok(!allDeps.includes(f), 'Forbidden dependency found in package.json: ' + f);
    }

    const files = [
      'app/lib/calculations/decimal.js',
      'app/lib/calculations/allocationEngine.js',
      'app/lib/calculations/divisionMath.js',
      'app/features/preparedInvoiceRepository.js',
      'app/features/preparationRepository.js'
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const f of forbidden) {
        assert.ok(!content.includes("'" + f + "'") && !content.includes('"' + f + '"'), 'Forbidden import in ' + file);
      }
    }
  });

  it('Check 2: Mathematical precision & absence of dummy facades', () => {
    assert.strictEqual(roundDecimal('10.005', 2), '10.01');
    assert.strictEqual(roundDecimal('10.0049', 2), '10.00');
    assert.strictEqual(roundDecimal('0.00005', 4), '0.0001');
    assert.strictEqual(roundDecimal('0.000049', 4), '0.0000');
    assert.strictEqual(roundDecimal('-10.005', 2), '-10.01');
    assert.strictEqual(roundDecimal('-10.0049', 2), '-10.00');

    const giantA = '99999999999999999999.9999';
    const giantB = '0.0001';
    const giantSum = decimalAdd(giantA, giantB, 4);
    assert.strictEqual(giantSum, '100000000000000000000.0000');

    const dist7 = decimalDistributeEqually('1.0000', 7, 4);
    assert.strictEqual(dist7.length, 7);
    const sum7 = dist7.reduce((a, b) => decimalAdd(a, b, 4), '0.0000');
    assert.strictEqual(sum7, '1.0000');

    const dist11 = decimalDistributeEqually('100.00', 11, 2);
    const sum11 = dist11.reduce((a, b) => decimalAdd(a, b, 2), '0.00');
    assert.strictEqual(sum11, '100.00');
  });

  it('Check 3: Monte Carlo conservation invariance (200 random partitions)', () => {
    for (let i = 0; i < 200; i++) {
      const intPart = Math.floor(Math.random() * 50000) + 1;
      const decPart = Math.floor(Math.random() * 10000);
      const origQty = intPart + '.' + String(decPart).padStart(4, '0');
      const numNotes = Math.floor(Math.random() * 6) + 2;

      const slices = distributeEqually(origQty, numNotes, 4);
      const sumSlices = slices.reduce((acc, s) => decimalAdd(acc, s, 4), '0.0000');
      assert.strictEqual(sumSlices, origQty, 'Monte Carlo Conservation failed at iteration ' + i);

      const bal = calculateItemConservationBalance(origQty, slices, '0.0000', 4);
      assert.strictEqual(bal.remainingQty, '0.0000');
      assert.strictEqual(bal.hasExcess, false);
      assert.strictEqual(bal.status, 'ok');
    }
  });

  it('Check 4: Storage leakage and strict volatile session isolation', async () => {
    await preparedInvoiceRepository.resetDemoData();
    await preparationRepository.resetDemoData();

    const realSamples = [
      { isRealImport: true, numero: 'R1' },
      { isDemo: false, numero: 'R2' },
      { parentInvoiceId: 'nfe-chave-44-digitos-001', numero: 'R3' },
      { sourceInvoiceIds: ['nfe-fornecedor-real-002'], numero: 'R4' },
      { origens: [{ invoiceId: 'nfe-origem-real-003' }], numero: 'R5' }
    ];

    for (const sample of realSamples) {
      assert.strictEqual(isRealPreparedInvoice(sample), true, 'Sample should be detected as real: ' + JSON.stringify(sample));
      const created = await preparedInvoiceRepository.create(sample);
      assert.strictEqual(sessionPreparedInvoices.has(created.id), true, 'Must reside in volatile session map');

      const inStorage = (localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, []) || []).some(x => x.id === created.id);
      assert.strictEqual(inStorage, false, 'REAL XML DATA LEAKED TO LOCALSTORAGE: ' + created.id);
    }

    const realPrepSamples = [
      { isRealImport: true, titulo: 'P1' },
      { isDemo: false, titulo: 'P2' },
      { origens: [{ invoiceId: 'real-inv-1' }], titulo: 'P3' },
      { sourceInvoiceIds: ['real-inv-2'], titulo: 'P4' },
      { parentInvoiceId: 'real-inv-3', titulo: 'P5' },
      { itens: [{ sourceInvoiceId: 'real-inv-4' }], titulo: 'P6' }
    ];

    for (const sample of realPrepSamples) {
      assert.strictEqual(isRealPreparation(sample), true, 'Preparation should be detected as real: ' + JSON.stringify(sample));
      const created = await preparationRepository.create(sample);
      assert.strictEqual(sessionPreparations.has(created.id), true, 'Must reside in sessionPreparations');

      const inStorage = (localStorageService.load(STORAGE_KEYS.PREPARATIONS || 'smartnfe_preparations', []) || []).some(x => x.id === created.id);
      assert.strictEqual(inStorage, false, 'REAL PREPARATION LEAKED TO LOCALSTORAGE: ' + created.id);
    }
  });

  it('Check 5: Non-circumvention and legacy divisionMath delegation', () => {
    const remBal = calculateRemainingBalance('100.0000', ['30.0000', '70.0000']);
    assert.strictEqual(remBal.status, 'ok');
    assert.strictEqual(remBal.balanceStr, '0.0000');

    const remBalPart = calculateRemainingBalance('100.0000', ['30.0000']);
    assert.strictEqual(remBalPart.status, 'remaining');
    assert.strictEqual(remBalPart.balanceStr, '70.0000');

    const remBalExc = calculateRemainingBalance('100.0000', ['120.0000']);
    assert.strictEqual(remBalExc.status, 'excess');
    assert.strictEqual(remBalExc.hasExcess, true);

    const batchRes = validateDivisionBatch(
      [{ id: 'item-1', codigo: 'A', quantidade: '100.0000', valorUnitario: '10.00' }],
      [
        { id: 'dest-1', itens: [{ id: 'item-1', quantidade: '50.0000' }] },
        { id: 'dest-2', itens: [{ id: 'item-1', quantidade: '50.0000' }] }
      ]
    );
    assert.strictEqual(batchRes.canSave, true);
    assert.strictEqual(batchRes.isBalanced, true);
    assert.strictEqual(batchRes.hasRemaining, false);
    assert.strictEqual(batchRes.hasExcess, false);
  });
});
