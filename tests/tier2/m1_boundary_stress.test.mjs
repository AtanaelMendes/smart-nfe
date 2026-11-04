/**
 * Adversarial & Boundary Stress Test Suite — Milestone 1
 * Stress-testing formatters, mock data baseline, and dashboard calculations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatBRL, parseBRL, formatNumberBRL } from '../../app/lib/formatters/currency.js';
import { formatDateBR, formatDateTimeBR } from '../../app/lib/formatters/dates.js';
import { getStatusLabel, getStatusColor, getStatusBadgeClass, getStatusBadge, getStatusDot } from '../../app/lib/formatters/status.js';
import {
  MOCK_INVOICES,
  MOCK_PREPARED_INVOICES,
  getMockInvoices,
  getMockInvoiceById,
  getMockPreparedInvoices,
  getDashboardKPIs,
} from '../../app/lib/data/mockInvoices.js';

describe('Adversarial Stress Test: Currency Formatter', () => {
  it('handles standard numbers and decimal strings', () => {
    assert.match(formatBRL(1250.5), /1\.250,50/);
    assert.match(formatBRL('1250.50'), /1\.250,50/);
    assert.match(formatBRL('1250,50'), /1\.250,50/);
    assert.match(formatBRL(0), /0,00/);
    assert.match(formatBRL('0'), /0,00/);
    assert.match(formatBRL('0.00'), /0,00/);
  });

  it('handles negative, large numbers, and boundary values', () => {
    const neg = formatBRL(-1250.5);
    assert.ok(neg.includes('1.250,50'), `Expected formatted number in ${neg}`);
    assert.ok(neg.includes('-'), `Expected negative sign in ${neg}`);

    const large = formatBRL(999999999.99);
    assert.match(large, /999\.999\.999,99/);
  });

  it('safely degrades on null, undefined, NaN, and non-numeric garbage', () => {
    assert.match(formatBRL(null), /0,00/);
    assert.match(formatBRL(undefined), /0,00/);
    assert.match(formatBRL(''), /0,00/);
    assert.match(formatBRL('   '), /0,00/);
    assert.match(formatBRL('invalid-string'), /0,00/);
    assert.match(formatBRL(NaN), /0,00/);
    assert.match(formatBRL(Infinity), /0,00/);
    assert.match(formatBRL(-Infinity), /0,00/);
  });

  it('parseBRL converts BRL strings to float and handles edge cases', () => {
    assert.strictEqual(parseBRL('R$ 1.250,50'), 1250.5);
    assert.strictEqual(parseBRL('1.250,50'), 1250.5);
    assert.strictEqual(parseBRL('R$ 0,00'), 0);
    assert.strictEqual(parseBRL(0), 0);
    assert.strictEqual(parseBRL(1250.5), 1250.5);
    assert.strictEqual(parseBRL(null), 0);
    assert.strictEqual(parseBRL(undefined), 0);
    assert.strictEqual(parseBRL(''), 0);
    assert.strictEqual(parseBRL('garbage'), 0);
  });

  it('formatNumberBRL handles decimals customization and invalid inputs', () => {
    assert.strictEqual(formatNumberBRL(1250.5, 2), '1.250,50');
    assert.strictEqual(formatNumberBRL('1250.5555', 4), '1.250,5555');
    assert.strictEqual(formatNumberBRL(null), '0,00');
    assert.strictEqual(formatNumberBRL('invalid'), '0,00');
  });
});

describe('Adversarial Stress Test: Date Formatter', () => {
  it('formats dates consistently regardless of local timezone', () => {
    assert.strictEqual(formatDateBR('2026-10-15'), '15/10/2026');
    assert.strictEqual(formatDateBR('2026-01-01'), '01/01/2026');
    assert.strictEqual(formatDateBR('2026-12-31'), '31/12/2026');
    assert.strictEqual(formatDateBR('2026-10-15T10:30:00Z'), '15/10/2026');
  });

  it('safely degrades on null, undefined, empty, and invalid dates', () => {
    assert.strictEqual(formatDateBR(null), '-');
    assert.strictEqual(formatDateBR(undefined), '-');
    assert.strictEqual(formatDateBR(''), '-');
    assert.strictEqual(formatDateBR('not-a-date'), '-');
    assert.strictEqual(formatDateBR('abc-de-fg'), '-');

    assert.strictEqual(formatDateTimeBR(null), '-');
    assert.strictEqual(formatDateTimeBR(undefined), '-');
    assert.strictEqual(formatDateTimeBR('invalid'), '-');
  });

  it('formatDateTimeBR produces valid localized date-time string', () => {
    const res = formatDateTimeBR('2026-10-15T14:30:00Z');
    assert.ok(res.includes('15/10/2026'), `Expected date in ${res}`);
    // pt-BR Intl outputs either "15/10/2026 11:30" or "15/10/2026, 11:30"
    assert.match(res, /\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}/);
  });
});

describe('Adversarial Stress Test: Status Formatter', () => {
  const KNOWN_STATUSES = [
    'pendente',
    'importado',
    'em_conferencia',
    'conferido',
    'dividido',
    'com_inconsistencias',
    'preparado',
  ];

  it('returns valid labels, colors, and dots for all defined statuses', () => {
    for (const status of KNOWN_STATUSES) {
      const label = getStatusLabel(status);
      assert.ok(typeof label === 'string' && label.length > 0, `Status ${status} has empty label`);
      const color = getStatusColor(status);
      assert.ok(typeof color === 'string' && color.includes('border-'), `Status ${status} missing border class`);
      const dot = getStatusDot(status);
      assert.ok(typeof dot === 'string' && dot.includes('bg-'), `Status ${status} missing dot bg class`);
      assert.strictEqual(getStatusBadgeClass(status), color);
      assert.strictEqual(getStatusBadge(status), color);
    }
  });

  it('gracefully falls back on unknown or nullish status keys', () => {
    assert.strictEqual(getStatusLabel('desconhecido_xyz'), 'desconhecido_xyz');
    assert.strictEqual(getStatusLabel(null), 'Desconhecido');
    assert.strictEqual(getStatusLabel(undefined), 'Desconhecido');
    assert.ok(getStatusColor('desconhecido_xyz').includes('bg-gray-100'));
    assert.strictEqual(getStatusDot('desconhecido_xyz'), 'bg-gray-400');
  });
});

describe('Adversarial Stress Test: Mock Data Baseline & KPIs', () => {
  it('all 5 mock invoices have consistent structure, unique IDs, and valid totals', () => {
    assert.strictEqual(MOCK_INVOICES.length, 5);

    const ids = MOCK_INVOICES.map(i => i.id);
    assert.strictEqual(new Set(ids).size, 5, 'IDs must be unique');

    for (const inv of MOCK_INVOICES) {
      assert.ok(inv.id.startsWith('demo-'), `ID must start with demo-: ${inv.id}`);
      assert.ok(inv.numero, `Missing numero in ${inv.id}`);
      assert.ok(inv.serie, `Missing serie in ${inv.id}`);
      assert.ok(inv.chaveAcesso && inv.chaveAcesso.length === 44, `Invalid chave de acesso in ${inv.id}`);
      assert.ok(['XML', 'PDF'].includes(inv.tipoDocumento), `Invalid tipoDocumento in ${inv.id}`);
      assert.ok(inv.emitente?.razaoSocial, `Missing emitente in ${inv.id}`);
      assert.ok(inv.destinatario?.nome, `Missing destinatario in ${inv.id}`);
      assert.ok(Array.isArray(inv.itens) && inv.itens.length > 0, `No itens in ${inv.id}`);
      assert.ok(inv.totais?.valorTotalNota, `Missing valorTotalNota in ${inv.id}`);

      // All items must have valid numerical string representations
      for (const item of inv.itens) {
        assert.ok(item.id, `Item missing ID in ${inv.id}`);
        assert.ok(item.codigo, `Item missing codigo in ${inv.id}`);
        assert.ok(item.descricao, `Item missing descricao in ${inv.id}`);
        assert.ok(item.ncm, `Item missing ncm in ${inv.id}`);
        assert.ok(item.cfop, `Item missing cfop in ${inv.id}`);
        assert.ok(item.unidade, `Item missing unidade in ${inv.id}`);
        assert.ok(!Number.isNaN(parseFloat(item.quantidade)), `Item invalid quantidade in ${inv.id}`);
        assert.ok(!Number.isNaN(parseFloat(item.valorUnitario)), `Item invalid valorUnitario in ${inv.id}`);
        assert.ok(!Number.isNaN(parseFloat(item.valorTotal)), `Item invalid valorTotal in ${inv.id}`);
      }
    }
  });

  it('demo-04 contains at least 3 distinct simulated fiscal errors/warnings', () => {
    const d4 = MOCK_INVOICES.find(i => i.id === 'demo-04');
    assert.ok(d4, 'demo-04 must exist');
    const itemsWithIssues = d4.itens.filter(i => i.inconsistencias && i.inconsistencias.length > 0);
    assert.ok(itemsWithIssues.length >= 3, `Expected at least 3 items with issues in demo-04, got ${itemsWithIssues.length}`);

    // Check CFOP error
    const cfopIssue = itemsWithIssues.find(i => i.inconsistencias.some(inc => inc.campo === 'cfop'));
    assert.ok(cfopIssue, 'Must contain CFOP inconsistency');

    // Check Math error
    const mathIssue = itemsWithIssues.find(i => i.inconsistencias.some(inc => inc.campo === 'valorTotal'));
    assert.ok(mathIssue, 'Must contain math divergence inconsistency');

    // Check NCM error
    const ncmIssue = itemsWithIssues.find(i => i.inconsistencias.some(inc => inc.campo === 'ncm'));
    assert.ok(ncmIssue, 'Must contain NCM inconsistency');
  });

  it('demo-05 contains repeated items across batches', () => {
    const d5 = MOCK_INVOICES.find(i => i.id === 'demo-05');
    assert.ok(d5, 'demo-05 must exist');
    assert.strictEqual(d5.itens.length, 15);
    const codes = d5.itens.map(i => i.codigo);
    const uniqueCodes = new Set(codes);
    assert.ok(uniqueCodes.size < codes.length, 'demo-05 must contain repeated item codes across batches');
  });

  it('getMockInvoiceById returns matching item or null', () => {
    assert.ok(getMockInvoiceById('demo-01') !== null);
    assert.strictEqual(getMockInvoiceById('demo-01').id, 'demo-01');
    assert.strictEqual(getMockInvoiceById('non-existent'), null);
  });

  it('getDashboardKPIs correctly aggregates invoice metrics', () => {
    const kpis = getDashboardKPIs();
    assert.strictEqual(kpis.totalNotas, 5);
    assert.strictEqual(kpis.totalProdutos, 110);
    assert.strictEqual(kpis.aguardandoValidacao, 2);
    assert.strictEqual(kpis.notasPreparadas, 2);
    assert.strictEqual(kpis.valorTotalDemonstrado, 1497050);
  });
});
