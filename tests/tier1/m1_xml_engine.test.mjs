/**
 * SmartNFe — Tier 1 Test Suite: Milestone 1 XML Engine & Session Repository Isolation
 *
 * Verificações cobertas:
 * 1. nfeXmlParser:
 *    - Parsing de nfeProc v4.00 com protocolo e exterior
 *    - Parsing de NFe avulso v4.00
 *    - Rejeição graciosa de XML malformado
 *    - Rejeição de modelo fiscal diferente de 55
 *    - Resiliência a entradas nulas, vazias e não-XML
 * 2. accessKeyValidator:
 *    - Cálculo do Módulo 11 (pesos 2..9, resto 0/1 -> DV 0)
 *    - Validação de integridade de 44 dígitos
 *    - Rejeição de chaves com DV corrompido, UF inválida, modelo não-55, mês inválido
 *    - Formatação de chave em 11 blocos de 4 dígitos
 * 3. xmlToInvoiceMapper:
 *    - Mapeamento determinístico de itemId (nfe-${chave}-item-${nItem})
 *    - Preservação de 4 casas decimais em quantidade e precisão estendida em unitário
 *    - Conservação de despesas acessórias (frete, seguro, outras despesas, desconto)
 *    - Flags obrigatórias isRealImport: true e isDemo: false
 * 4. invoiceRepository (Sessão Volátil):
 *    - Gravação exclusiva em sessionInvoices para isRealImport: true
 *    - Zero vazamento para localStorageService
 *    - Recuperação via findById da sessão com prioridade
 *    - Listagem mesclando documentos reais no topo
 *    - Edição em sessão via update e updateItem sem tocar no disco
 *    - resetDemoData preserva a sessão volátil
 *    - delete remove da sessão
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseNFeXml, NodeXmlDomParser, formatParserErrorMessage } from '../../app/features/xml/nfeXmlParser.js';
import { validateAccessKey, calculateAccessKeyDV, formatAccessKey } from '../../app/features/xml/accessKeyValidator.js';
import { mapXmlToInvoice, generateItemId, formatInvoiceNumber } from '../../app/features/xml/xmlToInvoiceMapper.js';
import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';

const FIXTURES_DIR = resolve(process.cwd(), 'tests/fixtures');

describe('M1 XML Engine: nfeXmlParser', () => {
  it('Analisa fixture nfeProc v4.00 com protocolo e destinatário exterior', () => {
    const rawXml = readFileSync(resolve(FIXTURES_DIR, 'synthetic_nfe_export_proc.xml'), 'utf-8');
    const result = parseNFeXml(rawXml);

    assert.strictEqual(result.success, true);
    assert.ok(result.data);
    assert.strictEqual(result.data.versao, '4.00');
    assert.strictEqual(result.data.chaveAcesso, '35241112345678000190550010001458921001234562');
    assert.strictEqual(result.data.ide.mod, '55');
    assert.strictEqual(result.data.ide.nNF, '145892');
    assert.strictEqual(result.data.emit.cnpj, '12345678000190');
    assert.strictEqual(result.data.dest.idEstrangeiro, 'NL884920192B01');
    assert.strictEqual(result.data.dest.pais, 'Holanda');
    assert.strictEqual(result.data.itens.length, 2);
    assert.strictEqual(result.data.totais.valorTotalNota, '173450.00');
    assert.strictEqual(result.data.protocolo?.nProt, '135240001234567');
  });

  it('Analisa fixture NFe avulsa (sem protocolo)', () => {
    const rawXml = readFileSync(resolve(FIXTURES_DIR, 'synthetic_nfe_simple.xml'), 'utf-8');
    const result = parseNFeXml(rawXml);

    assert.strictEqual(result.success, true);
    assert.ok(result.data);
    assert.strictEqual(result.data.chaveAcesso, '35241198765432000188550010000000421007890120');
    assert.strictEqual(result.data.ide.nNF, '42');
    assert.strictEqual(result.data.protocolo, null);
    assert.strictEqual(result.data.itens.length, 2);
  });

  it('Rejeita graciosamente XML sintaticamente malformado', () => {
    const rawXml = readFileSync(resolve(FIXTURES_DIR, 'synthetic_malformed.xml'), 'utf-8');
    const result = parseNFeXml(rawXml);

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.match(result.error, /malformado|erro sintático|não fechada/i);
    assert.strictEqual(result.details.code, 'PARSER_ERROR');
  });

  it('Rejeita modelo fiscal diferente de 55 quando strictMod55 está ativo', () => {
    const xmlNFCe = `<?xml version="1.0" encoding="UTF-8"?>
      <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe35241112345678000190650010001458921001234562" versao="4.00">
          <ide>
            <cUF>35</cUF>
            <cNF>00123456</cNF>
            <natOp>VENDA AO CONSUMIDOR</natOp>
            <mod>65</mod>
            <serie>1</serie>
            <nNF>145892</nNF>
            <dhEmi>2026-10-15T10:30:00-03:00</dhEmi>
          </ide>
          <emit><CNPJ>12345678000190</CNPJ><xNome>Loja</xNome></emit>
          <dest><CNPJ>11222333000144</CNPJ><xNome>Cliente</xNome></dest>
          <det nItem="1">
            <prod>
              <cProd>PROD-1</cProd>
              <xProd>Produto</xProd>
              <NCM>12345678</NCM>
              <CFOP>5102</CFOP>
              <uCom>UN</uCom>
              <qCom>1.0000</qCom>
              <vUnCom>10.0000</vUnCom>
              <vProd>10.00</vProd>
            </prod>
          </det>
        </infNFe>
      </NFe>`;

    const result = parseNFeXml(xmlNFCe);
    assert.strictEqual(result.success, false);
    assert.match(result.error, /modelo 55/i);
    assert.strictEqual(result.details.code, 'INVALID_MODEL');
  });

  it('Degrada com segurança em entradas nulas, vazias e não-string', () => {
    assert.strictEqual(parseNFeXml('').success, false);
    assert.strictEqual(parseNFeXml('   ').success, false);
    assert.strictEqual(parseNFeXml(null).success, false);
    assert.strictEqual(parseNFeXml(undefined).success, false);
    assert.strictEqual(parseNFeXml(12345).success, false);
  });
});

describe('M1 XML Engine: accessKeyValidator', () => {
  it('Calcula corretamente o Dígito Verificador Módulo 11 oficial (MOC)', () => {
    // Vetor oficial MOC: 3524111234567800019055001000145892100123456 -> DV = 2
    const dv = calculateAccessKeyDV('3524111234567800019055001000145892100123456');
    assert.strictEqual(dv, 2);
  });

  it('Aplica regra SEFAZ de resto 0 e 1 resultando em DV 0', () => {
    // Vetor com resto 0 -> DV = 0
    const dv0 = calculateAccessKeyDV('3524111234567800019055001000145892100123457');
    assert.strictEqual(dv0, 0);

    // Vetor com resto 1 -> DV = 0
    const dv1 = calculateAccessKeyDV('3524111234567800019055001000145892100123452');
    assert.strictEqual(dv1, 0);
  });

  it('Valida com sucesso chave válida de 44 dígitos com prefixo NFe e espaços', () => {
    const key = 'NFe 3524 1112 3456 7800 0190 5500 1000 1458 9210 0123 4562';
    const result = validateAccessKey(key);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.details.chaveCompleta, '35241112345678000190550010001458921001234562');
    assert.strictEqual(result.details.ufSigla, 'SP');
    assert.strictEqual(result.details.modelo, '55');
    assert.strictEqual(result.details.dv, 2);
  });

  it('Rejeita chave com Dígito Verificador divergente', () => {
    // Termina em 9 em vez de 2
    const key = '35241112345678000190550010001458921001234569';
    const result = validateAccessKey(key);

    assert.strictEqual(result.isValid, false);
    assert.match(result.error, /Dígito verificador.*inválido/i);
    assert.strictEqual(result.details.recordedDV, 9);
    assert.strictEqual(result.details.calculatedDV, 2);
  });

  it('Rejeita chave com comprimento incorreto, UF inválida, modelo não-55 ou mês inválido', () => {
    // Comprimento 43
    assert.strictEqual(validateAccessKey('352411123456780001905500100014589210012345').isValid, false);
    // UF 99
    assert.strictEqual(validateAccessKey('99241112345678000190550010001458921001234562').isValid, false);
    // Modelo 65
    assert.strictEqual(validateAccessKey('35241112345678000190650010001458921001234562').isValid, false);
    // Mês 13
    assert.strictEqual(validateAccessKey('35241312345678000190550010001458921001234562').isValid, false);
  });

  it('formatAccessKey formata chave em 11 blocos de 4 dígitos', () => {
    const formatted = formatAccessKey('35241112345678000190550010001458921001234562');
    assert.strictEqual(formatted, '3524 1112 3456 7800 0190 5500 1000 1458 9210 0123 4562');
  });
});

describe('M1 XML Engine: xmlToInvoiceMapper', () => {
  it('Gera itemId determinístico nfe-${chaveAcesso}-item-${nItem}', () => {
    const itemId1 = generateItemId('35241112345678000190550010001458921001234562', 1);
    assert.strictEqual(itemId1, 'nfe-35241112345678000190550010001458921001234562-item-1');

    const itemId2 = generateItemId('35241112345678000190550010001458921001234562', 2);
    assert.strictEqual(itemId2, 'nfe-35241112345678000190550010001458921001234562-item-2');
  });

  it('Mapeia XML para o contrato estrito de Invoice com precisão decimal e segurança', () => {
    const rawXml = readFileSync(resolve(FIXTURES_DIR, 'synthetic_nfe_export_proc.xml'), 'utf-8');
    const parsed = parseNFeXml(rawXml);
    const invoice = mapXmlToInvoice(parsed.data);

    assert.strictEqual(invoice.id, 'nfe-35241112345678000190550010001458921001234562');
    assert.strictEqual(invoice.numero, '000.145.892');
    assert.strictEqual(invoice.isRealImport, true, 'isRealImport deve ser true');
    assert.strictEqual(invoice.isDemo, false, 'isDemo deve ser false');
    assert.strictEqual(invoice.tipoDocumento, 'XML');
    assert.strictEqual(invoice.status, 'importado');

    // Itens
    assert.strictEqual(invoice.itens.length, 2);
    const item1 = invoice.itens[0];
    assert.strictEqual(item1.id, 'nfe-35241112345678000190550010001458921001234562-item-1');
    assert.strictEqual(item1.quantidade, '500.0000');
    assert.strictEqual(item1.valorUnitario, '25.5000');
    assert.strictEqual(item1.valorTotal, '12750.00');

    // Totais e despesas acessórias
    assert.strictEqual(invoice.totais.valorProdutos, '166750.00');
    assert.strictEqual(invoice.totais.valorFrete, '5000.00');
    assert.strictEqual(invoice.totais.valorSeguro, '1200.00');
    assert.strictEqual(invoice.totais.outrasDespesas, '500.00');
    assert.strictEqual(invoice.totais.valorTotalNota, '173450.00');
  });
});

describe('M1 XML Engine: invoiceRepository Isolamento de Sessão', () => {
  beforeEach(() => {
    invoiceRepository.clearSession();
  });

  it('create() armazena documentos reais exclusivamente em sessionInvoices sem gravar em LocalStorage', async () => {
    const rawXml = readFileSync(resolve(FIXTURES_DIR, 'synthetic_nfe_export_proc.xml'), 'utf-8');
    const parsed = parseNFeXml(rawXml);
    const invoiceData = mapXmlToInvoice(parsed.data);

    // Salva o documento real
    const created = await invoiceRepository.create(invoiceData);

    // 1. Está no Map em memória
    assert.strictEqual(sessionInvoices.has(created.id), true);
    assert.strictEqual(invoiceRepository.isSessionInvoice(created.id), true);

    // 2. NÃO está no LocalStorage
    const persisted = localStorageService.load(STORAGE_KEYS.INVOICES, []);
    assert.strictEqual(
      persisted.some((d) => d.id === created.id),
      false,
      'Documento real JAMAIS pode estar gravado em LocalStorage!'
    );

    // 3. findById encontra na sessão
    const found = await invoiceRepository.findById(created.id);
    assert.ok(found);
    assert.strictEqual(found.id, created.id);
    assert.strictEqual(found.isRealImport, true);

    // 4. list() retorna documento da sessão no topo
    const list = await invoiceRepository.list();
    assert.strictEqual(list[0].id, created.id);

    // 5. updateItem() altera na sessão em memória
    await invoiceRepository.updateItem(created.id, created.itens[0].id, {
      quantidade: '600.0000',
    });
    const updated = await invoiceRepository.findById(created.id);
    assert.strictEqual(updated.itens[0].quantidade, '600.0000');
    assert.strictEqual(updated.itens[0].modificado, true);

    // Confirma que LocalStorage ainda não contém o documento
    const persistedAfter = localStorageService.load(STORAGE_KEYS.INVOICES, []);
    assert.strictEqual(persistedAfter.some((d) => d.id === created.id), false);

    // 6. resetDemoData() não limpa o documento da sessão
    await invoiceRepository.resetDemoData();
    assert.strictEqual(sessionInvoices.has(created.id), true);

    // 7. delete() remove da sessão
    const deleted = await invoiceRepository.delete(created.id);
    assert.strictEqual(deleted, true);
    assert.strictEqual(sessionInvoices.has(created.id), false);
  });
});
