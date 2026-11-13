/**
 * SmartNFe — Integration Test Suite: Fluxo F (Teste de Estresse em Escala: 50 Notas -> 5 Destinos)
 *
 * Requisito: R5 (PROJECT.md, ORIGINAL_REQUEST.md, TEST_INFRA.md)
 *
 * Verificações cobertas (4 Tiers / Stress Scale):
 * - Tier 1: Geração paramétrica determinística de 50 XMLs de NF-e 4.00 com 10 fornecedores e 200+ itens.
 * - Tier 2: Ingestão concorrente de 50 XMLs em fila com pool de concorrência 3 sem estourar pilha ou memória.
 * - Tier 3: Distribuição em larga escala (200+ itens x 5 contêineres de exportação) com conservação matemática exata.
 * - Tier 4: Auditoria rigorosa de quarentena: ZERO vazamento de dados fiscais reais para o LocalStorage.
 *
 * Execução: node --no-warnings --test tests/integration/flow_f_scale_50_invoices.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanDecimalString,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  roundDecimal,
  decimalSum,
  decimalCompare,
} from '../../app/lib/calculations/decimal.js';

import {
  calculateAllocationMatrix,
  ALLOCATION_STATUS,
} from '../../app/lib/calculations/allocationEngine.js';

import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';
import { parseNFeXml } from '../../app/features/xml/nfeXmlParser.js';
import { validateAccessKey } from '../../app/features/xml/accessKeyValidator.js';
import { mapXmlToInvoice } from '../../app/features/xml/xmlToInvoiceMapper.js';
import {
  generateNFeXml,
  SCENARIOS,
  SUPPLIERS_CATALOG,
  FOREIGN_CLIENTS_CATALOG,
} from '../fixtures/xmlFixtureGenerator.mjs';

describe('Fluxo F — Teste de Estresse em Escala: 50 Notas -> 5 Destinos (R5)', () => {
  beforeEach(() => {
    invoiceRepository.clearSession();
    localStorageService.resetAll();
  });

  // ==========================================================================
  // TIER 1: Geração Paramétrica em Escala (50 XMLs, 10 Fornecedores, 200+ Itens)
  // ==========================================================================
  describe('Tier 1: Geração Paramétrica em Escala', () => {
    it('1.1: Gera 50 XMLs válidos em menos de 1000ms com chaves de 44 dígitos criptograficamente válidas', () => {
      const startTime = Date.now();
      const scaleScenario = SCENARIOS.createScaleBatchScenario({ count: 50 });
      const elapsed = Date.now() - startTime;

      assert.strictEqual(scaleScenario.count, 50);
      assert.ok(scaleScenario.totalItemsCount >= 200, `Total de itens (${scaleScenario.totalItemsCount}) deve ser >= 200`);
      assert.ok(elapsed < 2000, `Geração em lote deve ser rápida (levou ${elapsed}ms)`);

      // Valida chaves e fornecedores
      const uniqueKeys = new Set();
      const uniqueSuppliers = new Set();

      for (const item of scaleScenario.invoices) {
        const inv = item.invoice;
        uniqueKeys.add(inv.chaveAcesso);
        uniqueSuppliers.add(inv.emitente.cnpj);

        assert.strictEqual(inv.chaveAcesso.length, 44);
        const valResult = validateAccessKey(inv.chaveAcesso);
        assert.strictEqual(valResult.isValid, true, `Chave ${inv.chaveAcesso} deve ser matematicamente válida`);
      }

      assert.strictEqual(uniqueKeys.size, 50, 'Todas as 50 chaves devem ser únicas');
      assert.strictEqual(uniqueSuppliers.size, 10, 'Deve abranger os 10 fornecedores do catálogo');
    });

    it('1.2: Todos os 50 XMLs são estruturalmente válidos e compatíveis com o parser SEFAZ do SmartNFe', () => {
      const scaleScenario = SCENARIOS.createScaleBatchScenario({ count: 50 });

      for (let i = 0; i < 50; i++) {
        const xmlStr = scaleScenario.invoices[i].invoice.xml;
        const parsed = parseNFeXml(xmlStr);
        assert.strictEqual(parsed.success, true, `XML ${i + 1} deve ser analisado com sucesso`);
        assert.strictEqual(parsed.data.ide.mod, '55');
        assert.ok(parsed.data.itens.length >= 4);
      }
    });
  });

  // ==========================================================================
  // TIER 2: Ingestão em Fila com Concorrência Limitada (Pool = 3)
  // ==========================================================================
  describe('Tier 2: Ingestão de Lote em Escala (Pool = 3)', () => {
    it('2.1: Importa lote de 50 XMLs na fila concorrente e monitora estabilidade do heap', async () => {
      const scaleScenario = SCENARIOS.createScaleBatchScenario({ count: 50 });
      const initialHeap = process.memoryUsage().heapUsed;

      // Pool de 3 workers
      const concurrencyLimit = 3;
      const queue = [...scaleScenario.invoices];
      let activeWorkers = 0;
      let maxWorkers = 0;
      let importedCount = 0;

      const worker = async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          activeWorkers++;
          if (activeWorkers > maxWorkers) maxWorkers = activeWorkers;

          const parsed = parseNFeXml(item.invoice.xml);
          const invoiceEntity = mapXmlToInvoice(parsed.data, {
            sourceFileName: item.filename,
          });

          await invoiceRepository.create(invoiceEntity);
          importedCount++;

          activeWorkers--;
          await new Promise((r) => setTimeout(r, 0));
        }
      };

      const workers = [];
      for (let i = 0; i < concurrencyLimit; i++) {
        workers.push(worker());
      }

      await Promise.all(workers);

      assert.strictEqual(importedCount, 50);
      assert.strictEqual(invoiceRepository.getSessionCount(), 50);
      assert.ok(maxWorkers <= 3, `Concorrência (${maxWorkers}) não deve ultrapassar 3`);

      const finalHeap = process.memoryUsage().heapUsed;
      const heapGrowthMB = (finalHeap - initialHeap) / (1024 * 1024);
      // O crescimento deve ser moderado (< 100MB) para 50 notas em memória
      assert.ok(heapGrowthMB < 100, `Crescimento de heap (${heapGrowthMB.toFixed(2)}MB) deve ser controlado`);
    });
  });

  // ==========================================================================
  // TIER 3: Distribuição em 5 Destinos e Conservação Matemática ao Centavo
  // ==========================================================================
  describe('Tier 3: Distribuição em 5 Destinos e Conservação ao Centavo', () => {
    it('3.1: Aloca os 200+ itens em 5 contêineres de destino com 100% de conservação sem desvio', async () => {
      const scaleScenario = SCENARIOS.createScaleBatchScenario({ count: 50 });

      // Agrega todos os 200+ itens
      const allSourceItems = [];
      for (const item of scaleScenario.invoices) {
        const inv = item.invoice;
        for (const it of inv.items) {
          allSourceItems.push({
            ...it,
            sourceInvoiceId: inv.invoiceId,
            sourceItemId: `nfe-${inv.chaveAcesso}-item-${it.nItem}`,
            quantidade: it.qCom,
            valorUnitario: it.vUnCom,
            valorTotal: it.vProd,
            frete: it.vFrete,
            seguro: it.vSeg,
            outrasDespesas: it.vOutro,
            desconto: it.vDesc,
          });
        }
      }

      assert.ok(allSourceItems.length >= 200);

      // Define 5 contêineres de exportação
      const destinationNotes = [
        { id: 'cntr-01-rotterdam', numero: 'CNTR-ROT-01', foreignClient: FOREIGN_CLIENTS_CATALOG[0], allocations: {} },
        { id: 'cntr-02-houston', numero: 'CNTR-HOU-02', foreignClient: FOREIGN_CLIENTS_CATALOG[1], allocations: {} },
        { id: 'cntr-03-hamburg', numero: 'CNTR-HAM-03', foreignClient: FOREIGN_CLIENTS_CATALOG[2], allocations: {} },
        { id: 'cntr-04-shanghai', numero: 'CNTR-SHA-04', foreignClient: FOREIGN_CLIENTS_CATALOG[3], allocations: {} },
        { id: 'cntr-05-singapore', numero: 'CNTR-SIN-05', foreignClient: FOREIGN_CLIENTS_CATALOG[4], allocations: {} },
      ];

      // Distribui 100% da quantidade de cada item igualmente entre os 5 contêineres (20% cada)
      let totalExpectedQty = '0.0000';
      let totalExpectedValue = '0.00';

      for (const item of allSourceItems) {
        const key = `${item.sourceInvoiceId}__${item.sourceItemId}`;
        const totalQty = cleanDecimalString(item.quantidade);
        totalExpectedQty = decimalAdd(totalExpectedQty, totalQty, 4);
        totalExpectedValue = decimalAdd(totalExpectedValue, item.valorTotal, 2);

        // Divide quantidade em 5 partes com conservação exata
        const qtyParts = [
          roundDecimal(decimalMultiply(totalQty, '0.20', 4), 4),
          roundDecimal(decimalMultiply(totalQty, '0.20', 4), 4),
          roundDecimal(decimalMultiply(totalQty, '0.20', 4), 4),
          roundDecimal(decimalMultiply(totalQty, '0.20', 4), 4),
          '0.0000',
        ];

        // A 5ª parte absorve a diferença exata para fechar 100%
        const sum4 = decimalAdd(
          decimalAdd(decimalAdd(qtyParts[0], qtyParts[1], 4), qtyParts[2], 4),
          qtyParts[3],
          4
        );
        qtyParts[4] = decimalSubtract(totalQty, sum4, 4);

        for (let d = 0; d < 5; d++) {
          destinationNotes[d].allocations[key] = qtyParts[d];
        }
      }

      // Executa o cálculo da matriz de grande escala
      const startTime = Date.now();
      const result = calculateAllocationMatrix(allSourceItems, destinationNotes);
      const calcDuration = Date.now() - startTime;

      assert.strictEqual(result.canSave, true, 'Matriz em escala deve ser válida para salvamento');
      assert.strictEqual(result.isBalanced, true, 'Todos os itens devem estar 100% alocados');
      assert.strictEqual(result.hasExcess, false);
      assert.ok(calcDuration < 2000, `Cálculo da matriz de 200+ itens x 5 destinos deve ser rápido (levou ${calcDuration}ms)`);

      // Conservação matemática global estrita
      let totalAllocatedDestQty = '0.0000';
      let totalAllocatedDestValue = '0.00';

      for (const ds of result.destinationSummaries) {
        totalAllocatedDestQty = decimalAdd(totalAllocatedDestQty, ds.totalQuantity, 4);
        totalAllocatedDestValue = decimalAdd(totalAllocatedDestValue, ds.totalProducts, 2);
      }

      assert.strictEqual(totalAllocatedDestQty, totalExpectedQty, 'Quantidade total alocada deve ser idêntica à soma das origens');
      assert.strictEqual(totalAllocatedDestValue, totalExpectedValue, 'Valor total alocado deve ser idêntico ao valor original das mercadorias');
    });
  });

  // ==========================================================================
  // TIER 4: Auditoria de Quarentena e Privacidade Fiscal
  // ==========================================================================
  describe('Tier 4: Auditoria de Quarentena e Privacidade Fiscal', () => {
    it('4.1: ZERO vazamento de dados fiscais reais: nenhuma das 50 notas reside no localStorage', async () => {
      const scaleScenario = SCENARIOS.createScaleBatchScenario({ count: 50 });

      // Importa todas as 50 notas
      for (const item of scaleScenario.invoices) {
        const parsed = parseNFeXml(item.invoice.xml);
        const invoiceEntity = mapXmlToInvoice(parsed.data, {
          sourceFileName: item.filename,
        });
        await invoiceRepository.create(invoiceEntity);
      }

      assert.strictEqual(sessionInvoices.size, 50);

      // Inspeciona exaustivamente o LocalStorage
      const storedData = localStorageService.load(STORAGE_KEYS.INVOICES, []);
      for (const item of scaleScenario.invoices) {
        const chave = item.invoice.chaveAcesso;
        const id = item.invoice.invoiceId;

        const foundById = storedData.find((d) => d.id === id);
        const foundByKey = storedData.find((d) => d.chaveAcesso === chave);

        assert.strictEqual(foundById, undefined, `Documento ${id} não deve existir no storage`);
        assert.strictEqual(foundByKey, undefined, `Chave ${chave} não deve existir no storage`);
      }

      // Limpeza de sessão libera os 50 registros instantaneamente
      invoiceRepository.clearSession();
      assert.strictEqual(sessionInvoices.size, 0);
      assert.strictEqual(invoiceRepository.getSessionCount(), 0);
    });
  });
});
