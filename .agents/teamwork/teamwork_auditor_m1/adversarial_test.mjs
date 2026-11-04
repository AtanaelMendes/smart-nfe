import assert from 'node:assert/strict';
import { formatBRL, parseBRL, formatNumberBRL } from '../../../app/lib/formatters/currency.js';
import { formatDateBR, formatDateTimeBR } from '../../../app/lib/formatters/dates.js';
import { getStatusLabel, getStatusColor, getStatusBadgeClass, getStatusDot } from '../../../app/lib/formatters/status.js';
import { MOCK_INVOICES, getMockInvoices, getMockInvoiceById, getDashboardKPIs } from '../../../app/lib/data/mockInvoices.js';

console.log('--- Testing Currency ---');
assert.strictEqual(formatBRL(null), 'R$ 0,00');
assert.strictEqual(formatBRL(undefined), 'R$ 0,00');
assert.strictEqual(formatBRL(''), 'R$ 0,00');
assert.strictEqual(formatBRL('abc'), 'R$ 0,00');
assert.strictEqual(formatBRL(NaN), 'R$ 0,00');
assert.strictEqual(formatBRL(Infinity), 'R$ 0,00');
assert.strictEqual(formatBRL(0).replace(/\s/g, ' '), 'R$ 0,00');
assert.strictEqual(formatBRL(1250.5).replace(/\s/g, ' '), 'R$ 1.250,50');
assert.strictEqual(formatBRL('1250,50').replace(/\s/g, ' '), 'R$ 1.250,50');
assert.strictEqual(formatBRL(1000000).replace(/\s/g, ' '), 'R$ 1.000.000,00');

assert.strictEqual(parseBRL(null), 0);
assert.strictEqual(parseBRL(undefined), 0);
assert.strictEqual(parseBRL(''), 0);
assert.strictEqual(parseBRL('abc'), 0);
assert.strictEqual(parseBRL('R$ 1.250,50'), 1250.5);
assert.strictEqual(parseBRL('1.250,50'), 1250.5);
assert.strictEqual(parseBRL(500), 500);

assert.strictEqual(formatNumberBRL(null), '0,00');
assert.strictEqual(formatNumberBRL('1250.50'), '1.250,50');
assert.strictEqual(formatNumberBRL('1250.555', 3), '1.250,555');

console.log('--- Testing Dates ---');
assert.strictEqual(formatDateBR(null), '-');
assert.strictEqual(formatDateBR(undefined), '-');
assert.strictEqual(formatDateBR(''), '-');
assert.strictEqual(formatDateBR('invalid'), '-');
assert.strictEqual(formatDateBR('2026-11-04'), '04/11/2026');
assert.strictEqual(formatDateBR(new Date(Date.UTC(2026, 10, 4))), '04/11/2026');

assert.strictEqual(formatDateTimeBR(null), '-');
assert.strictEqual(formatDateTimeBR(''), '-');
assert.strictEqual(formatDateTimeBR('invalid'), '-');

console.log('--- Testing Status ---');
assert.strictEqual(getStatusLabel('pendente'), 'Pendente');
assert.strictEqual(getStatusLabel('unknown_xyz'), 'unknown_xyz');
assert.ok(getStatusColor('conferido').includes('emerald'));
assert.ok(getStatusColor('unknown_xyz').includes('gray'));
assert.ok(getStatusDot('conferido').includes('emerald'));
assert.ok(getStatusDot('unknown_xyz').includes('gray'));

console.log('--- Testing Mock Data & KPIs ---');
const kpis = getDashboardKPIs();
assert.strictEqual(kpis.totalNotas, 5);
assert.strictEqual(kpis.totalProdutos, 110);
assert.strictEqual(kpis.aguardandoValidacao, 2);
assert.strictEqual(kpis.notasPreparadas, 2);
assert.strictEqual(kpis.valorTotalDemonstrado, 1497050);

const inv4 = getMockInvoiceById('demo-04');
assert.ok(inv4);
assert.strictEqual(inv4.itens.length, 12);
const issues = inv4.itens.filter(i => i.situacao === 'inconsistente');
assert.strictEqual(issues.length, 4);

console.log('ALL ADVERSARIAL STRESS TESTS PASSED CLEANLY!');
