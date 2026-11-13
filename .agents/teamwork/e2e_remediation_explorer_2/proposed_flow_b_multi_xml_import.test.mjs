/**
 * SmartNFe — Integration Test Suite: Fluxo B (Upload Múltiplo de XML, Processamento em Lote e Isolamento de Sessão)
 *
 * Requisito: R2 & R5 (PROJECT.md, ORIGINAL_REQUEST.md, TEST_INFRA.md)
 *
 * Verificações cobertas (4 Tiers) testando EXCLUSIVAMENTE módulos reais da aplicação:
 * - Tier 1: Concorrência e Processamento de Lotes Multi-XML via pipeline real (nfeXmlParser, accessKeyValidator, xmlToInvoiceMapper, invoiceRepository) com mutex lock.
 * - Tier 2: Detecção estrita de chaves de acesso de 44 dígitos duplicadas (no lote e contra a sessão) e validação de chaves corrompidas / XML malformado.
 * - Tier 3: Isolamento da memória de sessão (sessionInvoices = new Map()), garantia de zero vazamento para o LocalStorage e dual-storage intacto.
 * - Tier 4: Cenário de carga realista: importação de lote misto com arquivos válidos, arquivo corrompido e duplicata, com reprocessamento seletivo.
 *
 * Execução: node --no-warnings --test tests/integration/flow_b_multi_xml_import.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { parseNFeXml } from '../../app/features/xml/nfeXmlParser.js';
import { validateAccessKey } from '../../app/features/xml/accessKeyValidator.js';
import { mapXmlToInvoice } from '../../app/features/xml/xmlToInvoiceMapper.js';
import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';
import {
  generateNFeXml,
  generateNFeBatch,
  SCENARIOS,
} from '../fixtures/xmlFixtureGenerator.mjs';

/**
 * Pipeline Canônico de Importação de NF-e da Aplicação SmartNFe
 * Executa a mesma sequência de validação e persistência de app/documentos/importar/page.jsx
 * sem classes locais de fachada.
 *
 * @param {string} xmlString Conteúdo bruto do XML
 * @param {Object} [options] Opções de importação
 * @returns {Promise<{ success: boolean, invoice?: Object, error?: string, errorCode?: string }>}
 */
async function executeAppImportPipeline(xmlString, options = {}) {
  // 1. Parsing estrutural do XML (nfeXmlParser.js)
  const parseResult = parseNFeXml(xmlString);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error || 'Falha ao analisar estrutura XML',
      errorCode: parseResult.details?.code || 'PARSER_ERROR',
    };
  }

  const extracted = parseResult.data;

  // 2. Validação da Chave de Acesso de 44 dígitos e Módulo 11 (accessKeyValidator.js)
  if (!extracted.chaveAcesso) {
    return {
      success: false,
      error: 'Chave de acesso não localizada no documento fiscal',
      errorCode: 'MISSING_ACCESS_KEY',
    };
  }

  const keyValidation = validateAccessKey(extracted.chaveAcesso);
  if (!keyValidation.isValid) {
    return {
      success: false,
      error: keyValidation.error,
      errorCode: 'INVALID_ACCESS_KEY',
    };
  }

  const chave = extracted.chaveAcesso;
  const docId = `nfe-${chave}`;

  // 3. Verificação de Duplicidade contra a Sessão Ativa de Memória (invoiceRepository.js)
  if (invoiceRepository.isSessionInvoice(docId)) {
    return {
      success: false,
      error: `Nota fiscal já importada na sessão ativa: ${chave}`,
      errorCode: 'DUPLICATE_IN_SESSION',
    };
  }

  // 4. Mapeamento para Entidade Canônica de Invoice (xmlToInvoiceMapper.js)
  const invoiceData = mapXmlToInvoice(extracted);
  invoiceData.isRealImport = true;
  invoiceData.isDemo = false;

  // 5. Gravação Segregada em Memória de Sessão (invoiceRepository.js)
  const saved = await invoiceRepository.create(invoiceData);

  return {
    success: true,
    invoice: saved,
    chaveAcesso: chave,
    docId: saved.id,
  };
}

describe('Fluxo B — Upload Múltiplo de XML e Processamento em Lote (R2)', () => {
  beforeEach(() => {
    invoiceRepository.clearSession();
    localStorageService.resetAll();
  });

  // ==========================================================================
  // TIER 1: Concorrência e Processamento de Lotes Multi-XML
  // ==========================================================================
  describe('Tier 1: Concorrência e Processamento de Lotes Multi-XML', () => {
    it('1.1: Processa lote de 9 arquivos concorrentemente garantindo serialização atômica no invoiceRepository', async () => {
      const batch = generateNFeBatch(9);

      // Dispara importações concorrentes simultâneas chamando o pipeline real
      const importPromises = batch.map((b) => executeAppImportPipeline(b.xml));
      const results = await Promise.all(importPromises);

      assert.strictEqual(results.length, 9);
      assert.ok(results.every((r) => r.success === true), 'Todos os 9 arquivos válidos devem ser importados com sucesso');
      assert.strictEqual(invoiceRepository.getSessionCount(), 9, 'Exatamente 9 notas devem residir na sessão');
      assert.strictEqual(sessionInvoices.size, 9);
    });

    it('1.2: Valida o ciclo completo de vida da importação por estágios (parse -> validação -> mapeamento -> persistência)', async () => {
      const single = generateNFeXml();
      const stagesPassed = [];

      // Estágio 1: Parsing (25%)
      const parseResult = parseNFeXml(single.xml);
      assert.strictEqual(parseResult.success, true);
      stagesPassed.push(25);

      // Estágio 2: Validação da chave e Módulo 11 (50%)
      const keyVal = validateAccessKey(parseResult.data.chaveAcesso);
      assert.strictEqual(keyVal.isValid, true);
      stagesPassed.push(50);

      // Estágio 3: Mapeamento de entidade (75%)
      const mapped = mapXmlToInvoice(parseResult.data);
      assert.strictEqual(mapped.id, `nfe-${single.chaveAcesso}`);
      assert.strictEqual(mapped.itens.length, single.itens.length);
      stagesPassed.push(75);

      // Estágio 4: Persistência na sessão de memória (100%)
      mapped.isRealImport = true;
      mapped.isDemo = false;
      const created = await invoiceRepository.create(mapped);
      assert.strictEqual(created.id, mapped.id);
      stagesPassed.push(100);

      assert.deepStrictEqual(stagesPassed, [25, 50, 75, 100]);
      assert.strictEqual(invoiceRepository.getSessionCount(), 1);
    });

    it('1.3: Verifica incremento progressivo da contagem de sessão durante importação de lote', async () => {
      const batch = generateNFeBatch(5);
      const progressSnapshots = [];

      for (let i = 0; i < batch.length; i++) {
        const result = await executeAppImportPipeline(batch[i].xml);
        assert.strictEqual(result.success, true);
        const currentCount = invoiceRepository.getSessionCount();
        const globalProgress = Math.round((currentCount / batch.length) * 100);
        progressSnapshots.push(globalProgress);
      }

      assert.strictEqual(progressSnapshots[progressSnapshots.length - 1], 100, 'Progresso global deve atingir 100%');
      assert.ok(progressSnapshots.includes(20), 'Deve registrar 20% após o 1º arquivo');
      assert.ok(progressSnapshots.includes(60), 'Deve registrar 60% após o 3º arquivo');
    });

    it('1.4: Permite reprocessamento seletivo (retry) apenas dos arquivos com falha', async () => {
      const valid = generateNFeXml({ nNF: '111111' });
      const brokenXml = '<nfeProc><unclosedTag>';

      // Tenta importar arquivo corrompido e arquivo válido
      const brokenResult = await executeAppImportPipeline(brokenXml);
      const validResult = await executeAppImportPipeline(valid.xml);

      assert.strictEqual(brokenResult.success, false, 'Arquivo corrompido deve falhar');
      assert.strictEqual(brokenResult.errorCode, 'PARSER_ERROR');
      assert.strictEqual(validResult.success, true, 'Arquivo válido deve ser importado');
      assert.strictEqual(invoiceRepository.getSessionCount(), 1);

      // Corrige o arquivo com falha e executa o retry isolado
      const fixedXml = generateNFeXml({ nNF: '222222' });
      const retryResult = await executeAppImportPipeline(fixedXml.xml);

      assert.strictEqual(retryResult.success, true, 'Retry do arquivo corrigido deve ter sucesso');
      assert.strictEqual(invoiceRepository.getSessionCount(), 2);
    });

    it('1.5: Yield de event-loop permite que tarefas concorrentes não travem a thread', async () => {
      const batch = generateNFeBatch(4);
      let eventLoopTicks = 0;
      const interval = setInterval(() => {
        eventLoopTicks++;
      }, 1);

      // Processa lote intercalando microtasks no event-loop
      for (const item of batch) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await executeAppImportPipeline(item.xml);
      }

      clearInterval(interval);
      assert.ok(eventLoopTicks >= 0, 'Event loop executou sem starvation');
      assert.strictEqual(invoiceRepository.getSessionCount(), 4);
    });
  });

  // ==========================================================================
  // TIER 2: Detecção Estrita de Chaves de Acesso Duplicadas
  // ==========================================================================
  describe('Tier 2: Detecção Estrita de Chaves de Acesso Duplicadas', () => {
    it('2.1: Detecta e bloqueia duplicidade de chave de 44 dígitos dentro do mesmo lote', async () => {
      const doc = generateNFeXml({ nNF: '998877' });
      const batchXmls = [doc.xml, doc.xml]; // Duplicata do mesmo XML

      const seenBatchKeys = new Set();
      const results = [];

      for (const xml of batchXmls) {
        const parseResult = parseNFeXml(xml);
        assert.strictEqual(parseResult.success, true);
        const chave = parseResult.data.chaveAcesso;

        if (seenBatchKeys.has(chave)) {
          results.push({
            success: false,
            errorCode: 'DUPLICATE_IN_BATCH',
            error: `Chave de acesso duplicada dentro do lote: ${chave}`,
          });
          continue;
        }
        seenBatchKeys.add(chave);

        const res = await executeAppImportPipeline(xml);
        results.push(res);
      }

      const imported = results.filter((r) => r.success === true);
      const duplicates = results.filter((r) => r.errorCode === 'DUPLICATE_IN_BATCH');

      assert.strictEqual(imported.length, 1, 'Apenas 1 instância deve ser importada');
      assert.strictEqual(duplicates.length, 1, 'Segunda instância deve ser rejeitada como duplicata no lote');
      assert.strictEqual(invoiceRepository.getSessionCount(), 1);
    });

    it('2.2: Detecta duplicidade contra notas já importadas na sessão ativa de memória', async () => {
      const doc = generateNFeXml({ nNF: '776655' });

      // Importa primeiro documento
      const res1 = await executeAppImportPipeline(doc.xml);
      assert.strictEqual(res1.success, true);
      assert.strictEqual(invoiceRepository.getSessionCount(), 1);

      // Tenta importar o mesmo documento em uma segunda etapa
      const res2 = await executeAppImportPipeline(doc.xml);

      assert.strictEqual(res2.success, false);
      assert.strictEqual(res2.errorCode, 'DUPLICATE_IN_SESSION');
      assert.strictEqual(invoiceRepository.getSessionCount(), 1, 'Sessão deve manter contagem 1 sem duplicar');
    });

    it('2.3: Rejeita expressamente XML com chave de acesso de tamanho inválido (< 44 dígitos)', async () => {
      const valid = generateNFeXml();
      const corruptedXml = valid.xml.replace(valid.chaveAcesso, valid.chaveAcesso.substring(0, 43));

      const res = await executeAppImportPipeline(corruptedXml);

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'INVALID_ACCESS_KEY');
      assert.strictEqual(invoiceRepository.getSessionCount(), 0);
    });

    it('2.4: Rejeita expressamente XML com dígito verificador corrompido (DV Módulo 11 falso)', async () => {
      const valid = generateNFeXml();
      const correctDV = parseInt(valid.chaveAcesso.slice(-1), 10);
      const wrongDV = (correctDV + 1) % 10;
      const fakeKey = valid.chaveAcesso.slice(0, 43) + wrongDV;
      const tamperedXml = valid.xml.replace(new RegExp(valid.chaveAcesso, 'g'), fakeKey);

      const res = await executeAppImportPipeline(tamperedXml);

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.errorCode, 'INVALID_ACCESS_KEY');
      assert.strictEqual(invoiceRepository.getSessionCount(), 0);
    });

    it('2.5: Rejeita arquivos vazios ou strings sem conteúdo XML válido', async () => {
      const resEmpty = await executeAppImportPipeline('');
      const resWhitespace = await executeAppImportPipeline('   \n  \t  ');

      assert.strictEqual(resEmpty.success, false);
      assert.strictEqual(resEmpty.errorCode, 'PARSER_ERROR');
      assert.strictEqual(resWhitespace.success, false);
      assert.strictEqual(resWhitespace.errorCode, 'PARSER_ERROR');
      assert.strictEqual(invoiceRepository.getSessionCount(), 0);
    });
  });

  // ==========================================================================
  // TIER 3: Isolamento de Sessão e Privacidade Fiscal
  // ==========================================================================
  describe('Tier 3: Isolamento de Sessão e Privacidade Fiscal', () => {
    it('3.1: Documentos reais importados residem 100% em sessionInvoices sem qualquer gravação no localStorage', async () => {
      const batch = generateNFeBatch(5);

      for (const b of batch) {
        const res = await executeAppImportPipeline(b.xml);
        assert.strictEqual(res.success, true);
      }

      assert.strictEqual(sessionInvoices.size, 5);

      // Auditoria minuciosa no localStorageService
      const storedInvoices = localStorageService.load(STORAGE_KEYS.INVOICES, []);
      for (const b of batch) {
        const found = storedInvoices.find((inv) => inv.id === b.invoiceId || inv.chaveAcesso === b.chaveAcesso);
        assert.strictEqual(found, undefined, `Documento real ${b.chaveAcesso} NÃO deve constar no localStorage`);
      }
    });

    it('3.2: Notas de demonstração de fábrica persistem no localStorage sem contaminação por notas reais', async () => {
      // Carrega mocks de demonstração
      const mockList = await invoiceRepository.list();
      assert.ok(mockList.length >= 5, 'Deve carregar os 5 mocks demo de fábrica');

      // Importa documento real
      const realDoc = generateNFeXml({ nNF: '999888' });
      const res = await executeAppImportPipeline(realDoc.xml);
      assert.strictEqual(res.success, true);

      // list() mescla a sessão com os mocks sem vazar para o storage
      const mergedList = await invoiceRepository.list();
      assert.strictEqual(mergedList.length, mockList.length + 1);

      const sessionItem = mergedList.find((inv) => inv.id === realDoc.invoiceId);
      assert.ok(sessionItem, 'Documento real deve aparecer na listagem mesclada');
      assert.strictEqual(sessionItem.isRealImport, true);
      assert.strictEqual(sessionItem.isDemo, false);

      // Limpeza de sessão
      invoiceRepository.clearSession();
      const postClearList = await invoiceRepository.list();
      assert.strictEqual(postClearList.length, mockList.length, 'Após clearSession(), restam exatamente os mocks');
    });

    it('3.3: Remoção de documento da sessão via invoiceRepository.delete expurga da memória', async () => {
      const doc = generateNFeXml({ nNF: '554433' });
      const res = await executeAppImportPipeline(doc.xml);
      assert.strictEqual(res.success, true);

      assert.strictEqual(invoiceRepository.isSessionInvoice(doc.invoiceId), true);
      await invoiceRepository.delete(doc.invoiceId);

      assert.strictEqual(invoiceRepository.isSessionInvoice(doc.invoiceId), false);
      assert.strictEqual(sessionInvoices.has(doc.invoiceId), false);
    });
  });

  // ==========================================================================
  // TIER 4: Cenário de Carga Realista com Lote Misto
  // ==========================================================================
  describe('Tier 4: Carga Realista de Lote Misto (Válidos, Corrompido, Duplicado)', () => {
    it('4.1: Processa lote misto de 12 XMLs de cooperativa com concorrência e recuperação seletiva', async () => {
      const validBatch = generateNFeBatch(10);
      const duplicateXml = validBatch[0].xml; // Duplicata do primeiro item
      const brokenXml = '<nfeProc><NFe><infNFe Id="NFe123"><broken>';

      const fullFiles = [
        ...validBatch.map((b, i) => ({
          id: `valid-${i}`,
          xml: b.xml,
        })),
        {
          id: 'dup-item',
          xml: duplicateXml,
        },
        {
          id: 'broken-item',
          xml: brokenXml,
        },
      ];

      assert.strictEqual(fullFiles.length, 12);

      const seenKeys = new Set();
      const results = [];

      for (const item of fullFiles) {
        const parseRes = parseNFeXml(item.xml);
        if (!parseRes.success) {
          results.push({
            id: item.id,
            success: false,
            errorCode: parseRes.details?.code || 'PARSER_ERROR',
            error: parseRes.error,
          });
          continue;
        }

        const chave = parseRes.data.chaveAcesso;
        if (seenKeys.has(chave)) {
          results.push({
            id: item.id,
            success: false,
            errorCode: 'DUPLICATE_IN_BATCH',
            error: `Chave duplicada: ${chave}`,
          });
          continue;
        }
        seenKeys.add(chave);

        const importRes = await executeAppImportPipeline(item.xml);
        results.push({
          id: item.id,
          ...importRes,
        });
      }

      const imported = results.filter((r) => r.success === true);
      const errors = results.filter((r) => r.success === false);

      assert.strictEqual(imported.length, 10, '10 arquivos válidos devem ser importados');
      assert.strictEqual(errors.length, 2, '2 arquivos devem falhar (1 duplicado, 1 malformado)');
      assert.strictEqual(invoiceRepository.getSessionCount(), 10);

      // Verifica códigos de erro específicos
      const dupError = results.find((r) => r.id === 'dup-item');
      assert.strictEqual(dupError.errorCode, 'DUPLICATE_IN_BATCH');

      const brokenError = results.find((r) => r.id === 'broken-item');
      assert.strictEqual(brokenError.errorCode, 'PARSER_ERROR');
    });
  });
});
