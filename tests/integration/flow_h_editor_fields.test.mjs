/**
 * SmartNFe — Integration: Campos fiscais preservados nos editores / documentos
 *
 * Verifica a Prioridade 2 do plano: parser e mapper preservam identificação,
 * participantes (endereço completo), campos tributáveis do item (ICMS/CSOSN,
 * IPI, PIS, COFINS, IBS/CBS), transporte, cobrança e pagamento; e o motor de
 * documentos mantém o IPI no total recalculado.
 *
 * Execução: node --no-warnings --test tests/integration/flow_h_editor_fields.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseNFeXml } from '../../app/features/xml/nfeXmlParser.js';
import { mapXmlToInvoice } from '../../app/features/xml/xmlToInvoiceMapper.js';
import { documentRepository, sessionDocuments } from '../../app/features/documentRepository.js';
import { localStorageService } from '../../app/lib/storage/localStorageService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NF_DIR = join(__dirname, '..', 'nfes', 'NF-PRODUTOS -ODELO-55');
const NFE_FILES = readdirSync(NF_DIR);

function invoiceByNumber(numeroFragment) {
  const file = NFE_FILES.find((f) => f.includes(numeroFragment)) || NFE_FILES[0];
  const parsed = parseNFeXml(readFileSync(join(NF_DIR, file), 'utf8'));
  assert.strictEqual(parsed.success, true);
  return mapXmlToInvoice(parsed.data);
}

beforeEach(() => {
  sessionDocuments.clear();
  localStorageService.resetAll();
});

describe('Flow H — Contrato de campos fiscais de NF-e', () => {
  it('H.1: preserva identificação, endereços completos, transporte, cobrança e pagamento', () => {
    const inv = invoiceByNumber('14853');
    assert.strictEqual(inv.ide.indFinal, '0');
    assert.strictEqual(inv.ide.indPres, '9');
    assert.strictEqual(inv.ide.finNFe, '1');
    assert.strictEqual(inv.ide.modelo ?? inv.modelo, '55');

    assert.ok(inv.emitente.endereco);
    assert.strictEqual(inv.emitente.endereco.cep.length, 8);
    assert.strictEqual(inv.emitente.crt, '3');

    assert.ok(inv.destinatario.endereco);
    assert.ok(inv.destinatario.endereco.logradouro);
    assert.strictEqual(inv.destinatario.email, 'isadora.albino@mueller.ind.br');

    assert.strictEqual(inv.transporte.modalidadeFrete, '0');
    assert.ok(Array.isArray(inv.transporte.volumes));
    assert.ok(inv.cobranca?.fatura);
    assert.strictEqual(inv.cobranca.duplicatas.length >= 1, true);
    assert.ok(inv.pagamento?.detalhes.length >= 1);
  });

  it('H.2: preserva CSOSN/ICMS, IPI, PIS, COFINS e IBS/CBS por item', () => {
    const inv = invoiceByNumber('14853');
    const item = inv.itens[0];
    assert.strictEqual(item.cest, '2104700');
    assert.strictEqual(item.unidadeTributavel, 'PEÇ');
    assert.strictEqual(item.tributos.icms.cst, '00');
    assert.strictEqual(item.tributos.icms.modalidadeBase, '3');
    assert.strictEqual(item.tributos.ipi.cst, '50');
    assert.strictEqual(item.tributos.ipi.cEnq, '999');
    assert.strictEqual(item.tributos.ipi.vIPI, '502.62');
    assert.ok(item.tributos.pis.cst);
    assert.ok(item.tributos.cofins.cst);
    assert.ok(item.tributos.ibsCbs);
    assert.strictEqual(item.tributos.ibsCbs.cClassTrib, '000001');
    assert.strictEqual(item.tributos.ibsCbs.vIBS, '12.18');
    assert.strictEqual(item.tributos.ibsCbs.vCBS, '109.61');
  });

  it('H.3: NF-e com CSOSN preserva o código original (não converte para CST)', () => {
    const inv = invoiceByNumber('9762');
    const item = inv.itens[0];
    assert.strictEqual(item.tributos.icms.csosn, '102');
    assert.strictEqual(item.tributos.icms.cst, '102');
  });
});

describe('Flow H — IPI no motor de documentos (recálculo)', () => {
  it('H.4: create de NF-e manual soma IPI ao total e preserva valorIPI', async () => {
    const saved = await documentRepository.create({
      id: 'draft-nfe-ipi',
      documentType: 'NFE',
      origin: 'MANUAL',
      titulo: 'Teste IPI',
      isDemo: true,
      emitente: { razaoSocial: 'Emitente', cnpj: '11111111000111' },
      destinatario: { nome: 'Destinatário' },
      itens: [{ itemId: 'i1', item: 1, codigo: 'X', descricao: 'X', ncm: '11111111', cfop: '5101', unidade: 'UN', quantidade: '10', valorUnitario: '10', desconto: '0.00' }],
      totais: { valorFrete: '0.00', valorSeguro: '0.00', valorDesconto: '0.00', outrasDespesas: '0.00', valorIPI: '5.00' },
    });

    assert.strictEqual(saved.totais.valorProdutos, '100.00');
    assert.strictEqual(saved.totais.valorIPI, '5.00');
    assert.strictEqual(saved.totais.valorTotalNota, '105.00');
  });

  it('H.5: update preserva IPI configurado', async () => {
    await documentRepository.create({
      id: 'draft-nfe-ipi-2',
      documentType: 'NFE',
      isDemo: true,
      emitente: { razaoSocial: 'Emitente', cnpj: '11111111000111' },
      destinatario: { nome: 'Destinatário' },
      itens: [{ itemId: 'i1', item: 1, codigo: 'X', descricao: 'X', ncm: '11111111', cfop: '5101', unidade: 'UN', quantidade: '1', valorUnitario: '50', desconto: '0.00' }],
      totais: { valorFrete: '0.00', valorSeguro: '0.00', valorDesconto: '0.00', outrasDespesas: '0.00', valorIPI: '2.50' },
    });

    const updated = await documentRepository.update('draft-nfe-ipi-2', {
      totais: { valorFrete: '0.00', valorSeguro: '0.00', valorDesconto: '0.00', outrasDespesas: '0.00', valorIPI: '2.50' },
    });
    assert.strictEqual(updated.totais.valorIPI, '2.50');
    assert.strictEqual(updated.totais.valorTotalNota, '52.50');
  });
});
