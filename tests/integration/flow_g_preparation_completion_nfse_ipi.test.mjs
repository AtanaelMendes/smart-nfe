/**
 * SmartNFe — Integration: Conclusão N:M, Importação NFS-e e IPI nos totais
 *
 * Cobre as entregas Prioritárias 0, 1.1–1.2 e 4.2 do plano
 * `docs/plano-campos-e-preparacoes.md`:
 * - Detecção de layout dos oito XMLs reais e importação de NFS-e.
 * - Preservação de valores emitidos de NFS-e (dedução, retenções, líquido, IBS/CBS).
 * - IPI incorporado ao total recalculado (NF-e 14853).
 * - Conclusão da preparação materializando exatamente os destinos em notas preparadas,
 *   com idempotência, validação e reabertura.
 *
 * Execução: node --no-warnings --test tests/integration/flow_g_preparation_completion_nfse_ipi.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { detectXmlLayout } from '../../app/features/xml/xmlLayoutDetector.js';
import { parseNFSeXml } from '../../app/features/xml/nfseXmlParser.js';
import { mapNFSeToDocument } from '../../app/features/xml/nfseToDocumentMapper.js';
import { parseNFeXml } from '../../app/features/xml/nfeXmlParser.js';
import { mapXmlToInvoice } from '../../app/features/xml/xmlToInvoiceMapper.js';
import { calculateInvoiceTotals } from '../../app/lib/calculations/invoiceTotals.js';

import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { preparationRepository, sessionPreparations } from '../../app/features/preparationRepository.js';
import { preparedInvoiceRepository, sessionPreparedInvoices } from '../../app/features/preparedInvoiceRepository.js';
import {
  completePreparation,
  validatePreparationCompletion,
  reopenPreparation,
  deletePreparedInvoiceWithLinks,
  PreparationCompletionError,
} from '../../app/features/preparationCompletionService.js';
import { localStorageService } from '../../app/lib/storage/localStorageService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NF_DIR = join(__dirname, '..', 'nfes');

function readSample(dir, filename) {
  return readFileSync(join(NF_DIR, dir, filename), 'utf8');
}

const NFSE_FILES = readdirSync(join(NF_DIR, 'NF-SERVICOS'));
const NFE_FILES = readdirSync(join(NF_DIR, 'NF-PRODUTOS -ODELO-55'));

function findNfseByNumber(nfseNumber) {
  for (const file of NFSE_FILES) {
    const xml = readSample('NF-SERVICOS', file);
    const parsed = parseNFSeXml(xml);
    if (parsed.success && String(parsed.data.nNFSe) === String(nfseNumber)) return parsed.data;
  }
  return null;
}

beforeEach(() => {
  invoiceRepository.clearSession();
  preparationRepository.clearSession();
  preparedInvoiceRepository.clearSession();
  sessionInvoices.clear();
  sessionPreparations.clear();
  sessionPreparedInvoices.clear();
  localStorageService.resetAll();
});

describe('Flow G — Detecção de layout e importação NFS-e', () => {
  it('G.1: reconhece os oito XMLs (4 NF-e + 4 NFS-e) sem rejeitar NFS-e', () => {
    const tipos = [];
    for (const file of NFE_FILES) {
      const layout = detectXmlLayout(readSample('NF-PRODUTOS -ODELO-55', file));
      assert.strictEqual(layout.success, true);
      tipos.push(layout.tipoFiscal);
    }
    for (const file of NFSE_FILES) {
      const layout = detectXmlLayout(readSample('NF-SERVICOS', file));
      assert.strictEqual(layout.success, true);
      tipos.push(layout.tipoFiscal);
    }
    assert.strictEqual(tipos.filter((t) => t === 'NFE').length, 4);
    assert.strictEqual(tipos.filter((t) => t === 'NFSE').length, 4);
  });

  it('G.2: NFS-e 41880 preserva dedução, base e ISS e não desconta a dedução do líquido', () => {
    const data = findNfseByNumber('41880');
    assert.ok(data, 'NFS-e 41880 deve ser parseada');
    assert.strictEqual(data.prest.cpf, '00768232961');
    assert.strictEqual(data.valoresDps.vServ, '159.88');
    assert.strictEqual(data.valoresInf.vCalcDR, '28.36');
    assert.strictEqual(data.valoresInf.vBC, '131.52');
    assert.strictEqual(data.valoresInf.vISSQN, '3.95');
    assert.strictEqual(data.valoresInf.vLiq, '159.88');

    const doc = mapNFSeToDocument(data);
    assert.strictEqual(doc.valores.valorLiquido, '159.88');
    assert.strictEqual(doc.valores.valorDeducoes, '28.36');
    assert.ok(doc.ibsCbs.apurado, 'IBS/CBS apurado deve ser preservado');
    assert.strictEqual(doc.ibsCbs.apurado.valores?.vBC ?? doc.ibsCbs.apurado.vBC, '155.93');
  });

  it('G.3: NFS-e 14 preserva bruto, total retido e líquido sem subtrair PIS/COFINS indevidamente', () => {
    const data = findNfseByNumber('14');
    assert.ok(data);
    const doc = mapNFSeToDocument(data);
    assert.strictEqual(doc.valores.valorBruto, '23671.54');
    assert.strictEqual(doc.valores.valorTotalRetido, '1155.80');
    assert.strictEqual(doc.valores.valorLiquido, '22515.74');
    assert.strictEqual(doc.valores.retencoesFederais.ir, '55.07');
    assert.strictEqual(doc.valores.retencoesFederais.csll, '1100.73');
    assert.strictEqual(doc.valores.retencoesFederais.pis, '0.00');
    assert.strictEqual(doc.valores.retencoesFederais.cofins, '0.00');
    assert.strictEqual(doc.tributos.federais.pis, '710.15');
    assert.strictEqual(doc.ibsCbs.declarado.cClassTrib, '200029');
  });

  it('G.4: NFS-e 8 e 45 preservam pTotTribSN=6.00 e não criam IBS/CBS inexistente', () => {
    for (const numero of ['8', '45']) {
      const data = findNfseByNumber(numero);
      assert.ok(data, `NFS-e ${numero} deve ser parseada`);
      const doc = mapNFSeToDocument(data);
      assert.strictEqual(doc.tributos.percentuaisAproximados?.simplesNacional, '6.00');
      assert.equal(doc.ibsCbs.apurado, null);
      assert.equal(doc.valores.aliquotaISS, '0.00');
    }
  });
});

describe('Flow G — IPI nos totais', () => {
  it('G.5: NF-e 14853 reconcilia vNF incluindo IPI de 708,48', () => {
    const xml = readSample(
      'NF-PRODUTOS -ODELO-55',
      NFE_FILES.find((f) => f.includes('14853')) || NFE_FILES[1]
    );
    const parsed = parseNFeXml(xml);
    assert.strictEqual(parsed.success, true);
    const invoice = mapXmlToInvoice(parsed.data);
    assert.strictEqual(invoice.totais.valorIPI, '708.48');
    assert.strictEqual(invoice.totais.valorTotalNota, '22507.92');

    const recalculated = calculateInvoiceTotals(invoice.itens, {
      valorDesconto: invoice.totais.valorDesconto,
      valorFrete: invoice.totais.valorFrete,
      valorSeguro: invoice.totais.valorSeguro,
      outrasDespesas: invoice.totais.outrasDespesas,
      valorIPI: invoice.totais.valorIPI,
    });
    assert.strictEqual(recalculated.valorTotalNota, '22507.92');
  });
});

async function seedInvoices() {
  await invoiceRepository.create({
    id: 'invA', numero: '000.001.111', serie: '1', chaveAcesso: 'A', isRealImport: true, isDemo: false,
    emitente: { razaoSocial: 'Fornecedor A', cnpj: '11111111000111', uf: 'SP' },
    destinatario: { nome: 'Dest', pais: 'Brasil', paisCodigo: 'BR' },
    itens: [
      { id: 'it-1', item: 1, codigo: 'X', descricao: 'Produto X', ncm: '11111111', cfop: '5102', unidade: 'UN', quantidade: '10', valorUnitario: '10' },
      { id: 'it-2', item: 2, codigo: 'Y', descricao: 'Produto Y', ncm: '22222222', cfop: '5102', unidade: 'UN', quantidade: '5', valorUnitario: '20' },
    ],
    totais: { valorFrete: '2.00', valorSeguro: '0', valorDesconto: '0', outrasDespesas: '0' },
  });
  await invoiceRepository.create({
    id: 'invB', numero: '000.002.222', serie: '1', chaveAcesso: 'B', isRealImport: true, isDemo: false,
    emitente: { razaoSocial: 'Fornecedor A', cnpj: '11111111000111', uf: 'SP' },
    destinatario: { nome: 'Dest', pais: 'Brasil', paisCodigo: 'BR' },
    itens: [
      { id: 'it-9', item: 1, codigo: 'Z', descricao: 'Produto Z', ncm: '33333333', cfop: '5102', unidade: 'UN', quantidade: '4', valorUnitario: '50' },
    ],
    totais: { valorFrete: '4.00', valorSeguro: '0', valorDesconto: '0', outrasDespesas: '0' },
  });
}

describe('Flow G — Conclusão N:M materializa notas preparadas', () => {
  it('G.6: conclui N:M, publica exatamente os destinos e é idempotente', async () => {
    await seedInvoices();
    const prep = await preparationRepository.create({
      id: 'prep-test', numero: 'PREP-TEST', status: 'draft', isRealImport: true,
      sourceInvoiceIds: ['invA', 'invB'],
      clienteExportacao: { id: 'c1', name: 'Cliente Exterior', country: 'Estados Unidos', foreignId: 'US-1' },
      destinos: [{ id: 'd1', nome: 'D1' }, { id: 'd2', nome: 'D2' }],
      allocations: {
        'invA__it-1__d1': { quantity: '10', destinationUnitPrice: '10' },
        'invB__it-9__d1': { quantity: '2', destinationUnitPrice: '50' },
        'invB__it-9__d2': { quantity: '2', destinationUnitPrice: '50' },
      },
    });

    const validation = await validatePreparationCompletion(prep);
    assert.strictEqual(validation.isValid, true);

    const result = await completePreparation('prep-test');
    assert.strictEqual(result.alreadyCompleted, false);
    assert.strictEqual(result.preparedInvoices.length, 2);
    assert.strictEqual(result.preparation.status, 'completed');

    const d1 = result.preparedInvoices.find((n) => n.destinationId === 'd1');
    const d2 = result.preparedInvoices.find((n) => n.destinationId === 'd2');
    assert.strictEqual(d1.valorProdutos, '200.00');
    assert.strictEqual(d1.valorFrete, '4.00');
    assert.strictEqual(d1.valorTotalNota, '204.00');
    assert.strictEqual(d2.valorProdutos, '100.00');
    assert.strictEqual(d2.valorTotalNota, '102.00');
    assert.deepStrictEqual(d1.sourceInvoiceIds.sort(), ['invA', 'invB']);
    // Vínculo à preparação e dados de rastreio do item
    assert.strictEqual(d1.preparationId, 'prep-test');
    assert.ok(d1.itens.every((it) => it.sourceInvoiceId && it.sourceItemId));

    // Publicação consultada pela listagem
    const listed = await preparedInvoiceRepository.list({ preparationId: 'prep-test' });
    assert.strictEqual(listed.length, 2);

    // Dupla conclusão não duplica
    const second = await completePreparation('prep-test');
    assert.strictEqual(second.alreadyCompleted, true);
    assert.strictEqual(second.preparedInvoices.length, 2);
    assert.strictEqual(sessionPreparedInvoices.size, 2);
  });

  it('G.7: exclusão de uma nota reabre a preparação quando não restam notas', async () => {
    await seedInvoices();
    await preparationRepository.create({
      id: 'prep-del', numero: 'PREP-DEL', status: 'draft', isRealImport: true,
      sourceInvoiceIds: ['invB'],
      clienteExportacao: { name: 'C', country: 'US' },
      destinos: [{ id: 'd1', nome: 'D1' }],
      allocations: { 'invB__it-9__d1': { quantity: '4', destinationUnitPrice: '50' } },
    });
    const result = await completePreparation('prep-del');
    assert.strictEqual(result.preparedInvoices.length, 1);

    await deletePreparedInvoiceWithLinks(result.preparedInvoices[0].id);
    const prepAfter = await preparationRepository.findById('prep-del');
    assert.strictEqual(prepAfter.status, 'active');
    assert.deepStrictEqual(prepAfter.preparedInvoiceIds, []);

    // Reabertura controlada limpa vínculos
    assert.strictEqual((await preparedInvoiceRepository.list({ preparationId: 'prep-del' })).length, 0);
  });

  it('G.8: bloqueia conclusão com destino vazio e alocação acima do saldo', async () => {
    await seedInvoices();
    const prep = await preparationRepository.create({
      id: 'prep-bad', numero: 'PREP-BAD', status: 'draft', isRealImport: true,
      sourceInvoiceIds: ['invA'],
      clienteExportacao: { name: 'C', country: 'US' },
      destinos: [{ id: 'd1', nome: 'D1' }, { id: 'd2', nome: 'Vazio' }],
      allocations: { 'invA__it-1__d1': { quantity: '999', destinationUnitPrice: '10' } },
    });

    const validation = await validatePreparationCompletion(prep);
    assert.strictEqual(validation.isValid, false);
    const codes = validation.errors.map((e) => e.code);
    assert.ok(codes.includes('EMPTY_DESTINATION'));
    assert.ok(codes.includes('EXCESS_ALLOCATION'));

    await assert.rejects(
      () => completePreparation('prep-bad'),
      (err) => err instanceof PreparationCompletionError && err.errors.length > 0
    );
    // Nada foi materializado
    assert.strictEqual(sessionPreparedInvoices.size, 0);
  });

  it('G.9: reabertura remove notas geradas e devolve status active', async () => {
    await seedInvoices();
    await preparationRepository.create({
      id: 'prep-reopen', numero: 'PREP-REOPEN', status: 'draft', isRealImport: true,
      sourceInvoiceIds: ['invB'],
      clienteExportacao: { name: 'C', country: 'US' },
      destinos: [{ id: 'd1', nome: 'D1' }],
      allocations: { 'invB__it-9__d1': { quantity: '4', destinationUnitPrice: '50' } },
    });
    await completePreparation('prep-reopen');
    assert.strictEqual(sessionPreparedInvoices.size, 1);

    await reopenPreparation('prep-reopen');
    const prep = await preparationRepository.findById('prep-reopen');
    assert.strictEqual(prep.status, 'active');
    assert.strictEqual(sessionPreparedInvoices.size, 0);
  });
});
