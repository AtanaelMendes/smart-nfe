/**
 * SmartNFe — Tier 5 Adversarial Challenge Suite: Milestone 2 Decimal Precision & Ancillary Expenses Conservation
 *
 * Challenger: teamwork_challenger_m2_conferencia_2
 * Target: Milestone 2 (M2_Conference_Table_Decimal_Recalc)
 * Requirements: R1, R4 (ORIGINAL_REQUEST.md, PROJECT.md)
 *
 * Empirical verification of:
 * 1. High-precision decimal quantities (up to 4 decimal places) and extended unit prices.
 * 2. Multiplication precision without binary float distortion (IEEE 754) or premature rounding.
 * 3. Negative quantity rejection, non-numeric input handling, and zero handling.
 * 4. Ancillary expenses conservation: ensure editing products does NOT wipe out freight, insurance,
 *    other expenses, or discounts, and that saving preserves them in both session Map and LocalStorage.
 * 5. Snapshot fidelity and rollback invariance under unitary and bulk restore.
 * 6. Concurrency stress with rapid interleaved mutations verifying expense preservation.
 *
 * Execution: node --no-warnings --test tests/tier5/m2_challenger_decimal_expenses_adversarial.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Motores de cálculo
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  decimalDivide,
  roundDecimal,
  decimalCompare,
  isDecimalZero,
  isDecimalNegative,
  decimalAbs,
  cleanDecimalString,
  parseDecimal,
  formatBigInt,
} from '../../app/lib/calculations/decimal.js';

import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '../../app/lib/calculations/invoiceTotals.js';

// Repositórios e armazenamento
import {
  localStorageService,
  STORAGE_KEYS,
  setCustomStorage,
} from '../../app/lib/storage/localStorageService.js';
import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';

// Parsing XML para teste com documento real em sessão
import { parseNFeXml } from '../../app/features/xml/nfeXmlParser.js';
import { mapXmlToInvoice } from '../../app/features/xml/xmlToInvoiceMapper.js';

const FIXTURES_DIR = resolve(process.cwd(), 'tests/fixtures');

// ============================================================================
// SUITE 1: High-Precision Decimal Quantities & Extended Unit Prices
// ============================================================================
describe('CHALLENGER 2 SUITE 1: High-Precision Quantities (4 decimals) & Extended Unit Prices', () => {

  it('1.1: Multiplicação com 4 casas decimais em quantidade e preço estendido (123.4567 * 99999.9999)', () => {
    // 123.4567 * 99999.9999:
    // 1234567 * 999999999 = 1234566998765433 (escala 8) => 12345669.98765433
    // Arredondamento Half-Up para 2 casas => 12345669.99
    const qty = '123.4567';
    const price = '99999.9999';
    const total = calculateItemTotal(price, qty);
    assert.strictEqual(total, '12345669.99', 'Produto de 123.4567 * 99999.9999 deve ser exatamente 12345669.99');

    // Ordem inversa dos operandos deve ser estritamente idêntica
    const totalReverse = calculateItemTotal(qty, price);
    assert.strictEqual(totalReverse, '12345669.99', 'Comutação deve produzir o mesmo valor');
  });

  it('1.2: Micro-quantidades extremas (0.0001) contra preços unitários limítrofes', () => {
    // 0.0001 * 0.0001 = 0.00000001 => 0.00
    assert.strictEqual(calculateItemTotal('0.0001', '0.0001'), '0.00');

    // 0.0001 * 10000.0000 = 1.00000000 => 1.00
    assert.strictEqual(calculateItemTotal('10000.0000', '0.0001'), '1.00');

    // 0.0001 * 5000.0000 = 0.50000000 => 0.50
    assert.strictEqual(calculateItemTotal('5000.0000', '0.0001'), '0.50');

    // 0.0001 * 49.0000 = 0.00490000 => 0.00 (abaixo de 0.005)
    assert.strictEqual(calculateItemTotal('49.0000', '0.0001'), '0.00');

    // 0.0001 * 50.0000 = 0.00500000 => 0.01 (exato meio, arredonda para cima ABNT NBR 5891)
    assert.strictEqual(calculateItemTotal('50.0000', '0.0001'), '0.01');

    // 0.0001 * 150.0000 = 0.01500000 => 0.02
    assert.strictEqual(calculateItemTotal('150.0000', '0.0001'), '0.02');

    // 0.0001 * 99999.9999 = 9.99999999 => 10.00
    assert.strictEqual(calculateItemTotal('99999.9999', '0.0001'), '10.00');
  });

  it('1.3: Quantidades com 4 decimais e preços unitários com até 8 casas decimais', () => {
    // Quantidade de commodity: 1250.7500 TON, Preço unitário: 0.12345678
    // 1250.75 * 0.12345678 = 154.413567585 => 154.41
    const qtyCommodity = '1250.7500';
    const priceExtended = '0.12345678';
    assert.strictEqual(calculateItemTotal(priceExtended, qtyCommodity), '154.41');

    // Reconciliação do item 8 de demo-01: 30.0000 TON * 686.6667 = 20600.001 => 20600.00
    assert.strictEqual(calculateItemTotal('686.6667', '30.0000'), '20600.00');

    // 333.3333 * 3.0000 = 999.9999 => 1000.00
    assert.strictEqual(calculateItemTotal('3.0000', '333.3333'), '1000.00');

    // 100000.0001 * 0.0001 = 10.00000001 => 10.00
    assert.strictEqual(calculateItemTotal('0.0001', '100000.0001'), '10.00');
  });

  it('1.4: Formatação pt-BR com separadores de milhar e vírgula decimal', () => {
    // "123,4567" e "1.234,5678"
    assert.strictEqual(cleanDecimalString('123,4567'), '123.4567');
    assert.strictEqual(cleanDecimalString('1.234,5678'), '1234.5678');
    assert.strictEqual(cleanDecimalString('R$ 99.999,9999'), '99999.9999');

    // Cálculo direto com strings formatadas em pt-BR
    const totalPtBr = calculateItemTotal('R$ 1.250,50', '2,5000');
    // 1250.50 * 2.5 = 3126.25
    assert.strictEqual(totalPtBr, '3126.25');
  });
});

// ============================================================================
// SUITE 2: Multiplication Precision Without Binary Float Distortion
// ============================================================================
describe('CHALLENGER 2 SUITE 2: Zero Binary Float Distortion & Premature Rounding Prevention', () => {

  it('2.1: Assassinatos clássicos do IEEE 754 (Float Drift Killers)', () => {
    // Clássico 19.99 * 3: no IEEE 754 resulta em 59.970000000000006
    assert.strictEqual(calculateItemTotal('19.99', '3'), '59.97');

    // Clássico 0.29 * 100: no IEEE 754 resulta em 28.999999999999996
    assert.strictEqual(calculateItemTotal('0.29', '100'), '29.00');

    // Clássico 0.58 * 100: no IEEE 754 resulta em 57.99999999999999
    assert.strictEqual(calculateItemTotal('0.58', '100'), '58.00');

    // Clássico 1.14 * 100: no IEEE 754 resulta em 113.99999999999999
    assert.strictEqual(calculateItemTotal('1.14', '100'), '114.00');

    // Clássico 4.15 * 100: no IEEE 754 resulta em 414.99999999999994
    assert.strictEqual(calculateItemTotal('4.15', '100'), '415.00');

    // Clássico 1.005 * 100: no IEEE 754 resulta em 100.49999999999999
    assert.strictEqual(calculateItemTotal('1.005', '100'), '100.50');
  });

  it('2.2: Ausência de arredondamento prematuro de quantidade ou preço unitário', () => {
    // Se preço 1.2345 fosse prematuramente arredondado para 1.23 antes de multiplicar por 1000:
    // Preco truncado: 1.23 * 1000 = 1230.00
    // Preco exato: 1.2345 * 1000 = 1234.50 (diferença crítica de R$ 4,50!)
    const exactTotal = calculateItemTotal('1.2345', '1000');
    assert.strictEqual(exactTotal, '1234.50', 'Não pode haver arredondamento prematuro do preço unitário');

    // Se quantidade 12.3456 fosse prematuramente arredondada para 12.35 antes de multiplicar por 100:
    // Qtd truncada: 12.35 * 100 = 1235.00
    // Qtd exata: 12.3456 * 100 = 1234.56
    const exactQtyTotal = calculateItemTotal('100.00', '12.3456');
    assert.strictEqual(exactQtyTotal, '1234.56', 'Não pode haver arredondamento prematuro da quantidade');
  });

  it('2.3: Acumulador de lote grande com 1.000 itens (Zero Cumulative Float Drift)', () => {
    // Soma de 1.000 itens de R$ 0.10: deve ser estritamente 100.00
    const items1000 = Array.from({ length: 1000 }, (_, i) => ({
      id: `batch-${i}`,
      quantidade: '1.0000',
      valorUnitario: '0.1000',
      valorTotal: '0.10',
    }));

    const result = calculateInvoiceTotals(items1000, {});
    assert.strictEqual(result.valorProdutos, '100.00', '1.000 itens de 0.10 devem somar exatamente 100.00');
    assert.strictEqual(result.valorTotalNota, '100.00');

    // Soma de 500 itens com dízima e fração crítica 19.99 * 1 = 19.99
    const items500 = Array.from({ length: 500 }, (_, i) => ({
      id: `batch-19-${i}`,
      quantidade: '1.0000',
      valorUnitario: '19.9900',
      valorTotal: '19.99',
    }));
    // 500 * 19.99 = 9995.00
    const res500 = calculateInvoiceTotals(items500, {});
    assert.strictEqual(res500.valorProdutos, '9995.00');
  });
});

// ============================================================================
// SUITE 3: Negative Quantity Rejection, Non-Numeric & Zero Handling
// ============================================================================
describe('CHALLENGER 2 SUITE 3: Negative Quantity Rejection, Non-Numeric & Zero Traps', () => {

  it('3.1: Detecção precisa de valores negativos via isDecimalNegative', () => {
    assert.strictEqual(isDecimalNegative('-1'), true);
    assert.strictEqual(isDecimalNegative('-0.0001'), true);
    assert.strictEqual(isDecimalNegative('-123.4567'), true);
    assert.strictEqual(isDecimalNegative(' -50.00 '), true);
    assert.strictEqual(isDecimalNegative('-999999999.99'), true);

    // Valores não negativos
    assert.strictEqual(isDecimalNegative('0'), false);
    assert.strictEqual(isDecimalNegative('0.00'), false);
    assert.strictEqual(isDecimalNegative('0.0000'), false);
    assert.strictEqual(isDecimalNegative('-0'), false, '-0 é zero numérico, não negativo');
    assert.strictEqual(isDecimalNegative('-0.00'), false);
    assert.strictEqual(isDecimalNegative('0.0001'), false);
    assert.strictEqual(isDecimalNegative('1'), false);
  });

  it('3.2: Detecção de zero numérico via isDecimalZero sob múltiplas representações', () => {
    assert.strictEqual(isDecimalZero('0'), true);
    assert.strictEqual(isDecimalZero('0.0'), true);
    assert.strictEqual(isDecimalZero('0.00'), true);
    assert.strictEqual(isDecimalZero('0.0000'), true);
    assert.strictEqual(isDecimalZero('-0'), true);
    assert.strictEqual(isDecimalZero('+0'), true);
    assert.strictEqual(isDecimalZero('000.000'), true);
    assert.strictEqual(isDecimalZero(''), true);
    assert.strictEqual(isDecimalZero('   '), true);
    assert.strictEqual(isDecimalZero(null), true);
    assert.strictEqual(isDecimalZero(undefined), true);

    // Valores não zero
    assert.strictEqual(isDecimalZero('0.0001'), false);
    assert.strictEqual(isDecimalZero('-0.0001'), false);
    assert.strictEqual(isDecimalZero('0.01'), false);
  });

  it('3.3: Resiliência a entradas não numéricas, malformadas ou corrompidas', () => {
    // Strings arbitrárias retornam '0'
    assert.strictEqual(cleanDecimalString('abc'), '0');
    assert.strictEqual(cleanDecimalString('---'), '0');
    assert.strictEqual(cleanDecimalString('NaN'), '0');
    assert.strictEqual(cleanDecimalString('Infinity'), '0');
    assert.strictEqual(cleanDecimalString(null), '0');
    assert.strictEqual(cleanDecimalString(undefined), '0');

    // Múltiplos pontos decimais (preserva o primeiro, concatena o restante)
    assert.strictEqual(cleanDecimalString('12.34.56'), '12.3456');

    // calculateItemTotal com entradas corruptas não lança exceção e retorna '0.00'
    assert.strictEqual(calculateItemTotal('invalido', '10.0000'), '0.00');
    assert.strictEqual(calculateItemTotal('10.0000', 'invalido'), '0.00');
    assert.strictEqual(calculateItemTotal(null, undefined), '0.00');
    assert.strictEqual(calculateItemTotal('', ''), '0.00');
  });

  it('3.4: Simulação da validação da tela de conferência (handleSave / handleMarkAsChecked)', () => {
    // Função simulando a lógica exata de validação em handleSave de conferencia/page.jsx
    function validateConferenceItems(items) {
      for (const item of items) {
        if (isDecimalNegative(item.quantidade)) {
          return { valid: false, error: `Item ${item.id}: A quantidade não pode ser negativa.` };
        }
        if (isDecimalNegative(item.valorUnitario)) {
          return { valid: false, error: `Item ${item.id}: O valor unitário não pode ser negativo.` };
        }
        if (isDecimalZero(item.quantidade) || String(item.quantidade).trim() === '') {
          return { valid: false, error: `Item ${item.id}: A quantidade deve ser maior que zero.` };
        }
      }
      return { valid: true };
    }

    // Caso 1: Quantidade negativa deve ser bloqueada
    const itemsWithNegQty = [
      { id: 'it-1', quantidade: '10.0000', valorUnitario: '50.00' },
      { id: 'it-2', quantidade: '-2.5000', valorUnitario: '30.00' },
    ];
    const resNegQty = validateConferenceItems(itemsWithNegQty);
    assert.strictEqual(resNegQty.valid, false);
    assert.match(resNegQty.error, /não pode ser negativa/);

    // Caso 2: Preço unitário negativo deve ser bloqueado
    const itemsWithNegPrice = [
      { id: 'it-1', quantidade: '10.0000', valorUnitario: '-15.00' },
    ];
    const resNegPrice = validateConferenceItems(itemsWithNegPrice);
    assert.strictEqual(resNegPrice.valid, false);
    assert.match(resNegPrice.error, /valor unitário não pode ser negativo/);

    // Caso 3: Quantidade zero deve ser bloqueada
    const itemsWithZeroQty = [
      { id: 'it-1', quantidade: '0.0000', valorUnitario: '50.00' },
    ];
    const resZeroQty = validateConferenceItems(itemsWithZeroQty);
    assert.strictEqual(resZeroQty.valid, false);
    assert.match(resZeroQty.error, /maior que zero/);

    // Caso 4: Quantidade vazia deve ser bloqueada
    const itemsWithEmptyQty = [
      { id: 'it-1', quantidade: '   ', valorUnitario: '50.00' },
    ];
    const resEmptyQty = validateConferenceItems(itemsWithEmptyQty);
    assert.strictEqual(resEmptyQty.valid, false);
    assert.match(resEmptyQty.error, /maior que zero/);

    // Caso 5: Itens válidos com 4 casas decimais passam com sucesso
    const validItems = [
      { id: 'it-1', quantidade: '123.4567', valorUnitario: '25.5000' },
      { id: 'it-2', quantidade: '0.0001', valorUnitario: '10000.0000' },
    ];
    const resValid = validateConferenceItems(validItems);
    assert.strictEqual(resValid.valid, true);
  });
});

// ============================================================================
// SUITE 4: Ancillary Expenses Preservation (Freight, Insurance, Other Expenses, Discounts)
// ============================================================================
describe('CHALLENGER 2 SUITE 4: Ancillary Expense Preservation Arithmetic', () => {

  it('4.1: Aplicação estrita da fórmula SEFAZ: Total = Produtos - Desconto + Frete + Seguro + Outras Despesas', () => {
    const items = [
      { id: '1', quantidade: '10.0000', valorUnitario: '1000.00', valorTotal: '10000.00' },
      { id: '2', quantidade: '5.0000', valorUnitario: '2000.00', valorTotal: '10000.00' },
    ];

    const totaisOriginais = {
      valorDesconto: '1500.00',
      valorFrete: '2500.00',
      valorSeguro: '450.00',
      outrasDespesas: '350.00',
    };

    const result = calculateInvoiceTotals(items, totaisOriginais);

    // Total Produtos = 10000 + 10000 = 20000.00
    // Total Nota = 20000.00 - 1500.00 + 2500.00 + 450.00 + 350.00 = 21800.00
    assert.strictEqual(result.valorProdutos, '20000.00');
    assert.strictEqual(result.valorDesconto, '1500.00');
    assert.strictEqual(result.valorFrete, '2500.00');
    assert.strictEqual(result.valorSeguro, '450.00');
    assert.strictEqual(result.outrasDespesas, '350.00');
    assert.strictEqual(result.valorTotalNota, '21800.00');

    // Aliases em inglês também devem estar populados identicamente
    assert.strictEqual(result.totalProducts, '20000.00');
    assert.strictEqual(result.totalDiscount, '1500.00');
    assert.strictEqual(result.totalFreight, '2500.00');
    assert.strictEqual(result.totalInsurance, '450.00');
    assert.strictEqual(result.totalOtherExpenses, '350.00');
    assert.strictEqual(result.totalInvoice, '21800.00');
  });

  it('4.2: Despesas acessórias que superam o valor total dos produtos', () => {
    // Produto simbólico de R$ 50,00 com frete aéreo internacional de R$ 15.000,00
    const items = [
      { id: 'it-micro', quantidade: '1.0000', valorUnitario: '50.00', valorTotal: '50.00' },
    ];

    const expenses = {
      valorFrete: '15000.00',
      valorSeguro: '1200.00',
      outrasDespesas: '800.00',
      valorDesconto: '0.00',
    };

    const res = calculateInvoiceTotals(items, expenses);
    // 50.00 + 15000.00 + 1200.00 + 800.00 = 17050.00
    assert.strictEqual(res.valorProdutos, '50.00');
    assert.strictEqual(res.valorTotalNota, '17050.00');
  });

  it('4.3: Nota sem despesas acessórias (todos os campos zerados ou ausentes)', () => {
    const items = [
      { id: 'it-1', quantidade: '2.0000', valorUnitario: '125.50', valorTotal: '251.00' },
    ];

    const resEmpty = calculateInvoiceTotals(items, {});
    assert.strictEqual(resEmpty.valorProdutos, '251.00');
    assert.strictEqual(resEmpty.valorFrete, '0.00');
    assert.strictEqual(resEmpty.valorSeguro, '0.00');
    assert.strictEqual(resEmpty.outrasDespesas, '0.00');
    assert.strictEqual(resEmpty.valorDesconto, '0.00');
    assert.strictEqual(resEmpty.valorTotalNota, '251.00');
  });

  it('4.4: Despesas com centavos fracionários aplicando Half-Up sem perda de centavos', () => {
    const items = [
      { id: '1', quantidade: '1.0000', valorUnitario: '1000.00', valorTotal: '1000.00' },
    ];

    // Frete com 3 casas: 123.455 => 123.46
    // Seguro com 3 casas: 67.894 => 67.89
    // Desconto com 3 casas: 10.555 => 10.56
    // Outras com 3 casas: 5.551 => 5.55
    const options = {
      valorFrete: '123.455',
      valorSeguro: '67.894',
      valorDesconto: '10.555',
      outrasDespesas: '5.551',
    };

    const res = calculateInvoiceTotals(items, options);
    assert.strictEqual(res.valorFrete, '123.46');
    assert.strictEqual(res.valorSeguro, '67.89');
    assert.strictEqual(res.valorDesconto, '10.56');
    assert.strictEqual(res.outrasDespesas, '5.55');

    // Total = 1000.00 - 10.56 + 123.46 + 67.89 + 5.55 = 1186.34
    assert.strictEqual(res.valorTotalNota, '1186.34');
  });
});

// ============================================================================
// SUITE 5: Conference Edit & Save Workflow with Repository Integration
// ============================================================================
describe('CHALLENGER 2 SUITE 5: End-to-End Conference Edit & Save Invariant Testing', () => {

  beforeEach(async () => {
    setCustomStorage(null);
    sessionInvoices.clear();
    await invoiceRepository.resetDemoData();
  });

  it('5.1: Edição e salvamento em demo-01 NUNCA apaga frete, seguro e outras despesas', async () => {
    const initial = await invoiceRepository.findById('demo-01');
    assert.ok(initial, 'demo-01 deve existir');

    // Baseline original de despesas
    assert.strictEqual(initial.totais.valorFrete, '5000.00', 'Frete original deve ser 5000.00');
    assert.strictEqual(initial.totais.valorSeguro, '1200.00', 'Seguro original deve ser 1200.00');
    assert.strictEqual(initial.totais.outrasDespesas, '500.00', 'Outras despesas original deve ser 500.00');
    assert.strictEqual(initial.totais.valorDesconto, '0.00', 'Desconto original deve ser 0.00');
    assert.strictEqual(initial.totais.valorProdutos, '284500.00');
    assert.strictEqual(initial.totais.valorTotalNota, '291200.00');

    // Simula a edição da tabela de conferência em d1-1:
    // Altera quantidade de 500.0000 para 600.0000
    // d1-1: preco unitario = 25.5000
    // Novo total d1-1: 600.0000 * 25.5000 = 15300.00 (antes era 12750.00, acréscimo de +2550.00)
    const items = initial.itens.map((it) => {
      if (it.id === 'd1-1') {
        const valorOriginal = it.valorOriginal || {
          quantidade: it.quantidade,
          valorUnitario: it.valorUnitario,
          valorTotal: it.valorTotal,
        };
        const updatedTotal = calculateItemTotal(it.valorUnitario, '600.0000');
        return {
          ...it,
          quantidade: '600.0000',
          valorTotal: updatedTotal,
          modificado: true,
          valorOriginal,
        };
      }
      return it;
    });

    // Padrão de salvamento de app/documentos/[id]/conferencia/page.jsx (handleSave)
    const newTotals = calculateInvoiceTotals(items, initial.totais || {});
    const updatedInvoice = {
      ...initial,
      itens: items,
      totais: {
        ...initial.totais,
        valorProdutos: newTotals.valorProdutos,
        valorTotalProdutos: newTotals.valorProdutos,
        valorFrete: newTotals.valorFrete,
        valorSeguro: newTotals.valorSeguro,
        valorDesconto: newTotals.valorDesconto,
        outrasDespesas: newTotals.outrasDespesas,
        valorTotalNota: newTotals.valorTotalNota,
      },
    };

    await invoiceRepository.update('demo-01', updatedInvoice);

    // Recarrega o documento diretamente do repositório para verificar persistência
    const reloaded = await invoiceRepository.findById('demo-01');
    assert.ok(reloaded);

    // 1. O item d1-1 foi atualizado corretamente
    const item1 = reloaded.itens.find((it) => it.id === 'd1-1');
    assert.strictEqual(item1.quantidade, '600.0000');
    assert.strictEqual(item1.valorTotal, '15300.00');
    assert.strictEqual(item1.modificado, true);
    assert.strictEqual(item1.valorOriginal.quantidade, '500.0000');

    // 2. Os produtos foram recalculados com precisão: 284500.00 + 2550.00 = 287050.00
    assert.strictEqual(reloaded.totais.valorProdutos, '287050.00');
    assert.strictEqual(reloaded.totais.valorTotalProdutos, '287050.00');

    // 3. DESPESAS ACESSÓRIAS TOTALMENTE PRESERVADAS (NÃO FORAM ZERADAS OU APAGADAS)
    assert.strictEqual(reloaded.totais.valorFrete, '5000.00', 'Frete NÃO pode ser apagado');
    assert.strictEqual(reloaded.totais.valorSeguro, '1200.00', 'Seguro NÃO pode ser apagado');
    assert.strictEqual(reloaded.totais.outrasDespesas, '500.00', 'Outras despesas NÃO podem ser apagadas');
    assert.strictEqual(reloaded.totais.valorDesconto, '0.00', 'Desconto NÃO pode ser corrompido');

    // 4. Total da NF-e reflete exatamente a fórmula SEFAZ:
    // 287050.00 - 0.00 + 5000.00 + 1200.00 + 500.00 = 293750.00
    assert.strictEqual(reloaded.totais.valorTotalNota, '293750.00');
    assert.notStrictEqual(
      reloaded.totais.valorTotalNota,
      reloaded.totais.valorProdutos,
      'Total da nota NÃO pode ser reduzido à mera soma dos produtos!'
    );
  });

  it('5.2: Edição em documento real de XML em memória de sessão preserva despesas e isolamento', async () => {
    // Carrega e analisa fixture real de exportação com frete, seguro e outras despesas
    const rawXml = readFileSync(resolve(FIXTURES_DIR, 'synthetic_nfe_export_proc.xml'), 'utf-8');
    const parsed = parseNFeXml(rawXml);
    assert.strictEqual(parsed.success, true);

    const mapped = mapXmlToInvoice(parsed.data);
    assert.strictEqual(mapped.isRealImport, true);
    assert.strictEqual(mapped.isDemo, false);

    // Salva na sessão volátil do repositório
    await invoiceRepository.create(mapped);

    const docId = mapped.id;
    assert.strictEqual(sessionInvoices.has(docId), true, 'Deve residir em sessionInvoices');

    const sessionDoc = await invoiceRepository.findById(docId);
    assert.strictEqual(sessionDoc.totais.valorFrete, '5000.00');
    assert.strictEqual(sessionDoc.totais.valorSeguro, '1200.00');
    assert.strictEqual(sessionDoc.totais.outrasDespesas, '500.00');
    assert.strictEqual(sessionDoc.totais.valorProdutos, '166750.00');
    assert.strictEqual(sessionDoc.totais.valorTotalNota, '173450.00');

    // Edita o item 1 com quantidade fracionária de 4 casas: de 500.0000 para 500.1234
    // Preço unitário: 25.5000
    // Novo valor total do item 1: 500.1234 * 25.5000 = 12753.1467 => 12753.15
    const editedItems = sessionDoc.itens.map((it) => {
      if (it.item === 1) {
        return {
          ...it,
          quantidade: '500.1234',
          valorTotal: calculateItemTotal(it.valorUnitario, '500.1234'),
          modificado: true,
          valorOriginal: {
            quantidade: it.quantidade,
            valorUnitario: it.valorUnitario,
            valorTotal: it.valorTotal,
          },
        };
      }
      return it;
    });

    // Salva no repositório com preservação de totais
    const recalcTotals = calculateInvoiceTotals(editedItems, sessionDoc.totais);
    await invoiceRepository.update(docId, {
      itens: editedItems,
      totais: {
        ...sessionDoc.totais,
        ...recalcTotals,
      },
    });

    // Recarrega da sessão
    const reloadedSessionDoc = await invoiceRepository.findById(docId);

    // Verificações de integridade
    assert.strictEqual(reloadedSessionDoc.isRealImport, true);
    assert.strictEqual(reloadedSessionDoc.totais.valorFrete, '5000.00');
    assert.strictEqual(reloadedSessionDoc.totais.valorSeguro, '1200.00');
    assert.strictEqual(reloadedSessionDoc.totais.outrasDespesas, '500.00');

    // Produtos: item 1 (12753.15) + item 2 (154000.00) = 166753.15
    assert.strictEqual(reloadedSessionDoc.totais.valorProdutos, '166753.15');
    // Total NF-e: 166753.15 + 5000.00 + 1200.00 + 500.00 = 173453.15
    assert.strictEqual(reloadedSessionDoc.totais.valorTotalNota, '173453.15');

    // Zero poluição do localStorage
    const persisted = localStorageService.load(STORAGE_KEYS.INVOICES, []);
    assert.strictEqual(
      persisted.some((inv) => inv.id === docId),
      false,
      'Documento real da sessão NUNCA deve vazar para o LocalStorage'
    );
  });

  it('5.3: Reversibilidade absoluta via restauração unitária e em lote', async () => {
    const doc = await invoiceRepository.findById('demo-01');
    const originalTotalNota = doc.totais.valorTotalNota;
    const originalTotalProd = doc.totais.valorProdutos;

    // Mutamos 3 itens
    let currentItems = doc.itens.map((it, idx) => {
      if (idx < 3) {
        return {
          ...it,
          quantidade: decimalAdd(it.quantidade, '10.0000'),
          valorTotal: calculateItemTotal(it.valorUnitario, decimalAdd(it.quantidade, '10.0000')),
          modificado: true,
          valorOriginal: {
            quantidade: it.quantidade,
            valorUnitario: it.valorUnitario,
            valorTotal: it.valorTotal,
          },
        };
      }
      return it;
    });

    // Verifica divergência
    let intermediateTotals = calculateInvoiceTotals(currentItems, doc.totais);
    assert.notStrictEqual(intermediateTotals.valorTotalNota, originalTotalNota);

    // Simula handleRestoreItem no item 0
    currentItems = currentItems.map((it, idx) => {
      if (idx === 0 && it.valorOriginal) {
        return {
          ...it,
          ...it.valorOriginal,
          modificado: false,
          valorOriginal: null,
        };
      }
      return it;
    });

    // Simula handleRestoreAll nos demais
    currentItems = currentItems.map((it) => {
      if (!it.valorOriginal) return it;
      return {
        ...it,
        ...it.valorOriginal,
        modificado: false,
        valorOriginal: null,
      };
    });

    // Recalcula totais após restauração completa
    const restoredTotals = calculateInvoiceTotals(currentItems, doc.totais);
    assert.strictEqual(restoredTotals.valorProdutos, originalTotalProd, 'Produtos devem voltar ao baseline exato');
    assert.strictEqual(restoredTotals.valorTotalNota, originalTotalNota, 'Total da NF deve voltar ao baseline exato');
    assert.strictEqual(restoredTotals.valorFrete, doc.totais.valorFrete);
    assert.strictEqual(restoredTotals.valorSeguro, doc.totais.valorSeguro);
    assert.strictEqual(restoredTotals.outrasDespesas, doc.totais.outrasDespesas);
  });

  it('5.4: Estresse de flip-flop e mutações consecutivas preservando despesas acessórias', async () => {
    // 20 mutações consecutivas alternando quantidades
    const doc = await invoiceRepository.findById('demo-01');
    const initialFreight = doc.totais.valorFrete;
    const initialInsurance = doc.totais.valorSeguro;
    const initialOther = doc.totais.outrasDespesas;

    for (let cycle = 1; cycle <= 20; cycle++) {
      const targetItemId = `d1-${(cycle % 8) + 1}`;
      const randomIncrement = `${(cycle * 0.1234).toFixed(4)}`;

      await invoiceRepository.updateItem('demo-01', targetItemId, {
        quantidade: decimalAdd('50.0000', randomIncrement),
      });

      const current = await invoiceRepository.findById('demo-01');
      // Verificação em todas as iterações
      assert.strictEqual(current.totais.valorFrete, initialFreight, `Ciclo ${cycle}: Frete corrompido`);
      assert.strictEqual(current.totais.valorSeguro, initialInsurance, `Ciclo ${cycle}: Seguro corrompido`);
      assert.strictEqual(current.totais.outrasDespesas, initialOther, `Ciclo ${cycle}: Outras despesas corrompidas`);

      const expectedInvoiceTotal = decimalAdd(
        decimalAdd(
          decimalSubtract(current.totais.valorProdutos, current.totais.valorDesconto || '0.00', 2),
          initialFreight,
          2
        ),
        decimalAdd(initialInsurance, initialOther, 2),
        2
      );
      assert.strictEqual(
        current.totais.valorTotalNota,
        expectedInvoiceTotal,
        `Ciclo ${cycle}: Total da NF divergiu da fórmula SEFAZ`
      );
    }
  });
});
