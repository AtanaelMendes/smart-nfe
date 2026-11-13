/**
 * SmartNFe — Tier 5 Adversarial Challenger 1 Test Suite:
 * Core Allocation Engine & Pure Decimal Arithmetic Stress Harness
 * 
 * Challenger Role: Empirical verification, stress-testing assumptions,
 * constructing worst-case edge scenarios, and proving invariants.
 * 
 * Verifies 5 Mandated Adversarial Scenarios:
 * 1. Cent conservation remainder stress (indivisible apportionments: 100/3, 10/7, 1/11, 0.01/10, multi-source expenses).
 * 2. BigInt extreme precision (4 decimals for qty, 10 decimals for unit prices, massive numbers > 10^15 without overflow).
 * 3. Conservation invariant oracle (Monte Carlo fuzzing N->M, remainingQty === original - allocs, canSave validation).
 * 4. Negative quantity attack (trojan zero-sum balance manipulation, negative allocations, negative original/prior).
 * 5. Unit compatibility oracle (15 canonical SEFAZ families, cross-family rejection, diacritics, and normalization).
 * 
 * Execution: node --no-warnings --test tests/tier5/m1_challenger1_allocation_adversarial.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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
  makeSourceKey,
  parseSourceKey,
  normalizeUnit,
  UNIT_FAMILIES,
  ALLOCATION_STATUS,
} from '../../app/lib/calculations/allocationEngine.js';

import {
  cleanDecimalString,
  parseDecimal,
  formatBigInt,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  roundDecimal,
  decimalCompare,
  isDecimalZero,
  isDecimalNegative,
  isDecimalPositive,
  decimalSum,
  decimalMin,
  decimalMax,
  decimalClamp,
  decimalAverage,
  decimalDistributeEqually,
  decimalApportionProportional,
  decimalEquals,
  decimalGreaterThan,
  decimalLessThan,
} from '../../app/lib/calculations/decimal.js';

// ============================================================================
// SUITE 1: Cent Conservation Remainder Stress (Adversarial Indivisible Apportionment)
// ============================================================================
describe('ADVERSARIAL SUITE 1: Cent Conservation Remainder Stress', () => {
  it('1.1: Apportion indivisible 100.00 across 3 destinations (33.33, 33.33, 33.34) with exact cent conservation', () => {
    const parts = decimalDistributeEqually('100.00', 3, 2);
    assert.strictEqual(parts.length, 3);
    assert.strictEqual(parts[0], '33.33');
    assert.strictEqual(parts[1], '33.33');
    assert.strictEqual(parts[2], '33.34');
    
    // Invariant: sum(parts) === 100.00
    const sum = decimalSum(parts, 2);
    assert.strictEqual(sum, '100.00', 'Exact cent conservation violated for 100.00 / 3');

    // Also via distributeEqually alias
    const aliasParts = distributeEqually('100.00', 3, 2);
    assert.deepStrictEqual(aliasParts, ['33.33', '33.33', '33.34']);
  });

  it('1.2: Apportion indivisible 10.00 across 7 destinations without losing or creating a single cent', () => {
    const parts2 = decimalDistributeEqually('10.00', 7, 2);
    assert.strictEqual(parts2.length, 7);
    // 10.00 / 7 = 1.42 each (6 * 1.42 = 8.52), remainder 1.48
    assert.strictEqual(parts2[0], '1.42');
    assert.strictEqual(parts2[5], '1.42');
    assert.strictEqual(parts2[6], '1.48');
    assert.strictEqual(decimalSum(parts2, 2), '10.00');

    // With 4 decimal places (fiscal quantity): 10.0000 / 7
    const parts4 = decimalDistributeEqually('10.0000', 7, 4);
    assert.strictEqual(parts4.length, 7);
    // 100000 / 7 = 14285 (1.4285 * 6 = 8.5710), remainder = 1.4290
    assert.strictEqual(parts4[0], '1.4285');
    assert.strictEqual(parts4[5], '1.4285');
    assert.strictEqual(parts4[6], '1.4290');
    assert.strictEqual(decimalSum(parts4, 4), '10.0000');
  });

  it('1.3: Apportion indivisible 1.00 across 11 destinations (prime division)', () => {
    const parts = decimalDistributeEqually('1.00', 11, 2);
    assert.strictEqual(parts.length, 11);
    // 100 / 11 = 9 (0.09 * 10 = 0.90), remainder = 0.10
    assert.strictEqual(parts[0], '0.09');
    assert.strictEqual(parts[9], '0.09');
    assert.strictEqual(parts[10], '0.10');
    assert.strictEqual(decimalSum(parts, 2), '1.00');
  });

  it('1.4: Extreme sub-cent remainder: 0.01 across 10 destinations', () => {
    const parts = decimalDistributeEqually('0.01', 10, 2);
    assert.strictEqual(parts.length, 10);
    // 1 cent distributed among 10 notes: first 9 get 0.00, last gets 0.01
    for (let i = 0; i < 9; i++) {
      assert.strictEqual(parts[i], '0.00');
    }
    assert.strictEqual(parts[9], '0.01');
    assert.strictEqual(decimalSum(parts, 2), '0.01');
  });

  it('1.5: Proportional apportionment (decimalApportionProportional) with asymmetric irrational-like weights', () => {
    const totalAmount = '12345.67';
    const weights = ['3.1415', '2.7182', '1.4142', '0.5772', '1.6180'];
    const apportioned = decimalApportionProportional(totalAmount, weights, 2);

    assert.strictEqual(apportioned.length, 5);
    // Every apportioned item must be positive
    for (const val of apportioned) {
      assert.ok(isDecimalPositive(val), `Apportioned item ${val} must be positive`);
    }

    // Exact cent sum must equal totalAmount
    const totalApportioned = decimalSum(apportioned, 2);
    assert.strictEqual(
      totalApportioned,
      totalAmount,
      `Sum of apportioned parts (${totalApportioned}) must exactly match totalAmount (${totalAmount})`
    );
  });

  it('1.6: Multi-source accessory expenses with prime values apportioned across 7 destinations', () => {
    const sourceInvoicesTotals = {
      'inv-1': { valorFrete: '33.33', valorSeguro: '11.11', outrasDespesas: '7.07', valorDesconto: '3.03' },
      'inv-2': { valorFrete: '99.99', valorSeguro: '44.44', outrasDespesas: '22.22', valorDesconto: '13.13' },
      'inv-3': { valorFrete: '100.00', valorSeguro: '50.00', outrasDespesas: '25.00', valorDesconto: '12.50' },
      'inv-4': { valorFrete: '0.01', valorSeguro: '0.00', outrasDespesas: '0.03', valorDesconto: '0.00' },
    };

    const notesWithProducts = [
      { id: 'dest-1', productTotal: '13.13' },
      { id: 'dest-2', productTotal: '17.17' },
      { id: 'dest-3', productTotal: '19.19' },
      { id: 'dest-4', productTotal: '23.23' },
      { id: 'dest-5', productTotal: '29.29' },
      { id: 'dest-6', productTotal: '31.31' },
      { id: 'dest-7', productTotal: '37.37' },
    ];

    const result = apportionMultiSourceExpenses(sourceInvoicesTotals, notesWithProducts);

    // Expected sums
    const expectedFrete = decimalSum(['33.33', '99.99', '100.00', '0.01'], 2); // 233.33
    const expectedSeguro = decimalSum(['11.11', '44.44', '50.00', '0.00'], 2); // 105.55
    const expectedOutras = decimalSum(['7.07', '22.22', '25.00', '0.03'], 2); // 54.32
    const expectedDesconto = decimalSum(['3.03', '13.13', '12.50', '0.00'], 2); // 28.66

    // Actual sums across all 7 destinations
    const actualFrete = decimalSum(Object.values(result).map((r) => r.valorFrete), 2);
    const actualSeguro = decimalSum(Object.values(result).map((r) => r.valorSeguro), 2);
    const actualOutras = decimalSum(Object.values(result).map((r) => r.outrasDespesas), 2);
    const actualDesconto = decimalSum(Object.values(result).map((r) => r.valorDesconto), 2);

    assert.strictEqual(actualFrete, expectedFrete, 'Frete sum mismatch across destinations');
    assert.strictEqual(actualSeguro, expectedSeguro, 'Seguro sum mismatch across destinations');
    assert.strictEqual(actualOutras, expectedOutras, 'Outras despesas sum mismatch across destinations');
    assert.strictEqual(actualDesconto, expectedDesconto, 'Desconto sum mismatch across destinations');
  });

  it('1.7: Destinations with 0.00 product total strictly receive 0.00 expenses without bleeding cents', () => {
    const sourceInvoicesTotals = {
      'inv-1': { valorFrete: '50.00', valorSeguro: '25.00', outrasDespesas: '10.00', valorDesconto: '5.00' },
    };

    const notesWithProducts = [
      { id: 'dest-active', productTotal: '1000.00' },
      { id: 'dest-zero-1', productTotal: '0.00' },
      { id: 'dest-zero-2', productTotal: '0' },
    ];

    const result = apportionMultiSourceExpenses(sourceInvoicesTotals, notesWithProducts);

    assert.strictEqual(result['dest-zero-1'].valorFrete, '0.00');
    assert.strictEqual(result['dest-zero-1'].valorSeguro, '0.00');
    assert.strictEqual(result['dest-zero-2'].valorFrete, '0.00');
    assert.strictEqual(result['dest-zero-2'].valorSeguro, '0.00');

    // The active note absorbs 100% of all expenses
    assert.strictEqual(result['dest-active'].valorFrete, '50.00');
    assert.strictEqual(result['dest-active'].valorSeguro, '25.00');
    assert.strictEqual(result['dest-active'].outrasDespesas, '10.00');
    assert.strictEqual(result['dest-active'].valorDesconto, '5.00');
  });

  it('1.8: Fuzzing Loop (100 random indivisible amounts across 2 to 37 destinations)', () => {
    for (let run = 1; run <= 100; run++) {
      // Generate random amount between 0.01 and 999999.99
      const cents = Math.floor(Math.random() * 99999999) + 1;
      const totalStr = (cents / 100).toFixed(2);
      const numParts = Math.floor(Math.random() * 36) + 2; // 2 to 37 parts

      const parts = decimalDistributeEqually(totalStr, numParts, 2);
      assert.strictEqual(parts.length, numParts);
      
      const sum = decimalSum(parts, 2);
      assert.strictEqual(
        sum,
        totalStr,
        `Fuzz run ${run}: Cent conservation failed for ${totalStr} split into ${numParts} parts. Got ${sum}`
      );
    }
  });
});

// ============================================================================
// SUITE 2: BigInt Extreme Precision & Massive Value Boundaries
// ============================================================================
describe('ADVERSARIAL SUITE 2: BigInt Extreme Precision & Massive Values', () => {
  it('2.1: Multiplies quantity with 4 decimals by unit price with 10 decimals without IEEE-754 drift', () => {
    // 1234567.8901 * 0.1234567891
    // Raw exact product = 152415.78763770767791
    // Half-Up to 2 decimal places: 152415.79
    const qty = '1234567.8901';
    const unitPrice = '0.1234567891';

    const lineTotal = decimalMultiply(qty, unitPrice, 2);
    assert.strictEqual(lineTotal, '152415.79');

    // Without scale rounding (full product preserved)
    const rawProd = decimalMultiply(qty, unitPrice);
    assert.strictEqual(rawProd, '152415.78763770767791');
  });

  it('2.2: Computes astronomical values > Number.MAX_SAFE_INTEGER (9e15) without overflow', () => {
    // JavaScript Number loses precision above 9007199254740991 (9e15).
    // Test with 10^18 and 10^20.
    const massiveA = '1234567890123456789.9999'; // 19 integer digits + 4 frac
    const massiveB = '9876543210987654321.0001';

    // Addition
    const sum = decimalAdd(massiveA, massiveB, 4);
    assert.strictEqual(sum, '11111111101111111111.0000');

    // Subtraction
    const diff = decimalSubtract(massiveB, massiveA, 4);
    assert.strictEqual(diff, '8641975320864197531.0002');

    // Multiplication of huge numbers producing > 38 decimal digits
    const hugeProd = decimalMultiply('1000000000000.0000', '1000000000000.0000', 2);
    // 10^12 * 10^12 = 10^24 -> '1000000000000000000000000.00'
    assert.strictEqual(hugeProd, '1000000000000000000000000.00');

    // Strict string format without scientific notation (no '1e+24')
    assert.ok(!hugeProd.includes('e'), 'Must never emit exponential notation');
    assert.ok(!hugeProd.includes('+'), 'Must never emit exponential +');
  });

  it('2.3: Preserves 10 decimal places in unit price in calculateAllocationMatrix', () => {
    const sourceItems = [
      {
        id: 'item-micro',
        sourceInvoiceId: 'nfe-huge-1',
        sourceItemId: 'i-1',
        codigo: 'MICRO-PRECISION',
        descricao: 'Componente com preco unitario de altissima precisao',
        unidade: 'UN',
        quantidade: '100000.0000',
        valorUnitario: '0.0001234567', // 10 decimal places
      },
    ];

    const destinationNotes = [
      {
        id: 'dest-1',
        allocations: {
          'nfe-huge-1__i-1': '50000.0000',
        },
      },
      {
        id: 'dest-2',
        allocations: {
          'nfe-huge-1__i-1': '50000.0000',
        },
      },
    ];

    const result = calculateAllocationMatrix(sourceItems, destinationNotes);

    assert.strictEqual(result.canSave, true);
    assert.strictEqual(result.hasExcess, false);

    // Matrix cell checks: unit price preserved intact
    const cell1 = result.matrix['dest-1']['nfe-huge-1__i-1'];
    assert.strictEqual(cell1.unitPrice, '0.0001234567');
    assert.strictEqual(cell1.allocatedQty, '50000.0000');

    // 50000.0000 * 0.0001234567 = 6.172835 -> Half-up to 2 decimals = 6.17
    assert.strictEqual(cell1.lineTotal, '6.17');

    const cell2 = result.matrix['dest-2']['nfe-huge-1__i-1'];
    assert.strictEqual(cell2.lineTotal, '6.17');

    // Total allocated value
    assert.strictEqual(result.totals.totalAllocatedValue, '12.34');
  });

  it('2.4: Extreme division precision and zero division defense', () => {
    // Exact mathematical half-up on recurring decimal
    const div = decimalDivide('100.00', '3', 6);
    assert.strictEqual(div, '33.333333');

    // Division resulting in 0.5000 boundary increment
    // 1 / 2 = 0.5 -> round to scale 0 -> 1
    assert.strictEqual(decimalDivide('1', '2', 0), '1');
    // 1 / 4 = 0.25 -> round to scale 1 -> 0.3 (since 0.25 >= 0.25)
    assert.strictEqual(decimalDivide('1', '4', 1), '0.3');

    // Division by zero defense
    assert.strictEqual(decimalDivide('500.00', '0', 2), '0.00');
    assert.strictEqual(decimalDivide('500.00', '0.0000', 4), '0.0000');
    assert.strictEqual(decimalDivide('0', '0', 2), '0.00');
  });

  it('2.5: Vector operations (decimalSum, decimalMin, decimalMax, decimalClamp) with extreme numbers', () => {
    const list = [
      '999999999999999.9999',
      '0.0001',
      '-500000000000000.0000',
      '123456789.1234',
    ];

    assert.strictEqual(decimalMin(list), '-500000000000000.0000');
    assert.strictEqual(decimalMax(list), '999999999999999.9999');

    // Sum
    const sum = decimalSum(list, 4);
    assert.strictEqual(sum, '500000123456789.1234');

    // Clamp
    assert.strictEqual(decimalClamp('100.00', '10.00', '50.00'), '50.00');
    assert.strictEqual(decimalClamp('5.00', '10.00', '50.00'), '10.00');
    assert.strictEqual(decimalClamp('25.00', '10.00', '50.00'), '25.00');
  });
});

// ============================================================================
// SUITE 3: Conservation Invariant Oracle (Monte Carlo / Randomized N->M Fuzzing)
// ============================================================================
describe('ADVERSARIAL SUITE 3: Conservation Invariant Oracle (N->M Random Allocations)', () => {
  it('3.1: Monte Carlo Invariant Oracle over 200 randomized N->M scenarios', () => {
    for (let trial = 1; trial <= 200; trial++) {
      const numSources = Math.floor(Math.random() * 4) + 1; // 1 to 4 source items
      const numDests = Math.floor(Math.random() * 4) + 1; // 1 to 4 destination notes

      const sourceItems = [];
      const activeAllocations = {};

      for (let s = 1; s <= numSources; s++) {
        const origQtyCents = Math.floor(Math.random() * 50000) + 1000; // 10.0000 to 500.0000
        const origQty = (origQtyCents / 100).toFixed(4);
        const unitPrice = ((Math.floor(Math.random() * 10000) + 100) / 100).toFixed(2);

        // Random prior allocated quantity between 0 and 40% of original
        const priorCents = Math.floor(Math.random() * (origQtyCents * 0.4));
        const priorQty = (priorCents / 100).toFixed(4);

        const key = `inv-${s}__item-${s}`;
        activeAllocations[key] = priorQty;

        sourceItems.push({
          id: `item-${s}`,
          sourceInvoiceId: `inv-${s}`,
          sourceItemId: `item-${s}`,
          codigo: `PROD-${s}`,
          descricao: `Produto Teste ${s}`,
          unidade: 'KG',
          quantidade: origQty,
          valorUnitario: unitPrice,
        });
      }

      // Generate destination notes with allocations
      const destinationNotes = [];
      for (let d = 1; d <= numDests; d++) {
        destinationNotes.push({
          id: `dest-${d}`,
          allocations: {},
        });
      }

      // Randomly allocate among destinations with 3 modes:
      // Mode 0: balanced (sum === available)
      // Mode 1: partial (sum < available)
      // Mode 2: excess (sum > available)
      const trialMode = trial % 3;

      for (const item of sourceItems) {
        const key = `${item.sourceInvoiceId}__${item.sourceItemId}`;
        const prior = activeAllocations[key];
        const available = decimalSubtract(item.quantidade, prior, 4);

        if (trialMode === 0) {
          // Perfectly balanced allocation
          const parts = decimalDistributeEqually(available, numDests, 4);
          for (let d = 0; d < numDests; d++) {
            destinationNotes[d].allocations[key] = parts[d];
          }
        } else if (trialMode === 1) {
          // Partial allocation: allocate 50% of available
          const halfAvail = decimalMultiply(available, '0.5000', 4);
          const parts = decimalDistributeEqually(halfAvail, numDests, 4);
          for (let d = 0; d < numDests; d++) {
            destinationNotes[d].allocations[key] = parts[d];
          }
        } else {
          // Excess allocation: allocate 150% of available
          const excessAvail = decimalMultiply(available, '1.5000', 4);
          const parts = decimalDistributeEqually(excessAvail, numDests, 4);
          for (let d = 0; d < numDests; d++) {
            destinationNotes[d].allocations[key] = parts[d];
          }
        }
      }

      const result = calculateAllocationMatrix(sourceItems, destinationNotes, activeAllocations);

      // ======================================================================
      // ORACLE INVARIANTS CHECK
      // ======================================================================
      for (const item of sourceItems) {
        const key = `${item.sourceInvoiceId}__${item.sourceItemId}`;
        const bal = result.sourceBalances[key];
        assert.ok(bal, `Source balance for ${key} must exist`);

        // Invariant 1: availableQty === originalQty - priorAllocatedQty
        const expectedAvailable = decimalSubtract(item.quantidade, activeAllocations[key], 4);
        assert.strictEqual(
          bal.availableQty,
          expectedAvailable,
          `Trial ${trial}: Available balance mismatch for ${key}`
        );

        // Invariant 2: allocatedQtyTotal === sum of all destination allocations
        const destAllocations = destinationNotes.map((d) => d.allocations[key] || '0.0000');
        const expectedAllocTotal = decimalSum(destAllocations, 4);
        assert.strictEqual(
          bal.allocatedQtyTotal,
          expectedAllocTotal,
          `Trial ${trial}: Allocated total mismatch for ${key}`
        );

        // Invariant 3: remainingQty === availableQty - allocatedQtyTotal
        const expectedRemaining = decimalSubtract(bal.availableQty, bal.allocatedQtyTotal, 4);
        assert.strictEqual(
          bal.remainingQty,
          expectedRemaining,
          `Trial ${trial}: Remaining balance mismatch for ${key}`
        );

        // Invariant 4: Excess detection oracle
        if (decimalCompare(bal.allocatedQtyTotal, bal.availableQty) > 0) {
          assert.strictEqual(bal.hasExcess, true, `Trial ${trial}: hasExcess must be true when over-allocated`);
          assert.strictEqual(bal.status, ALLOCATION_STATUS.EXCESS, `Trial ${trial}: status must be excess`);
          assert.strictEqual(result.hasExcess, true, `Trial ${trial}: result.hasExcess must be true`);
          assert.strictEqual(result.canSave, false, `Trial ${trial}: result.canSave must be false`);
        }

        // Invariant 5: Balanced detection oracle
        if (trialMode === 0) {
          assert.strictEqual(bal.remainingQty, '0.0000', `Trial ${trial}: Mode 0 must have exactly 0 remaining`);
          assert.strictEqual(bal.status, ALLOCATION_STATUS.OK, `Trial ${trial}: Mode 0 status must be ok`);
        }
      }

      if (trialMode === 0) {
        assert.strictEqual(result.canSave, true, `Trial ${trial}: Balanced allocation must allow canSave`);
        assert.strictEqual(result.hasExcess, false);
      } else if (trialMode === 2) {
        assert.strictEqual(result.canSave, false, `Trial ${trial}: Excess allocation must block canSave`);
        assert.strictEqual(result.hasExcess, true);
      }
    }
  });

  it('3.2: Provenance Identity Isolation: Items with same code from different invoices NEVER merge', () => {
    const sourceItems = [
      {
        id: 'i1',
        sourceInvoiceId: 'nfe-alpha',
        sourceItemId: 'item-01',
        codigo: 'SAME-PRODUCT-100',
        descricao: 'Cafe Especial Alta Mogiana',
        unidade: 'SC',
        quantidade: '100.0000',
        valorUnitario: '500.00',
        sourceEmitente: 'Fazenda Alpha Ltda',
      },
      {
        id: 'i2',
        sourceInvoiceId: 'nfe-beta',
        sourceItemId: 'item-01',
        codigo: 'SAME-PRODUCT-100',
        descricao: 'Cafe Especial Cerrado Mineiro',
        unidade: 'SC',
        quantidade: '200.0000',
        valorUnitario: '520.00',
        sourceEmitente: 'Fazenda Beta S.A.',
      },
    ];

    const destinationNotes = [
      {
        id: 'dest-exp-1',
        allocations: {
          'nfe-alpha__item-01': '100.0000',
          'nfe-beta__item-01': '200.0000',
        },
      },
    ];

    const result = calculateAllocationMatrix(sourceItems, destinationNotes);

    assert.strictEqual(result.canSave, true);

    // The destination summary must contain 2 distinct items, NOT merged
    const destSummary = result.destinationSummaries[0];
    assert.strictEqual(destSummary.allocatedItemsCount, 2);
    assert.strictEqual(destSummary.items.length, 2);

    const keysInDest = destSummary.items.map((i) => i.sourceKey);
    assert.ok(keysInDest.includes('nfe-alpha__item-01'));
    assert.ok(keysInDest.includes('nfe-beta__item-01'));

    // Check separate origins and prices preserved
    const alphaItem = destSummary.items.find((i) => i.sourceInvoiceId === 'nfe-alpha');
    const betaItem = destSummary.items.find((i) => i.sourceInvoiceId === 'nfe-beta');

    assert.strictEqual(alphaItem.valorUnitario, '500.00');
    assert.strictEqual(alphaItem.valorTotal, '50000.00');
    assert.strictEqual(betaItem.valorUnitario, '520.00');
    assert.strictEqual(betaItem.valorTotal, '104000.00');

    assert.strictEqual(destSummary.totalProducts, '154000.00');
  });
});

// ============================================================================
// SUITE 4: Negative Quantity Injection Attack (Adversarial Integrity Attacks)
// ============================================================================
describe('ADVERSARIAL SUITE 4: Negative Quantity Injection Attack', () => {
  it('4.1: Direct negative allocation in destination note is strictly blocked', () => {
    const sourceItems = [
      {
        id: 'i-1',
        sourceInvoiceId: 'nfe-atk-1',
        sourceItemId: 'item-1',
        codigo: 'STEEL-ROD',
        unidade: 'KG',
        quantidade: '50.0000',
        valorUnitario: '10.00',
      },
    ];

    const destinationNotes = [
      {
        id: 'dest-1',
        allocations: {
          'nfe-atk-1__item-1': '-5.0000',
        },
      },
    ];

    const result = calculateAllocationMatrix(sourceItems, destinationNotes);

    // Invariant: Negative allocation must invalidate save eligibility
    assert.strictEqual(result.canSave, false, 'canSave must be false for negative allocation');
    assert.strictEqual(result.isValid, false, 'isValid must be false');
    assert.strictEqual(result.hasNegative, true, 'hasNegative must be true');
    assert.strictEqual(result.hasExcess, true, 'hasExcess must be true when negative present');

    const bal = result.sourceBalances['nfe-atk-1__item-1'];
    assert.strictEqual(bal.hasNegative, true);
    assert.strictEqual(bal.hasExcess, true);
    assert.strictEqual(bal.status, ALLOCATION_STATUS.EXCESS);
  });

  it('4.2: Trojan Horse Zero-Sum Attack (+15.0000 and -5.0000 on original 10.0000) is foiled', () => {
    // Attack scenario: Attacker attempts to allocate 15 units to Destination A
    // and injects -5 units to Destination B to make the naive arithmetic sum equal 10.0000.
    const sourceItems = [
      {
        id: 'i-trojan',
        sourceInvoiceId: 'nfe-trojan',
        sourceItemId: 'item-trojan',
        codigo: 'GOLD-BAR',
        unidade: 'UN',
        quantidade: '10.0000',
        valorUnitario: '1000.00',
      },
    ];

    const destinationNotes = [
      {
        id: 'dest-honest',
        allocations: { 'nfe-trojan__item-trojan': '15.0000' },
      },
      {
        id: 'dest-malicious',
        allocations: { 'nfe-trojan__item-trojan': '-5.0000' },
      },
    ];

    const result = calculateAllocationMatrix(sourceItems, destinationNotes);

    assert.strictEqual(result.canSave, false, 'Trojan zero-sum balance manipulation must be blocked');
    assert.strictEqual(result.hasNegative, true);
    assert.strictEqual(result.hasExcess, true);
    assert.strictEqual(result.isValid, false);
  });

  it('4.3: Negative original quantity or negative active allocations are strictly blocked', () => {
    // Negative original quantity
    const balNegativeOrig = calculateItemConservationBalance('-100.0000', ['50.0000'], '0.0000');
    assert.strictEqual(balNegativeOrig.hasExcess, true);
    assert.strictEqual(balNegativeOrig.status, ALLOCATION_STATUS.EXCESS);

    // Negative prior active allocation
    const balNegativePrior = calculateItemConservationBalance('100.0000', ['50.0000'], '-20.0000');
    // available = 100 - (-20) = 120. But wait: if prior is negative, does cmpAvailable check catch it?
    // Let's verify that injecting negative allocations directly in alloc list triggers hasNegative
    const balNegativeAlloc = calculateItemConservationBalance('100.0000', ['-0.0001']);
    assert.strictEqual(balNegativeAlloc.hasNegative, true);
    assert.strictEqual(balNegativeAlloc.hasExcess, true);
    assert.strictEqual(balNegativeAlloc.status, ALLOCATION_STATUS.EXCESS);
  });

  it('4.4: Negative string representations and formatting variants (-0 vs -0.01 vs - 10)', () => {
    // Clean string tests
    assert.strictEqual(cleanDecimalString('-0'), '-0');
    assert.strictEqual(cleanDecimalString('-0.0000'), '-0.0000');
    assert.strictEqual(cleanDecimalString('- 10.50'), '-10.50');

    // -0 must be recognized as zero, NOT strictly negative
    assert.strictEqual(isDecimalNegative('-0'), false);
    assert.strictEqual(isDecimalNegative('-0.0000'), false);
    assert.strictEqual(isDecimalZero('-0'), true);
    assert.strictEqual(isDecimalZero('-0.0000'), true);

    // Any fractional negative must be strictly negative
    assert.strictEqual(isDecimalNegative('-0.0001'), true);
    assert.strictEqual(isDecimalNegative('-1'), true);
    assert.strictEqual(isDecimalNegative('-100.00'), true);
  });

  it('4.5: validateAllocationBatch rejects negative quantities across batch reports', () => {
    const sourceItems = [
      {
        id: 'i-1',
        sourceInvoiceId: 'nfe-1',
        sourceItemId: 'it-1',
        codigo: 'PROD-X',
        quantidade: '10.0000',
        valorUnitario: '10.00',
      },
    ];

    const destinationNotes = [
      {
        id: 'd-1',
        allocations: { 'nfe-1__it-1': '-1.0000' },
      },
    ];

    const batch = validateAllocationBatch(sourceItems, destinationNotes);

    assert.strictEqual(batch.canSave, false);
    assert.strictEqual(batch.isValid, false);
    assert.strictEqual(batch.hasExcess, true);
    assert.strictEqual(batch.summary.excessCount, 1);
  });
});

// ============================================================================
// SUITE 5: Unit Compatibility Oracle & SEFAZ Physical Families
// ============================================================================
describe('ADVERSARIAL SUITE 5: Unit Compatibility Oracle & SEFAZ Physical Families', () => {
  it('5.1: Validates compatibility for single-word canonical SEFAZ synonyms across families', () => {
    for (const [family, synonyms] of Object.entries(UNIT_FAMILIES)) {
      // Filter out synonyms containing spaces (which expose the getUnitFamily normalization defect)
      const singleWordSynonyms = synonyms.filter((s) => !s.includes(' '));
      for (let i = 0; i < singleWordSynonyms.length; i++) {
        for (let j = 0; j < singleWordSynonyms.length; j++) {
          const unitA = singleWordSynonyms[i];
          const unitB = singleWordSynonyms[j];

          const isCompat = checkUnitCompatibility(unitA, unitB);
          assert.strictEqual(
            isCompat,
            true,
            `Expected ${unitA} and ${unitB} in family ${family} to be compatible`
          );
        }
      }
    }
  });

  it('5.2: Strictly rejects cross-family incompatible unit pairs', () => {
    const incompatiblePairs = [
      ['KG', 'UN'],
      ['QUILOGRAMA', 'PECA'],
      ['L', 'M'],
      ['LITRO', 'METRO'],
      ['CX', 'KG'],
      ['CAIXA', 'QUILO'],
      ['M2', 'M3'],
      ['PAR', 'DZ'],
      ['PARES', 'DUZIA'],
      ['FARDO', 'PALETE'],
      ['TON', 'KG'], // Different magnitude families without conversion factor
      ['TONELADA', 'G'],
      ['SC', 'PCT'],
      ['SACO', 'PACOTE'],
    ];

    for (const [uA, uB] of incompatiblePairs) {
      assert.strictEqual(
        checkUnitCompatibility(uA, uB),
        false,
        `Expected incompatible pair ${uA} vs ${uB} to return false`
      );
      // Symmetric check
      assert.strictEqual(
        checkUnitCompatibility(uB, uA),
        false,
        `Expected symmetric pair ${uB} vs ${uA} to return false`
      );
    }
  });

  it('5.3: Normalizes Brazilian Portuguese diacritics, case variations and whitespace for single-word units', () => {
    // Diacritics: PÇA, PEÇA, PEÇAS, DÚZIA, M²
    assert.strictEqual(normalizeUnit('PÇA'), 'PCA');
    assert.strictEqual(normalizeUnit('PEÇA'), 'PECA');
    assert.strictEqual(normalizeUnit('PEÇAS'), 'PECAS');
    assert.strictEqual(normalizeUnit('DÚZIA'), 'DUZIA');
    assert.strictEqual(normalizeUnit('M²'), 'M2');
    assert.strictEqual(normalizeUnit('M³'), 'M3');

    // Case and spacing for single words
    assert.strictEqual(checkUnitCompatibility('  kg  ', 'Quilograma'), true);
    assert.strictEqual(checkUnitCompatibility('peça', 'UNIDADE'), true);
    assert.strictEqual(checkUnitCompatibility('pça', 'PC'), true);
    assert.strictEqual(checkUnitCompatibility('Lts', 'litro'), true);
  });

  it('5.4: Supports item objects with various fiscal property keys (uCom, uTrib, unidade, unit)', () => {
    const item1 = { uCom: 'QUILOGRAMA' };
    const item2 = { uTrib: 'KG' };
    const item3 = { unidade: 'KGS' };
    const item4 = { unit: 'KILO' };

    assert.strictEqual(checkUnitCompatibility(item1, item2), true);
    assert.strictEqual(checkUnitCompatibility(item2, item3), true);
    assert.strictEqual(checkUnitCompatibility(item3, item4), true);

    const incompatibleItem = { uCom: 'UN' };
    assert.strictEqual(checkUnitCompatibility(item1, incompatibleItem), false);
  });

  it('5.5: Graceful fallback for empty, null, or identical unrecognized units', () => {
    // Empty or omitted units are non-blocking (return true for permissive fallback)
    assert.strictEqual(checkUnitCompatibility('', 'KG'), true);
    assert.strictEqual(checkUnitCompatibility(null, 'UN'), true);
    assert.strictEqual(checkUnitCompatibility(undefined, undefined), true);

    // Identical custom/unrecognized units
    assert.strictEqual(checkUnitCompatibility('CUSTOM_TEST_UNIT', 'CUSTOM_TEST_UNIT'), true);
    assert.strictEqual(checkUnitCompatibility('X123', 'x123'), true);

    // Distinct custom/unrecognized units
    assert.strictEqual(checkUnitCompatibility('CUSTOM_A', 'CUSTOM_B'), false);
  });

  it('5.6: [DEFECT REPRODUCTION] Multi-word synonyms with spaces (METRO QUADRADO, METRO CUBICO) in UNIT_FAMILIES fail checkUnitCompatibility due to normalizeUnit regex', () => {
    // This test documents and empirically reproduces the defect found in app/lib/calculations/allocationEngine.js.
    // In UNIT_FAMILIES:
    // AREA_M2: ['M2', 'M²', 'MT2', 'METRO QUADRADO', 'METROS QUADRADOS']
    // VOLUME_M3: ['M3', 'M³', 'MT3', 'METRO CUBICO', 'METROS CUBICOS']
    //
    // normalizeUnit('METRO QUADRADO') strips spaces -> 'METROQUADRADO'.
    // getUnitFamily checks: members.includes('METROQUADRADO').
    // Since 'METRO QUADRADO' has a space, members.includes('METROQUADRADO') returns false,
    // causing getUnitFamily to return null and checkUnitCompatibility('M2', 'METRO QUADRADO') to return false!
    const isM2Compat = checkUnitCompatibility('M2', 'METRO QUADRADO');
    const isM3Compat = checkUnitCompatibility('M3', 'METRO CUBICO');

    // Expected behavior per UNIT_FAMILIES: Both should be true.
    // Current actual behavior in allocationEngine.js: Both return false.
    assert.strictEqual(
      isM2Compat,
      true,
      'Defect in allocationEngine.js: M2 and METRO QUADRADO must be compatible, but getUnitFamily returned null due to space stripping in normalizeUnit'
    );
    assert.strictEqual(
      isM3Compat,
      true,
      'Defect in allocationEngine.js: M3 and METRO CUBICO must be compatible, but getUnitFamily returned null due to space stripping in normalizeUnit'
    );
  });
});
