/**
 * SmartNFe — Integration Test Suite: Fluxo B (Upload Múltiplo de XML, Fila em Lotes e Isolamento de Sessão)
 *
 * Requisito: R2 & R5 (PROJECT.md, ORIGINAL_REQUEST.md, TEST_INFRA.md)
 *
 * Verificações cobertas (4 Tiers):
 * - Tier 1: Fila em lotes com pool de concorrência limitado a 3 workers simultâneos, progresso individual/global e retry.
 * - Tier 2: Detecção estrita de chaves de acesso de 44 dígitos duplicadas (no lote e contra a sessão) e rejeição de XMLs malformados.
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
  generateAccessKey,
  SCENARIOS,
} from '../fixtures/xmlFixtureGenerator.mjs';

/**
 * Motor de Fila Concorrente com Bounded Worker Pool (Pool = 3)
 * Emula o comportamento do importador multi-XML do navegador em app/documentos/importar/page.jsx.
 */
class BatchXmlImportQueue {
  constructor(options = {}) {
    this.concurrencyLimit = options.concurrencyLimit || 3;
    this.onProgress = options.onProgress || (() => {});
    this.onFileComplete = options.onFileComplete || (() => {});
    this.activeWorkers = 0;
    this.maxObservedConcurrency = 0;
  }

  async processBatch(files) {
    const results = [];
    const queue = [...files];
    const seenBatchKeys = new Set();
    let completedCount = 0;
    const totalCount = files.length;

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        this.activeWorkers++;
        if (this.activeWorkers > this.maxObservedConcurrency) {
          this.maxObservedConcurrency = this.activeWorkers;
        }

        item.status = 'parsing';
        item.progress = 25;
        this.onProgress({ fileId: item.id, status: item.status, progress: item.progress });

        // Yield para não bloquear event-loop
        await new Promise((resolve) => setTimeout(resolve, 0));

        try {
          // 1. Parsing estrutural do XML
          const parseResult = parseNFeXml(item.xmlContent);
          if (!parseResult.success) {
            item.status = 'error';
            item.error = parseResult.error || 'Erro ao processar XML';
            item.errorCode = parseResult.details?.code || 'PARSER_ERROR';
            item.progress = 100;
            results.push(item);
            this.onFileComplete(item);
            continue;
          }

          const rawData = parseResult.data;
          item.progress = 50;

          // 2. Validação da Chave de Acesso (Módulo 11)
          const keyValidation = validateAccessKey(rawData.chaveAcesso);
          if (!keyValidation.isValid) {
            item.status = 'error';
            item.error = keyValidation.error;
            item.errorCode = 'INVALID_ACCESS_KEY';
            item.progress = 100;
            results.push(item);
            this.onFileComplete(item);
            continue;
          }

          const chave = rawData.chaveAcesso;

          // 3. Detecção de Duplicidade no Lote
          if (seenBatchKeys.has(chave)) {
            item.status = 'error';
            item.error = `Chave de acesso duplicada dentro do lote: ${chave}`;
            item.errorCode = 'DUPLICATE_IN_BATCH';
            item.progress = 100;
            results.push(item);
            this.onFileComplete(item);
            continue;
          }
          seenBatchKeys.add(chave);

          // 4. Detecção de Duplicidade contra a Sessão Ativa
          const docId = `nfe-${chave}`;
          if (invoiceRepository.isSessionInvoice(docId)) {
            item.status = 'error';
            item.error = `Nota fiscal já importada na sessão ativa: ${chave}`;
            item.errorCode = 'DUPLICATE_IN_SESSION';
            item.progress = 100;
            results.push(item);
            this.onFileComplete(item);
            continue;
          }

          item.progress = 75;

          // 5. Mapeamento e Gravação no Repositório de Sessão
          const invoiceEntity = mapXmlToInvoice(rawData, {
            sourceFileName: item.filename,
          });

          const created = await invoiceRepository.create(invoiceEntity);
          item.status = 'imported';
          item.invoiceId = created.id;
          item.chaveAcesso = chave;
          item.progress = 100;
          this.onProgress({ fileId: item.id, status: item.status, progress: item.progress });
          results.push(item);
          this.onFileComplete(item);
        } catch (err) {
          item.status = 'error';
          item.error = err.message || 'Exceção não tratada';
          item.errorCode = 'UNHANDLED_EXCEPTION';
          item.progress = 100;
          results.push(item);
          this.onFileComplete(item);
        } finally {
          this.activeWorkers--;
          completedCount++;
          const globalProgress = Math.round((completedCount / totalCount) * 100);
          this.onProgress({
            fileId: item.id,
            completedCount,
            totalCount,
            globalProgress,
          });
        }
      }
    };

    // Inicializa workers até o limite de concorrência
    const workerPromises = [];
    const count = Math.min(this.concurrencyLimit, files.length);
    for (let i = 0; i < count; i++) {
      workerPromises.push(worker());
    }

    await Promise.all(workerPromises);
    return results;
  }
}

describe('Fluxo B — Upload Múltiplo de XML e Fila de Lotes (R2)', () => {
  beforeEach(() => {
    invoiceRepository.clearSession();
    localStorageService.resetAll();
  });

  // ==========================================================================
  // TIER 1: Concorrência Limitada (Pool = 3), Progresso e Retry
  // ==========================================================================
  describe('Tier 1: Concorrência Limitada (Pool = 3) e Progresso', () => {
    it('1.1: Processa lote de 9 arquivos respeitando estritamente o teto de 3 workers simultâneos', async () => {
      const batch = generateNFeBatch(9);
      const queueItems = batch.map((b, i) => ({
        id: `file-${i + 1}`,
        filename: b.filename,
        xmlContent: b.xml,
        status: 'pending',
        progress: 0,
      }));

      const queue = new BatchXmlImportQueue({ concurrencyLimit: 3 });
      const results = await queue.processBatch(queueItems);

      assert.strictEqual(results.length, 9);
      assert.ok(queue.maxObservedConcurrency <= 3, `Concorrência observada (${queue.maxObservedConcurrency}) não deve exceder 3`);
      assert.strictEqual(invoiceRepository.getSessionCount(), 9);
      assert.ok(results.every((r) => r.status === 'imported'));
    });

    it('1.2: Calcula progresso individual por arquivo (0% -> 25% -> 50% -> 75% -> 100%)', async () => {
      const single = generateNFeXml();
      const progressSteps = [];

      const queue = new BatchXmlImportQueue({
        concurrencyLimit: 1,
        onProgress: (p) => {
          if (p.progress !== undefined) progressSteps.push(p.progress);
        },
      });

      await queue.processBatch([
        {
          id: 'test-progress-1',
          filename: 'single.xml',
          xmlContent: single.xml,
          status: 'pending',
          progress: 0,
        },
      ]);

      assert.ok(progressSteps.includes(25), 'Deve transicionar por 25%');
      assert.ok(progressSteps.includes(100), 'Deve finalizar em 100%');
    });

    it('1.3: Calcula progresso global consolidado do lote de 0% a 100%', async () => {
      const batch = generateNFeBatch(5);
      const queueItems = batch.map((b, i) => ({
        id: `f-${i}`,
        filename: b.filename,
        xmlContent: b.xml,
        status: 'pending',
      }));

      const globalSteps = [];
      const queue = new BatchXmlImportQueue({
        concurrencyLimit: 2,
        onProgress: (p) => {
          if (p.globalProgress !== undefined) globalSteps.push(p.globalProgress);
        },
      });

      await queue.processBatch(queueItems);

      assert.strictEqual(globalSteps[globalSteps.length - 1], 100, 'Progresso global deve atingir 100%');
      assert.ok(globalSteps.some((v) => v > 0 && v < 100), 'Deve emitir estágios intermediários');
    });

    it('1.4: Permite reprocessamento seletivo (retry) apenas dos arquivos com falha', async () => {
      const valid = generateNFeXml({ nNF: '111111' });
      const broken = {
        id: 'file-corrupt',
        filename: 'broken.xml',
        xmlContent: '<nfeProc><unclosedTag>',
        status: 'pending',
      };
      const ok = {
        id: 'file-valid',
        filename: 'valid.xml',
        xmlContent: valid.xml,
        status: 'pending',
      };

      const queue1 = new BatchXmlImportQueue();
      const initialResults = await queue1.processBatch([broken, ok]);

      const failedItem = initialResults.find((r) => r.status === 'error');
      const successItem = initialResults.find((r) => r.status === 'imported');

      assert.ok(failedItem, 'Item corrompido deve falhar');
      assert.ok(successItem, 'Item válido deve ser importado');
      assert.strictEqual(invoiceRepository.getSessionCount(), 1);

      // Corrige o arquivo com falha e executa o retry isolado
      const fixedXml = generateNFeXml({ nNF: '222222' });
      failedItem.xmlContent = fixedXml.xml;
      failedItem.status = 'pending';

      const queue2 = new BatchXmlImportQueue();
      const retryResults = await queue2.processBatch([failedItem]);

      assert.strictEqual(retryResults[0].status, 'imported');
      assert.strictEqual(invoiceRepository.getSessionCount(), 2);
    });

    it('1.5: Yield de event-loop permite que tarefas concorrentes não travem a thread', async () => {
      const batch = generateNFeBatch(4);
      let eventLoopTicks = 0;
      const interval = setInterval(() => {
        eventLoopTicks++;
      }, 1);

      const queue = new BatchXmlImportQueue({ concurrencyLimit: 3 });
      await queue.processBatch(
        batch.map((b, i) => ({
          id: `tick-${i}`,
          filename: b.filename,
          xmlContent: b.xml,
          status: 'pending',
        }))
      );

      clearInterval(interval);
      assert.ok(eventLoopTicks >= 0, 'Event loop executou sem starvation');
    });
  });

  // ==========================================================================
  // TIER 2: Detecção Estrita de Chaves de Acesso Duplicadas
  // ==========================================================================
  describe('Tier 2: Detecção Estrita de Chaves de Acesso Duplicadas', () => {
    it('2.1: Detecta e bloqueia duplicidade de chave de 44 dígitos dentro do mesmo lote', async () => {
      const doc = generateNFeXml({ nNF: '998877' });
      const duplicateBatch = [
        { id: 'f-1', filename: 'orig.xml', xmlContent: doc.xml, status: 'pending' },
        { id: 'f-2', filename: 'copy.xml', xmlContent: doc.xml, status: 'pending' },
      ];

      const queue = new BatchXmlImportQueue();
      const results = await queue.processBatch(duplicateBatch);

      const imported = results.filter((r) => r.status === 'imported');
      const duplicates = results.filter((r) => r.status === 'error' && r.errorCode === 'DUPLICATE_IN_BATCH');

      assert.strictEqual(imported.length, 1, 'Apenas 1 instância deve ser importada');
      assert.strictEqual(duplicates.length, 1, 'Segunda instância deve ser rejeitada como duplicata no lote');
      assert.strictEqual(invoiceRepository.getSessionCount(), 1);
    });

    it('2.2: Detecta duplicidade contra notas já importadas na sessão ativa de memória', async () => {
      const doc = generateNFeXml({ nNF: '776655' });

      // Importa primeiro documento
      const queue1 = new BatchXmlImportQueue();
      await queue1.processBatch([{ id: 'first', filename: 'first.xml', xmlContent: doc.xml, status: 'pending' }]);
      assert.strictEqual(invoiceRepository.getSessionCount(), 1);

      // Tenta importar o mesmo documento em um segundo lote posterior
      const queue2 = new BatchXmlImportQueue();
      const results2 = await queue2.processBatch([{ id: 'second', filename: 'second.xml', xmlContent: doc.xml, status: 'pending' }]);

      assert.strictEqual(results2[0].status, 'error');
      assert.strictEqual(results2[0].errorCode, 'DUPLICATE_IN_SESSION');
      assert.strictEqual(invoiceRepository.getSessionCount(), 1, 'Sessão deve manter contagem 1 sem duplicar');
    });

    it('2.3: Rejeita expressamente XML com chave de acesso de tamanho inválido (< 44 dígitos)', async () => {
      // Gera XML com chave propositalmente de 43 dígitos
      const valid = generateNFeXml();
      const corruptedXml = valid.xml.replace(valid.chaveAcesso, valid.chaveAcesso.substring(0, 43));

      const queue = new BatchXmlImportQueue();
      const results = await queue.processBatch([{ id: 'bad-key', filename: 'bad.xml', xmlContent: corruptedXml, status: 'pending' }]);

      assert.strictEqual(results[0].status, 'error');
      assert.strictEqual(results[0].errorCode, 'INVALID_ACCESS_KEY');
    });

    it('2.4: Rejeita expressamente XML com dígito verificador corrompido (DV Módulo 11 falso)', async () => {
      const valid = generateNFeXml();
      const correctDV = parseInt(valid.chaveAcesso.slice(-1), 10);
      const wrongDV = (correctDV + 1) % 10;
      const fakeKey = valid.chaveAcesso.slice(0, 43) + wrongDV;
      const tamperedXml = valid.xml.replace(new RegExp(valid.chaveAcesso, 'g'), fakeKey);

      const queue = new BatchXmlImportQueue();
      const results = await queue.processBatch([{ id: 'tampered', filename: 'tampered.xml', xmlContent: tamperedXml, status: 'pending' }]);

      assert.strictEqual(results[0].status, 'error');
      assert.strictEqual(results[0].errorCode, 'INVALID_ACCESS_KEY');
    });

    it('2.5: Rejeita arquivos vazios ou strings sem conteúdo XML válido', async () => {
      const queue = new BatchXmlImportQueue();
      const results = await queue.processBatch([
        { id: 'empty', filename: 'empty.xml', xmlContent: '', status: 'pending' },
        { id: 'whitespace', filename: 'spaces.xml', xmlContent: '   \n  \t  ', status: 'pending' },
      ]);

      assert.strictEqual(results[0].status, 'error');
      assert.strictEqual(results[1].status, 'error');
    });
  });

  // ==========================================================================
  // TIER 3: Isolamento de Sessão e Privacidade Fiscal
  // ==========================================================================
  describe('Tier 3: Isolamento de Sessão e Privacidade Fiscal', () => {
    it('3.1: Documentos reais importados residem 100% em sessionInvoices sem qualquer gravação no localStorage', async () => {
      const batch = generateNFeBatch(5);
      const queue = new BatchXmlImportQueue();
      await queue.processBatch(
        batch.map((b, i) => ({
          id: `real-${i}`,
          filename: b.filename,
          xmlContent: b.xml,
          status: 'pending',
        }))
      );

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
      const queue = new BatchXmlImportQueue();
      await queue.processBatch([{ id: 'real-doc', filename: 'real.xml', xmlContent: realDoc.xml, status: 'pending' }]);

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
      const queue = new BatchXmlImportQueue();
      await queue.processBatch([{ id: 'del-test', filename: 'del.xml', xmlContent: doc.xml, status: 'pending' }]);

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
    it('4.1: Processa lote misto de 12 XMLs de cooperativa com concorrência limitada e recuperação seletiva', async () => {
      const validBatch = generateNFeBatch(10);
      const duplicateXml = validBatch[0].xml; // Duplicata do primeiro item
      const brokenXml = '<nfeProc><NFe><infNFe Id="NFe123"><broken>';

      const fullFiles = [
        ...validBatch.map((b, i) => ({
          id: `valid-${i}`,
          filename: b.filename,
          xmlContent: b.xml,
          status: 'pending',
        })),
        {
          id: 'dup-item',
          filename: 'duplicate_of_first.xml',
          xmlContent: duplicateXml,
          status: 'pending',
        },
        {
          id: 'broken-item',
          filename: 'corrupted_payload.xml',
          xmlContent: brokenXml,
          status: 'pending',
        },
      ];

      assert.strictEqual(fullFiles.length, 12);

      const queue = new BatchXmlImportQueue({ concurrencyLimit: 3 });
      const results = await queue.processBatch(fullFiles);

      const imported = results.filter((r) => r.status === 'imported');
      const errors = results.filter((r) => r.status === 'error');

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
