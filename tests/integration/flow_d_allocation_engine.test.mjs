/**
 * SmartNFe — Integration Test Suite: Fluxo D (Motor Unificado de Alocação e Aritmética BigInt)
 *
 * Requisito: R4 (PROJECT.md, ORIGINAL_REQUEST.md, TEST_INFRA.md)
 *
 * Verificações cobertas (4 Tiers):
 * - Tier 1: Aritmética decimal de precisão arbitrária baseada exclusivamente em BigInt (eliminação do IEEE 754).
 * - Tier 2: Regra de conservação matemática estrita (disponível = original - alocações ativas), bloqueio de excessos e compatibilidade de unidades.
 * - Tier 3: Rateio proporcional de despesas acessórias multi-origem (frete, seguro, outras despesas e desconto) com absorção de resíduos ao centavo.
 * - Tier 4: Retrocompatibilidade integral com o motor legado de divisão (divisionMath.js) e parentInvoiceId.
 *
 * Execução: node --no-warnings --test tests/integration/flow_d_allocation_engine.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanDecimalString,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  roundDecimal,
  decimalCompare,
  decimalSum,
  decimalMin,
  decimalMax,
  isDecimalZero,
  isDecimalNegative,
  isDecimalPositive,
  decimalApportionProportional,
  decimalDistributeEqually,
} from '../../app/lib/calculations/decimal.js';

import {
  ALLOCATION_STATUS,
  buildCompositeKey,
  buildSourceItemKey,
  parseCompositeKey,
  parseSourceItemKey,
  checkUnitCompatibility,
  normalizeUnit,
  calculateItemConservationBalance,
  calculateAllocationMatrix,
  validateAllocationBatch,
} from '../../app/lib/calculations/allocationEngine.js';

import {
  calculateRemainingBalance,
  validateDivisionBatch,
  distributeEqually,
  apportionExpenses,
} from '../../app/lib/calculations/divisionMath.js';

describe('Fluxo D — Motor Unificado de Alocação e Aritmética BigInt (R4)', () => {
  // ==========================================================================
  // TIER 1: Precisão Decimal BigInt e Eliminação do IEEE-754
  // ==========================================================================
  describe('Tier 1: Precisão Decimal BigInt e Eliminação do IEEE-754', () => {
    it('1.1: decimalSum realiza somas vetoriais sem o desvio de ponto flutuante binário (ex: 0.1 + 0.2 = 0.30)', () => {
      // Clássico desvio binário IEEE 754: 0.1 + 0.2 === 0.30000000000000004
      const sum = decimalSum(['0.10', '0.20'], 2);
      assert.strictEqual(sum, '0.30');

      // 10 parcelas de 0.07 (0.70 em BigInt, frequentemente 0.7000000000000001 em IEEE 754)
      const tenParts = Array(10).fill('0.07');
      assert.strictEqual(decimalSum(tenParts, 2), '0.70');
    });

    it('1.2: decimalMultiply com quantidades (escala 4) e preços unitários (escala 4..10) aplica Half-Up NBR 5891 exato', () => {
      // 33.3333 * 3.3333 = 111.11022289 -> 111.11
      const res1 = decimalMultiply('33.3333', '3.3333', 2);
      assert.strictEqual(res1, '111.11');

      // Caso crítico de arredondamento: 12.5000 * 0.0050 = 0.0625 -> Half-up para 0.06
      const res2 = decimalMultiply('12.5000', '0.0050', 2);
      assert.strictEqual(res2, '0.06');

      // 1000.0000 * 12.34567 = 12345.67
      const res3 = decimalMultiply('1000.0000', '12.34567', 2);
      assert.strictEqual(res3, '12345.67');
    });

    it('1.3: decimalDivide assegura teste de resto exato via BigInt (rem * 2n >= divisor) para Half-Up', () => {
      // 100 / 3 = 33.333333... -> 33.33
      assert.strictEqual(decimalDivide('100.00', '3', 2), '33.33');

      // 2 / 3 = 0.666666... -> 0.67
      assert.strictEqual(decimalDivide('2.00', '3', 2), '0.67');

      // 1 / 2 = 0.50
      assert.strictEqual(decimalDivide('1.00', '2', 2), '0.50');
    });

    it('1.4: decimalDivide protege contra divisão por zero retornando zero graciosamente sem lançar exceção', () => {
      assert.strictEqual(decimalDivide('100.00', '0', 2), '0.00');
      assert.strictEqual(decimalDivide('50.00', '0.0000', 4), '0.0000');
    });

    it('1.5: Funções vetoriais e utilitárias (decimalMin, decimalMax, decimalCompare, isDecimalNegative)', () => {
      assert.strictEqual(decimalMin('10.50', '5.20', '8.90'), '5.20');
      assert.strictEqual(decimalMax('10.50', '5.20', '18.90'), '18.90');
      assert.strictEqual(decimalCompare('100.00', '100.00'), 0);
      assert.strictEqual(decimalCompare('100.01', '100.00'), 1);
      assert.strictEqual(decimalCompare('99.99', '100.00'), -1);
      assert.strictEqual(isDecimalNegative('-0.01'), true);
      assert.strictEqual(isDecimalNegative('0.00'), false);
      assert.strictEqual(isDecimalPositive('0.01'), true);
    });
  });

  // ==========================================================================
  // TIER 2: Regra de Conservação, Bloqueio de Excesso e Compatibilidade de Unidades
  // ==========================================================================
  describe('Tier 2: Regra de Conservação, Bloqueio de Excesso e Compatibilidade de Unidades', () => {
    it('2.1: Conservação: disponível = original - alocações de preparações ativas - alocações da preparação atual', () => {
      const balance = calculateItemConservationBalance(
        '1000.0000', // original
        ['300.0000', '200.0000'], // atual (soma = 500)
        '150.0000', // ativa externa
        4
      );

      assert.strictEqual(balance.originalQty, '1000.0000');
      assert.strictEqual(balance.priorAllocatedQty, '150.0000');
      assert.strictEqual(balance.availableQty, '850.0000'); // 1000 - 150
      assert.strictEqual(balance.allocatedQtyTotal, '500.0000');
      assert.strictEqual(balance.remainingQty, '350.0000'); // 850 - 500
      assert.strictEqual(balance.status, ALLOCATION_STATUS.PARTIAL);
      assert.strictEqual(balance.hasExcess, false);
      assert.strictEqual(balance.hasRemaining, true);
    });

    it('2.2: Alocação total e exata atinge status "ok" e isBalanced: true com saldo remanescente 0.0000', () => {
      const balance = calculateItemConservationBalance(
        '500.0000',
        ['250.0000', '250.0000'],
        '0.0000',
        4
      );

      assert.strictEqual(balance.remainingQty, '0.0000');
      assert.strictEqual(balance.status, ALLOCATION_STATUS.OK);
      assert.strictEqual(balance.isBalanced, true);
      assert.strictEqual(balance.hasExcess, false);
      assert.strictEqual(balance.hasRemaining, false);
    });

    it('2.3: Bloqueio estrito de excesso: alocação superior ao saldo disponível define canSave: false e hasExcess: true', () => {
      const sourceItems = [
        {
          id: 'item-1',
          sourceInvoiceId: 'nfe-1',
          sourceItemId: 'it-1',
          quantidade: '100.0000',
          valorUnitario: '10.0000',
        },
      ];

      const destinationNotes = [
        {
          id: 'dest-1',
          allocations: { 'nfe-1__it-1': '100.0001' }, // Excede em 0.0001
        },
      ];

      const result = calculateAllocationMatrix(sourceItems, destinationNotes);
      assert.strictEqual(result.canSave, false, 'Alocação excedente deve bloquear o salvamento (canSave: false)');
      assert.strictEqual(result.hasExcess, true);
      assert.strictEqual(result.sourceBalances['nfe-1__it-1'].status, ALLOCATION_STATUS.EXCESS);
      assert.strictEqual(result.sourceBalances['nfe-1__it-1'].remainingQty, '-0.0001');
    });

    it('2.4: Armadilha de alocação negativa: quantidade negativa em qualquer célula aciona excesso e bloqueio', () => {
      const balance = calculateItemConservationBalance('100.0000', ['-10.0000']);
      assert.strictEqual(balance.hasNegative, true);
      assert.strictEqual(balance.hasExcess, true);
      assert.strictEqual(balance.status, ALLOCATION_STATUS.EXCESS);
    });

    it('2.5: Armadilha de soma zero (+150 e -50 = 100): é terminantemente bloqueada', () => {
      const sourceItems = [
        {
          id: 'item-1',
          sourceInvoiceId: 'nfe-1',
          sourceItemId: 'it-1',
          quantidade: '100.0000',
          valorUnitario: '10.0000',
        },
      ];

      const destinationNotes = [
        { id: 'dest-1', allocations: { 'nfe-1__it-1': '150.0000' } },
        { id: 'dest-2', allocations: { 'nfe-1__it-1': '-50.0000' } },
      ];

      const result = calculateAllocationMatrix(sourceItems, destinationNotes);
      assert.strictEqual(result.canSave, false, 'Soma zero artificial com alocação negativa deve ser bloqueada');
      assert.strictEqual(result.hasNegative, true);
      assert.strictEqual(result.hasExcess, true);
    });

    it('2.6: checkUnitCompatibility valida compatibilidade de unidades da mesma família e rejeita famílias distintas', () => {
      // Mesma unidade
      assert.strictEqual(checkUnitCompatibility('SC', 'SC'), true);
      assert.strictEqual(checkUnitCompatibility('TON', 'TON'), true);
      assert.strictEqual(checkUnitCompatibility('KG', 'KG'), true);

      // Família canônica de massa (KG, TONS, QUILOS)
      assert.strictEqual(checkUnitCompatibility('KG', 'KILOS'), true);
      assert.strictEqual(checkUnitCompatibility('TON', 'TONELADAS'), true);

      // Famílias incompatíveis sem conversão explícita
      assert.strictEqual(checkUnitCompatibility('SC', 'KG'), false, 'Sacas e Quilos são incompatíveis diretamente');
      assert.strictEqual(checkUnitCompatibility('SC', 'TON'), false);
      assert.strictEqual(checkUnitCompatibility('CX', 'TON'), false);
      assert.strictEqual(checkUnitCompatibility('M3', 'KG'), false);
    });
  });

  // ==========================================================================
  // TIER 3: Rateio Multi-Origem de Despesas Acessórias ao Centavo
  // ==========================================================================
  describe('Tier 3: Rateio Multi-Origem de Despesas Acessórias ao Centavo', () => {
    it('3.1: Rateia frete, seguro e outras despesas de N origens distintas proporcionalmente para M destinos', () => {
      // 2 origens distintas com produtos e despesas
      const sourceItems = [
        {
          id: 'it-orig-1',
          sourceInvoiceId: 'inv-orig-1',
          sourceItemId: '1',
          quantidade: '100.0000',
          valorUnitario: '10.0000',
          frete: '60.00',
          seguro: '30.00',
          outrasDespesas: '15.00',
        },
        {
          id: 'it-orig-2',
          sourceInvoiceId: 'inv-orig-2',
          sourceItemId: '1',
          quantidade: '200.0000',
          valorUnitario: '20.0000',
          frete: '120.00',
          seguro: '60.00',
          outrasDespesas: '30.00',
        },
      ];

      // Destino 1 recebe 50% de orig-1 e 25% de orig-2
      // Destino 2 recebe 50% de orig-1 e 75% de orig-2
      const destinationNotes = [
        {
          id: 'dest-1',
          allocations: {
            'inv-orig-1__1': '50.0000',
            'inv-orig-2__1': '50.0000',
          },
        },
        {
          id: 'dest-2',
          allocations: {
            'inv-orig-1__1': '50.0000',
            'inv-orig-2__1': '150.0000',
          },
        },
      ];

      const result = calculateAllocationMatrix(sourceItems, destinationNotes);
      assert.strictEqual(result.canSave, true);

      const d1 = result.destinationSummaries[0];
      const d2 = result.destinationSummaries[1];

      // Total de frete = 60 + 120 = 180.00
      const totalFreteDestinos = decimalAdd(d1.totalFreight, d2.totalFreight, 2);
      assert.strictEqual(totalFreteDestinos, '180.00', 'Soma dos fretes rateados deve bater exatamente com as origens');

      // Total de seguro = 30 + 60 = 90.00
      const totalSeguroDestinos = decimalAdd(d1.totalInsurance, d2.totalInsurance, 2);
      assert.strictEqual(totalSeguroDestinos, '90.00');

      // Total de outras despesas = 15 + 30 = 45.00
      const totalOutrasDestinos = decimalAdd(d1.totalOtherExpenses, d2.totalOtherExpenses, 2);
      assert.strictEqual(totalOutrasDestinos, '45.00');
    });

    it('3.2: Absorve resíduos ímpares de centavos (ex: R$ 0,07 em 3 notas) na última nota sem desvio', () => {
      // R$ 0,07 rateado em partes iguais para 3 destinos: 0.02 + 0.02 + 0.03 = 0.07
      const parts = decimalDistributeEqually('0.07', 3, 2);
      assert.strictEqual(parts.length, 3);
      assert.strictEqual(parts[0], '0.02');
      assert.strictEqual(parts[1], '0.02');
      assert.strictEqual(parts[2], '0.03'); // Absorveu o centavo residual

      const sum = decimalSum(parts, 2);
      assert.strictEqual(sum, '0.07');
    });

    it('3.3: Rateio proporcional baseado em valor de produtos absorve dízimas centesimais perfeitamente', () => {
      // Rateia R$ 100,00 entre 3 notas de R$ 333,33, R$ 333,33 e R$ 333,34
      const products = ['333.33', '333.33', '333.34'];
      const apportioned = decimalApportionProportional('100.00', products, 2);

      assert.strictEqual(apportioned.length, 3);
      const total = decimalSum(apportioned, 2);
      assert.strictEqual(total, '100.00', 'A soma das parcelas rateadas deve fechar exatamente em 100.00');
    });
  });

  // ==========================================================================
  // TIER 4: Retrocompatibilidade com parentInvoiceId e Divisão Legada
  // ==========================================================================
  describe('Tier 4: Retrocompatibilidade com parentInvoiceId e Divisão Legada', () => {
    it('4.1: calculateRemainingBalance em divisionMath.js funciona identicamente delegando ao allocationEngine', () => {
      const res = calculateRemainingBalance('100.0000', ['40.0000', '60.0000']);
      assert.strictEqual(res.balanceStr, '0.0000');
      assert.strictEqual(res.status, 'ok');
      assert.strictEqual(res.isOk, true);
      assert.strictEqual(res.hasExcess, false);
      assert.strictEqual(res.hasRemaining, false);
    });

    it('4.2: validateDivisionBatch valida divisão 1 -> M com canSave: true quando 100% alocada', () => {
      const originalItems = [
        {
          id: 'item-leg-1',
          codigo: 'EXP-SOJ-01',
          descricao: 'Soja Granel',
          quantidade: '1000.0000',
          valorUnitario: '300.0000',
        },
      ];

      const destinationNotes = [
        { id: 'dest-1', allocations: { 'item-leg-1': '500.0000' } },
        { id: 'dest-2', allocations: { 'item-leg-1': '500.0000' } },
      ];

      const result = validateDivisionBatch(originalItems, destinationNotes);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.canSave, true);
      assert.strictEqual(result.hasExcess, false);
      assert.strictEqual(result.isBalanced, true);
      assert.strictEqual(result.summary.balancedCount, 1);
    });

    it('4.3: validateDivisionBatch bloqueia quando destinationNotes < 2', () => {
      const originalItems = [
        { id: 'item-1', quantidade: '100.0000', valorUnitario: '10.0000' },
      ];
      const destinationNotes = [
        { id: 'dest-1', allocations: { 'item-1': '100.0000' } },
      ];

      const result = validateDivisionBatch(originalItems, destinationNotes);
      assert.strictEqual(result.canSave, false, 'Divisão requer no mínimo 2 notas de destino');
    });

    it('4.4: distributeEqually em divisionMath.js reparte quantidades em 4 casas decimais com conservação total', () => {
      // 100.0000 dividido em 3 notas = 33.3333 + 33.3333 + 33.3334 = 100.0000
      const distributed = distributeEqually('100.0000', 3, 4);
      assert.strictEqual(distributed.length, 3);
      assert.strictEqual(distributed[0], '33.3333');
      assert.strictEqual(distributed[1], '33.3333');
      assert.strictEqual(distributed[2], '33.3334'); // Absorção do resíduo de 0.0001

      const total = decimalSum(distributed, 4);
      assert.strictEqual(total, '100.0000');
    });
  });
});
