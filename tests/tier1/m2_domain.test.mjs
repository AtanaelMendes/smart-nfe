/**
 * SmartNFe — Tier 1 Test Suite: Milestone 2 Core Domain Services & Calculations
 *
 * Verificações cobertas:
 * 1. Motor de Aritmética Decimal Pura (decimal.js): BigInt scaling, Half-Up ABNT NBR 5891, IEEE 754 immunity.
 * 2. Agregação Fiscal de Totais (invoiceTotals.js): Linhas de produtos e fórmulas SEFAZ.
 * 3. Divisão e Desmembramento Fiscal (divisionMath.js): Balanço de saldos e validação em lote.
 * 4. Persistência Local Versionada (localStorageService.js): Envelope 1.0.0, fallback de memória, recuperação de corrupção.
 * 5. Repositório Assíncrono de Invoices (invoiceRepository.js): CRUD, recálculo, snapshots, validador fiscal e reset.
 * 6. Repositório de Notas Preparadas (preparedInvoiceRepository.js): Gestão de desmembramentos.
 * 7. Formatadores Numéricos e Correções (numbers.js, currency.js, dates.js): Moeda BRL sem inflação 100x e datas estritas.
 * 8. Mocks Calibrados (mockInvoices.js): demo-02 com 25 itens íntegros e demo-05 com 342.000,00 matching prep-01 e prep-02.
 * 9. DataTable Resiliência: data={null} e safeData.
 *
 * Execução: node --test tests/tier1/m2_domain.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT_DIR = process.cwd();

// Domain imports
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
  normalizeDecimal,
  cleanDecimalString,
  parseDecimal as parseDecimalBigInt,
} from '../../app/lib/calculations/decimal.js';

import {
  calculateItemTotal,
  calculateInvoiceTotals,
} from '../../app/lib/calculations/invoiceTotals.js';

import {
  calculateRemainingBalance,
  validateDivisionBatch,
} from '../../app/lib/calculations/divisionMath.js';

import {
  localStorageService,
  STORAGE_SCHEMA_VERSION,
  STORAGE_KEYS,
  save,
  load,
  reset,
  resetAll,
  has,
  getInfo,
} from '../../app/lib/storage/localStorageService.js';

import { invoiceRepository } from '../../app/features/invoiceRepository.js';
import { preparedInvoiceRepository } from '../../app/features/preparedInvoiceRepository.js';

import {
  formatQuantity,
  formatDecimal,
  parseDecimal,
} from '../../app/lib/formatters/numbers.js';

import { formatBRL, parseBRL, formatNumberBRL } from '../../app/lib/formatters/currency.js';
import { formatDateBR, formatDateTimeBR } from '../../app/lib/formatters/dates.js';
import { getStatusLabel, getStatusBadgeClass } from '../../app/lib/formatters/status.js';

import {
  MOCK_INVOICES,
  MOCK_PREPARED_INVOICES,
  getMockInvoices,
  getMockInvoiceById,
  getDashboardKPIs,
} from '../../app/lib/data/mockInvoices.js';

// ============================================================================
// SUITE 1: Motor de Aritmética Decimal Pura (decimal.js)
// ============================================================================
describe('M2 Calculations: Decimal Math Engine (decimal.js)', () => {
  it('Elimina erro clássico de ponto flutuante IEEE 754 (0.1 + 0.2 = 0.30)', () => {
    const sum = decimalAdd('0.1', '0.2', 2);
    assert.strictEqual(sum, '0.30');
    assert.notStrictEqual(sum, '0.30000000000000004');
  });

  it('Suporta adições com diferentes escalas decimais sem perda de precisão', () => {
    assert.strictEqual(decimalAdd('100.5', '25.255'), '125.755');
    assert.strictEqual(decimalAdd('100.5', '25.255', 2), '125.76');
    assert.strictEqual(decimalAdd('-50.00', '20.00'), '-30.00');
  });

  it('Subtração decimal precisa', () => {
    assert.strictEqual(decimalSubtract('100.00', '25.50'), '74.50');
    assert.strictEqual(decimalSubtract('25.50', '100.00'), '-74.50');
    assert.strictEqual(decimalSubtract('0.3', '0.1', 2), '0.20');
  });

  it('Multiplicação decimal exata e arredondamento ABNT NBR 5891 Half-Up', () => {
    // 0.003 * 333.3333 = 0.9999999 -> arredonda para 1.00
    assert.strictEqual(decimalMultiply('0.003', '333.3333', 2), '1.00');

    // 0.001 * 333.3333 = 0.3333333 -> arredonda para 0.33
    assert.strictEqual(decimalMultiply('0.001', '333.3333', 2), '0.33');

    // Caso real demo-01 item 8: 686.6667 * 30.0000 = 20600.0010 -> arredonda para 20600.00
    assert.strictEqual(decimalMultiply('686.6667', '30.0000', 2), '20600.00');

    // Multiplicação sem escala preserva produto exato de escalas
    assert.strictEqual(decimalMultiply('1.25', '2.5'), '3.125');
  });

  it('Divisão decimal precisa com tratamento de dízimas e resto Half-Up', () => {
    assert.strictEqual(decimalDivide('10', '3', 2), '3.33');
    assert.strictEqual(decimalDivide('20', '3', 2), '6.67');
    assert.strictEqual(decimalDivide('1', '8', 3), '0.125');
    assert.strictEqual(decimalDivide('1', '8', 2), '0.13'); // 0.125 arredonda para cima 0.13
  });

  it('Divisão por zero degrada com resiliência retornando zeros formatados sem Infinity', () => {
    assert.strictEqual(decimalDivide('100', '0', 2), '0.00');
    assert.strictEqual(decimalDivide('0', '0', 4), '0.0000');
  });

  it('roundDecimal aplica Half-Up estrito', () => {
    assert.strictEqual(roundDecimal('10.555', 2), '10.56');
    assert.strictEqual(roundDecimal('10.554', 2), '10.55');
    assert.strictEqual(roundDecimal('10.5555', 3), '10.556');
    assert.strictEqual(roundDecimal('-10.555', 2), '-10.56');
  });

  it('Comparações e predicados decimais', () => {
    assert.strictEqual(decimalCompare('10.50', '10.5'), 0);
    assert.strictEqual(decimalCompare('10.51', '10.50'), 1);
    assert.strictEqual(decimalCompare('10.49', '10.50'), -1);

    assert.strictEqual(isDecimalZero('0.0000'), true);
    assert.strictEqual(isDecimalZero('-0.00'), true);
    assert.strictEqual(isDecimalZero('0.01'), false);

    assert.strictEqual(isDecimalNegative('-0.01'), true);
    assert.strictEqual(isDecimalNegative('0.00'), false);
    assert.strictEqual(isDecimalNegative('10.00'), false);

    assert.strictEqual(decimalAbs('-1250.50'), '1250.50');
    assert.strictEqual(decimalAbs('1250.50'), '1250.50');
  });

  it('Sanitização robusta de entradas brasileiras (R$, pontuação, espaços)', () => {
    assert.strictEqual(cleanDecimalString('R$ 1.250,50'), '1250.50');
    assert.strictEqual(cleanDecimalString(' 500,25 '), '500.25');
    assert.strictEqual(cleanDecimalString(null), '0');
    assert.strictEqual(cleanDecimalString(undefined), '0');
    assert.strictEqual(cleanDecimalString(''), '0');
  });
});

// ============================================================================
// SUITE 2: Agregação Fiscal de Totais (invoiceTotals.js)
// ============================================================================
describe('M2 Calculations: Invoice Totals Engine (invoiceTotals.js)', () => {
  it('calculateItemTotal calcula preço * quantidade com 2 casas decimais', () => {
    assert.strictEqual(calculateItemTotal('125.5000', '10.0000'), '1255.00');
    assert.strictEqual(calculateItemTotal('686.6667', '30.0000'), '20600.00');
    assert.strictEqual(calculateItemTotal(null, '10.0000'), '0.00');
    assert.strictEqual(calculateItemTotal('10.0000', null), '0.00');
  });

  it('calculateInvoiceTotals consolida itens e fórmula SEFAZ (Produtos - Desconto + Frete + Seguro + Outras)', () => {
    const items = [
      { valorTotal: '1000.00' },
      { valorTotal: '2000.00' },
      { valorUnitario: '50.00', quantidade: '10.00' }, // 500.00
    ];

    const totals = calculateInvoiceTotals(items, {
      discount: '200.00',
      freight: '150.00',
      insurance: '50.00',
      otherExpenses: '25.00',
    });

    assert.strictEqual(totals.totalProducts, '3500.00');
    assert.strictEqual(totals.totalDiscount, '200.00');
    assert.strictEqual(totals.totalFreight, '150.00');
    assert.strictEqual(totals.totalInsurance, '50.00');
    assert.strictEqual(totals.totalOtherExpenses, '25.00');
    // 3500 - 200 + 150 + 50 + 25 = 3525.00
    assert.strictEqual(totals.totalInvoice, '3525.00');
    assert.strictEqual(totals.valorTotalNota, '3525.00');
  });

  it('calculateInvoiceTotals suporta assinatura posicional legada', () => {
    const items = [{ valorTotal: '500.00' }];
    const totals = calculateInvoiceTotals(items, '50.00', '20.00', '10.00', '5.00');

    assert.strictEqual(totals.totalProducts, '500.00');
    assert.strictEqual(totals.totalDiscount, '50.00');
    // 500 - 50 + 20 + 10 + 5 = 485.00
    assert.strictEqual(totals.totalInvoice, '485.00');
  });

  it('Verifica consistência fiscal exata do cenário demo-01', () => {
    const d1 = MOCK_INVOICES.find((i) => i.id === 'demo-01');
    assert.ok(d1);

    const calculated = calculateInvoiceTotals(d1.itens, {
      discount: d1.totais.valorDesconto,
      freight: d1.totais.valorFrete,
      insurance: d1.totais.valorSeguro,
      otherExpenses: d1.totais.outrasDespesas,
    });

    assert.strictEqual(calculated.totalProducts, d1.totais.valorProdutos);
    assert.strictEqual(calculated.totalInvoice, d1.totais.valorTotalNota);
    assert.strictEqual(calculated.totalInvoice, '291200.00');
  });
});

// ============================================================================
// SUITE 3: Divisão e Desmembramento Fiscal (divisionMath.js)
// ============================================================================
describe('M2 Calculations: Division & Distribution Engine (divisionMath.js)', () => {
  it('calculateRemainingBalance identifica balanceamento perfeito (status: ok)', () => {
    const result = calculateRemainingBalance('500.0000', ['250.0000', '250.0000']);
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.isOk, true);
    assert.strictEqual(result.hasRemaining, false);
    assert.strictEqual(result.hasExcess, false);
    assert.strictEqual(result.balanceStr, '0.0000');
    assert.strictEqual(result.totalAllocatedStr, '500.0000');
  });

  it('calculateRemainingBalance identifica sobra / saldo não alocado (status: remaining)', () => {
    const result = calculateRemainingBalance('500.0000', ['200.0000', '100.0000']);
    assert.strictEqual(result.status, 'remaining');
    assert.strictEqual(result.hasRemaining, true);
    assert.strictEqual(result.isOk, false);
    assert.strictEqual(result.hasExcess, false);
    assert.strictEqual(result.balanceStr, '200.0000');
    assert.strictEqual(result.totalAllocatedStr, '300.0000');
  });

  it('calculateRemainingBalance identifica excesso impeditivo (status: excess)', () => {
    const result = calculateRemainingBalance('500.0000', ['300.0000', '250.0000']);
    assert.strictEqual(result.status, 'excess');
    assert.strictEqual(result.hasExcess, true);
    assert.strictEqual(result.isOk, false);
    assert.strictEqual(result.balanceStr, '-50.0000');
    assert.strictEqual(result.totalAllocatedStr, '550.0000');
  });

  it('calculateRemainingBalance aceita objetos no array de alocações', () => {
    const result = calculateRemainingBalance('100.0000', [
      { quantidade: '40.0000' },
      { quantity: '60.0000' },
    ]);
    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.balanceStr, '0.0000');
  });

  it('validateDivisionBatch audita o lote de divisão e gera relatório analítico', () => {
    const originalItems = [
      { id: 'item-1', item: 1, codigo: 'SOJA', quantidade: '100.0000', valorUnitario: '400.0000' },
      { id: 'item-2', item: 2, codigo: 'MILHO', quantidade: '200.0000', valorUnitario: '350.0000' },
    ];

    const destinationNotes = [
      {
        id: 'dest-1',
        numero: 'DEST-01',
        itens: [
          { id: 'item-1', quantidade: '50.0000' },
          { id: 'item-2', quantidade: '100.0000' },
        ],
      },
      {
        id: 'dest-2',
        numero: 'DEST-02',
        itens: [
          { id: 'item-1', quantidade: '50.0000' },
          { id: 'item-2', quantidade: '100.0000' },
        ],
      },
    ];

    const report = validateDivisionBatch(originalItems, destinationNotes);
    assert.strictEqual(report.isValid, true);
    assert.strictEqual(report.canSave, true);
    assert.strictEqual(report.isBalanced, true);
    assert.strictEqual(report.hasExcess, false);
    assert.strictEqual(report.summary.balancedCount, 2);
    assert.strictEqual(report.notesSummary.length, 2);

    // Nota 1: 50*400 (20.000) + 100*350 (35.000) = 55.000,00
    assert.strictEqual(report.notesSummary[0].totalProducts, '55000.00');
    assert.strictEqual(report.notesSummary[1].totalProducts, '55000.00');
  });

  it('validateDivisionBatch bloqueia canSave quando há excesso', () => {
    const originalItems = [
      { id: 'item-1', item: 1, codigo: 'SOJA', quantidade: '100.0000', valorUnitario: '400.0000' },
    ];
    const destinationNotes = [
      {
        id: 'dest-1',
        itens: [{ id: 'item-1', quantidade: '120.0000' }],
      },
    ];

    const report = validateDivisionBatch(originalItems, destinationNotes);
    assert.strictEqual(report.canSave, false);
    assert.strictEqual(report.hasExcess, true);
    assert.strictEqual(report.summary.excessCount, 1);
  });
});

// ============================================================================
// SUITE 4: Persistência Local Versionada (localStorageService.js)
// ============================================================================
describe('M2 Storage: LocalStorage Service (localStorageService.js)', () => {
  beforeEach(() => {
    resetAll();
  });

  it('STORAGE_SCHEMA_VERSION é estritamente "1.0.0"', () => {
    assert.strictEqual(STORAGE_SCHEMA_VERSION, '1.0.0');
    assert.strictEqual(localStorageService.STORAGE_SCHEMA_VERSION, '1.0.0');
  });

  it('save persiste dados envelopados com versão e timestamp', () => {
    const testKey = 'smartnfe_test_envelope';
    const payload = { testNumber: 42, text: 'SmartNFe' };
    const saved = save(testKey, payload);
    assert.strictEqual(saved, true);

    const info = getInfo(testKey);
    assert.strictEqual(info.exists, true);
    assert.strictEqual(info.version, '1.0.0');
    assert.strictEqual(typeof info.timestamp, 'number');
    assert.strictEqual(info.isCurrentSchema, true);

    const loaded = load(testKey);
    assert.deepStrictEqual(loaded, payload);
  });

  it('load descarta dados com versão incompatível de schema e retorna fallback', () => {
    const testKey = 'smartnfe_test_mismatch';
    // Simula envelope com versão desatualizada
    const fakeBackend = {
      getItem: () => JSON.stringify({ version: '0.9.0', timestamp: Date.now(), data: { old: true } }),
      setItem: () => {},
      removeItem: () => {},
    };
    localStorageService.setCustomStorage(fakeBackend);

    const loaded = load(testKey, { fallback: true });
    assert.deepStrictEqual(loaded, { fallback: true });

    // Restaura backend
    localStorageService.setCustomStorage(null);
  });

  it('load se recupera de JSON corrompido sem disparar exceção', () => {
    const testKey = 'smartnfe_test_corrupt';
    const fakeBackend = {
      getItem: () => '{ invalid json string ...',
      setItem: () => {},
      removeItem: () => {},
    };
    localStorageService.setCustomStorage(fakeBackend);

    assert.doesNotThrow(() => {
      const loaded = load(testKey, 'recovered_fallback');
      assert.strictEqual(loaded, 'recovered_fallback');
    });

    localStorageService.setCustomStorage(null);
  });

  it('reset e resetAll restauram os valores de fábrica registrados', () => {
    // Carrega dados de NF-e
    const invoices = load(STORAGE_KEYS.INVOICES);
    assert.ok(Array.isArray(invoices));
    assert.strictEqual(invoices.length, 5);

    // Modifica
    save(STORAGE_KEYS.INVOICES, [{ id: 'modified' }]);
    assert.strictEqual(load(STORAGE_KEYS.INVOICES).length, 1);

    // Reseta individual
    reset(STORAGE_KEYS.INVOICES);
    const restored = load(STORAGE_KEYS.INVOICES);
    assert.strictEqual(restored.length, 5);
  });
});

// ============================================================================
// SUITE 5: Repositório Assíncrono de Invoices (invoiceRepository.js)
// ============================================================================
describe('M2 Repositories: Invoice Repository (invoiceRepository.js)', () => {
  beforeEach(async () => {
    await invoiceRepository.resetDemoData();
  });

  it('list() retorna os 5 cenários mockados com estrutura válida', async () => {
    const invoices = await invoiceRepository.list();
    assert.strictEqual(Array.isArray(invoices), true);
    assert.strictEqual(invoices.length, 5);
    assert.strictEqual(invoices.total, 5);
  });

  it('list(filters) filtra com precisão por query, status e tipo', async () => {
    // Busca por termo
    const agro = await invoiceRepository.list({ query: 'Agroexport' });
    assert.strictEqual(agro.length, 1);
    assert.strictEqual(agro[0].id, 'demo-01');

    // Filtro por tipo PDF
    const pdfs = await invoiceRepository.list({ type: 'PDF' });
    assert.strictEqual(pdfs.length, 1);
    assert.strictEqual(pdfs[0].id, 'demo-02');

    // Filtro por status
    const inconsistent = await invoiceRepository.list({ status: 'com_inconsistencias' });
    assert.strictEqual(inconsistent.length, 1);
    assert.strictEqual(inconsistent[0].id, 'demo-04');
  });

  it('list(filters) suporta envelope de paginação formal', async () => {
    const paged = await invoiceRepository.list({ page: 1, pageSize: 2, returnPagination: true });
    assert.strictEqual(paged.data.length, 2);
    assert.strictEqual(paged.total, 5);
    assert.strictEqual(paged.page, 1);
    assert.strictEqual(paged.pageSize, 2);
    assert.strictEqual(paged.totalPages, 3);
  });

  it('findById() retorna o documento isolado por clone ou null se inexistente', async () => {
    const inv = await invoiceRepository.findById('demo-01');
    assert.ok(inv);
    assert.strictEqual(inv.id, 'demo-01');

    const nonExistent = await invoiceRepository.findById('invalido');
    assert.strictEqual(nonExistent, null);
  });

  it('updateItem() recalcula a linha, preserva valorOriginal e atualiza totais da NF-e', async () => {
    const original = await invoiceRepository.findById('demo-01');
    const firstItem = original.itens[0];
    const originalQty = firstItem.quantidade;

    // Altera quantidade e preço
    const updated = await invoiceRepository.updateItem('demo-01', firstItem.id, {
      quantidade: '600.0000',
      valorUnitario: '30.0000',
    });

    const itemModificado = updated.itens.find((i) => i.id === firstItem.id);
    assert.strictEqual(itemModificado.modificado, true);
    // 600 * 30 = 18000.00
    assert.strictEqual(itemModificado.valorTotal, '18000.00');
    // Snapshot imutável preservado
    assert.ok(itemModificado.valorOriginal);
    assert.strictEqual(itemModificado.valorOriginal.quantidade, originalQty);

    // Totais recalculados
    assert.notStrictEqual(updated.totais.valorProdutos, original.totais.valorProdutos);
  });

  it('getValidationIssues() retorna apontamentos fiscais de demo-04 com regras dinâmicas', async () => {
    const issues = await invoiceRepository.getValidationIssues('demo-04');
    assert.ok(Array.isArray(issues));
    assert.ok(issues.length >= 4, 'Deve conter pelo menos 4 apontamentos');

    const hasCfop = issues.some((i) => i.campo === 'cfop');
    const hasMath = issues.some((i) => i.campo === 'valorTotal');
    const hasNcm = issues.some((i) => i.campo === 'ncm');
    const hasUnit = issues.some((i) => i.campo === 'unidade');

    assert.strictEqual(hasCfop, true, 'Deve apontar CFOP inválido para exportação');
    assert.strictEqual(hasMath, true, 'Deve apontar divergência matemática de item');
    assert.strictEqual(hasNcm, true, 'Deve apontar NCM inválido');
    assert.strictEqual(hasUnit, true, 'Deve apontar unidade aduaneira divergente');
  });

  it('resetInvoice() restaura uma única nota sem afetar as demais', async () => {
    await invoiceRepository.updateItem('demo-01', 'd1-1', { quantidade: '9999.0000' });
    const modified = await invoiceRepository.findById('demo-01');
    assert.strictEqual(modified.itens[0].quantidade, '9999.0000');

    await invoiceRepository.resetInvoice('demo-01');
    const restored = await invoiceRepository.findById('demo-01');
    assert.strictEqual(restored.itens[0].quantidade, '500.0000');
  });
});

// ============================================================================
// SUITE 6: Repositório de Notas Preparadas (preparedInvoiceRepository.js)
// ============================================================================
describe('M2 Repositories: Prepared Invoice Repository (preparedInvoiceRepository.js)', () => {
  beforeEach(async () => {
    await preparedInvoiceRepository.resetDemoData();
  });

  it('list() retorna baseline de 2 notas preparadas (prep-01 e prep-02)', async () => {
    const preps = await preparedInvoiceRepository.list();
    assert.strictEqual(preps.length, 2);
    assert.strictEqual(preps[0].parentInvoiceId, 'demo-05');
  });

  it('create() cadastra nova nota preparada e delete() remove com sucesso', async () => {
    const created = await preparedInvoiceRepository.create({
      parentInvoiceId: 'demo-01',
      numero: '000.145.892-A',
      valorTotalNota: '50000.00',
      quantidadeItens: 4,
    });

    assert.ok(created.id);
    assert.strictEqual(created.status, 'preparado');

    const listAfterCreate = await preparedInvoiceRepository.list();
    assert.strictEqual(listAfterCreate.length, 3);

    const found = await preparedInvoiceRepository.findById(created.id);
    assert.ok(found);
    assert.strictEqual(found.numero, '000.145.892-A');

    const deleted = await preparedInvoiceRepository.delete(created.id);
    assert.strictEqual(deleted, true);

    const listAfterDelete = await preparedInvoiceRepository.list();
    assert.strictEqual(listAfterDelete.length, 2);
  });
});

// ============================================================================
// SUITE 7: Central de Formatadores (numbers.js, currency.js, dates.js)
// ============================================================================
describe('M2 Formatters: Numbers, Currency & Dates', () => {
  it('formatQuantity formata quantidades fiscais até 4 decimais', () => {
    assert.strictEqual(formatQuantity('500.1234', 4), '500,1234');
    assert.strictEqual(formatQuantity(500), '500');
    assert.strictEqual(formatQuantity('0.0010', 4), '0,001');
    assert.strictEqual(formatQuantity(null), '0');
  });

  it('formatDecimal formata números com separador de milhar e casas decimais fixas', () => {
    assert.strictEqual(formatDecimal(1250.5, 2), '1.250,50');
    assert.strictEqual(formatDecimal('1250.555', 2), '1.250,56');
    assert.strictEqual(formatDecimal(0, 2), '0,00');
  });

  it('parseBRL aceita formato BR e formato decimal padrão sem inflacionar 100x', () => {
    // Formato BR com vírgula
    assert.strictEqual(parseBRL('1.250,50'), 1250.5);
    assert.strictEqual(parseBRL('R$ 1.250,50'), 1250.5);

    // Formato decimal simples com ponto — ZERO INFLAÇÃO DE 100X
    assert.strictEqual(parseBRL('1250.50'), 1250.5);
    assert.strictEqual(parseBRL('284500.00'), 284500);

    // Casos nulos e inválidos
    assert.strictEqual(parseBRL(null), 0);
    assert.strictEqual(parseBRL(''), 0);
  });

  it('formatDateBR rejeita estritamente rollover de calendário (ex: 2026-99-99 e 2026-02-31 retornam "-")', () => {
    assert.strictEqual(formatDateBR('2026-10-15'), '15/10/2026');
    assert.strictEqual(formatDateBR('2026-99-99'), '-');
    assert.strictEqual(formatDateBR('2026-02-31'), '-');
    assert.strictEqual(formatDateBR('2025-02-29'), '-'); // 2025 não é bissexto
    assert.strictEqual(formatDateBR('2024-02-29'), '29/02/2024'); // 2024 é bissexto
    assert.strictEqual(formatDateBR(null), '-');
    assert.strictEqual(formatDateBR('data_invalida'), '-');
  });

  it('formatDateTimeBR valida data/hora estrita e formata localized', () => {
    const formatted = formatDateTimeBR('2026-10-15T14:30:00Z');
    assert.match(formatted, /^15\/10\/2026/);
    assert.strictEqual(formatDateTimeBR('2026-99-99T14:30:00Z'), '-');
  });
});

// ============================================================================
// SUITE 8: Integridade Matemática dos 5 Cenários Calibrados
// ============================================================================
describe('M2 Mocks: Calibrated Invoices & Baseline Integrity', () => {
  it('demo-02: 100% dos 25 itens possuem quantidade * valorUnitario === valorTotal (0 divergências)', () => {
    const d2 = MOCK_INVOICES.find((i) => i.id === 'demo-02');
    assert.ok(d2);
    assert.strictEqual(d2.itens.length, 25);

    let mismatches = 0;
    let sumTotal = '0.00';

    for (const item of d2.itens) {
      const calc = calculateItemTotal(item.valorUnitario, item.quantidade);
      if (calc !== item.valorTotal) {
        mismatches++;
      }
      sumTotal = decimalAdd(sumTotal, item.valorTotal, 2);
    }

    assert.strictEqual(mismatches, 0, 'Zero divergências nos 25 itens de demo-02');
    assert.strictEqual(sumTotal, '148750.00');
    assert.strictEqual(d2.totais.valorProdutos, '148750.00');
    assert.strictEqual(d2.totais.valorTotalNota, '148750.00');
  });

  it('demo-05: item 15 possui 74 * 380 = 28.120,00 e soma dos 15 itens confere 342.000,00', () => {
    const d5 = MOCK_INVOICES.find((i) => i.id === 'demo-05');
    assert.ok(d5);
    assert.strictEqual(d5.itens.length, 15);

    const item15 = d5.itens.find((i) => i.id === 'd5-15');
    assert.strictEqual(item15.valorTotal, '28120.00');

    let sum15 = '0.00';
    for (const item of d5.itens) {
      const lineCalc = calculateItemTotal(item.valorUnitario, item.quantidade);
      assert.strictEqual(lineCalc, item.valorTotal, `Item ${item.id} deve ter cálculo exato`);
      sum15 = decimalAdd(sum15, item.valorTotal, 2);
    }

    assert.strictEqual(sum15, '342000.00');
    assert.strictEqual(d5.totais.valorProdutos, '342000.00');
    assert.strictEqual(d5.totais.valorTotalNota, '342000.00');

    // Confere com notas preparadas
    const preps = MOCK_PREPARED_INVOICES.filter((p) => p.parentInvoiceId === 'demo-05');
    assert.strictEqual(preps.length, 2);
    const sumPrep = preps.reduce((acc, p) => decimalAdd(acc, p.valorTotalNota, 2), '0.00');
    assert.strictEqual(sumPrep, '342000.00');
  });
});

// ============================================================================
// SUITE 9: Resiliência do Componente DataTable (safeData)
// ============================================================================
describe('M2 Components: DataTable Null Safety Protection', () => {
  const dtPath = resolve(ROOT_DIR, 'app/components/table/DataTable.jsx');
  assert.ok(existsSync(dtPath), 'DataTable.jsx deve existir');

  const { transformSync } = require('next/dist/build/swc');
  const dtSource = readFileSync(dtPath, 'utf-8');
  const stubbedSource = dtSource.replace(
    /import InputText from ['"].*InputText['"];/,
    `const InputText = ({ value, onChange, placeholder, id }) => React.createElement('input', {
      id: id,
      value: value,
      placeholder: placeholder,
      onChange: (e) => onChange && onChange(id, e.target.value)
    });`
  );

  const { code } = transformSync(stubbedSource, {
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'classic' } },
    },
    module: { type: 'commonjs' },
  });

  const moduleEnv = { exports: {} };
  const compileFn = new Function('require', 'module', 'exports', 'React', code);
  compileFn(require, moduleEnv, moduleEnv.exports, React);
  const DataTable = moduleEnv.exports.default || moduleEnv.exports;

  it('DataTable não quebra ao receber data={null}', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: null,
          columns: [{ key: 'col1', label: 'Coluna 1' }],
        })
      );
      assert.match(html, /Exibindo 0 de 0 registros/);
    });
  });

  it('DataTable não quebra ao receber data={undefined}', () => {
    assert.doesNotThrow(() => {
      const html = renderToStaticMarkup(
        React.createElement(DataTable, {
          data: undefined,
          columns: [{ key: 'col1', label: 'Coluna 1' }],
        })
      );
      assert.match(html, /Exibindo 0 de 0 registros/);
    });
  });

  it('DataTable renderiza linhas corretamente quando data é um array válido', () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable, {
        data: [{ id: '1', nome: 'Item Teste' }],
        columns: [{ key: 'nome', label: 'Nome' }],
      })
    );
    assert.match(html, /Item Teste/);
    assert.match(html, /Exibindo 1 de 1 registros/);
  });
});
