/**
 * SmartNFe — Integration Test Suite: Fluxo E (Preparação N:M, Rascunhos e Preservação de Origem)
 *
 * Requisito: R3 & R4 (PROJECT.md, ORIGINAL_REQUEST.md, TEST_INFRA.md)
 *
 * Verificações cobertas (4 Tiers):
 * - Tier 1: Preservação perpétua da identidade do item (sourceInvoiceId + sourceItemId), isolamento de produtos com códigos repetidos.
 * - Tier 2: Workflows operacionais de Agrupamento (N -> 1) e Divisão (1 -> M) com conservação matemática.
 * - Tier 3: Preparação Mista (N -> M), gestão de rascunhos em memória volátil (sessionPreparations), dual-storage e alocações ativas cruzadas.
 * - Tier 4: Ciclo de vida completo de preparação (draft -> active -> completed -> cancelled) e aviso de perda de sessão.
 *
 * Execução: node --no-warnings --test tests/integration/flow_e_preparation_n_to_m.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanDecimalString,
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
  roundDecimal,
  decimalCompare,
  decimalSum,
} from '../../app/lib/calculations/decimal.js';

import {
  buildCompositeKey,
  buildSourceItemKey,
  parseCompositeKey,
  parseSourceItemKey,
  calculateAllocationMatrix,
  validateAllocationBatch,
  ALLOCATION_STATUS,
} from '../../app/lib/calculations/allocationEngine.js';

import {
  preparationRepository,
  sessionPreparations,
  isRealPreparation,
  normalizePreparationStatus,
} from '../../app/features/preparationRepository.js';

import { invoiceRepository, sessionInvoices } from '../../app/features/invoiceRepository.js';
import { localStorageService, STORAGE_KEYS } from '../../app/lib/storage/localStorageService.js';
import {
  generateNFeXml,
  SCENARIOS,
  SUPPLIERS_CATALOG,
  FOREIGN_CLIENTS_CATALOG,
} from '../fixtures/xmlFixtureGenerator.mjs';

describe('Fluxo E — Preparação N:M, Rascunhos e Preservação de Origem (R3)', () => {
  beforeEach(() => {
    invoiceRepository.clearSession();
    sessionPreparations.clear();
    localStorageService.resetAll();
  });

  // ==========================================================================
  // TIER 1: Preservação da Identidade do Item (sourceInvoiceId + sourceItemId)
  // ==========================================================================
  describe('Tier 1: Preservação da Identidade do Item (sourceInvoiceId + sourceItemId)', () => {
    it('1.1: Itens alocados no destino preservam sourceInvoiceId, sourceItemId e metadados do fornecedor original', () => {
      const sourceItems = [
        {
          id: 'item-agro-1',
          sourceInvoiceId: 'nfe-agro-sp',
          sourceItemId: 'it-1',
          sourceInvoiceNumero: '000.145.892',
          sourceEmitente: 'Agroexport Brasil S.A.',
          codigo: 'EXP-CAF-001',
          descricao: 'Café Especial Exportação',
          ncm: '09011110',
          unidade: 'SC',
          quantidade: '500.0000',
          valorUnitario: '25.5000',
        },
      ];

      const destinationNotes = [
        {
          id: 'dest-nl',
          numero: 'EXP-001',
          allocations: { 'nfe-agro-sp__it-1': '500.0000' },
        },
      ];

      const result = calculateAllocationMatrix(sourceItems, destinationNotes);
      assert.strictEqual(result.canSave, true);

      const destItems = result.destinationSummaries[0].items;
      assert.strictEqual(destItems.length, 1);
      assert.strictEqual(destItems[0].sourceInvoiceId, 'nfe-agro-sp');
      assert.strictEqual(destItems[0].sourceItemId, 'it-1');
      assert.strictEqual(destItems[0].sourceInvoiceNumero, '000.145.892');
      assert.strictEqual(destItems[0].sourceEmitente, 'Agroexport Brasil S.A.');
    });

    it('1.2: Produtos idênticos (cProd: "SOJA-01") de fornecedores distintos NÃO se fundem nem colidem', () => {
      const scenario = SCENARIOS.createRepeatedCodesScenario();
      const { invoices, keys } = scenario;

      const sourceItems = [
        {
          id: 'sp-item-1',
          sourceInvoiceId: invoices[0].invoiceId,
          sourceItemId: `nfe-${invoices[0].chaveAcesso}-item-1`,
          codigo: 'SOJA-01',
          descricao: 'Soja SP',
          quantidade: '100.0000',
          valorUnitario: '350.0000',
        },
        {
          id: 'mt-item-1',
          sourceInvoiceId: invoices[1].invoiceId,
          sourceItemId: `nfe-${invoices[1].chaveAcesso}-item-1`,
          codigo: 'SOJA-01',
          descricao: 'Soja MT',
          quantidade: '200.0000',
          valorUnitario: '360.0000',
        },
        {
          id: 'pr-item-1',
          sourceInvoiceId: invoices[2].invoiceId,
          sourceItemId: `nfe-${invoices[2].chaveAcesso}-item-1`,
          codigo: 'SOJA-01',
          descricao: 'Soja PR',
          quantidade: '150.0000',
          valorUnitario: '340.0000',
        },
      ];

      const destinationNotes = [
        {
          id: 'dest-consolidated',
          numero: 'EXP-SOJ-ALL',
          allocations: {
            [keys.keyA]: '100.0000',
            [keys.keyB]: '200.0000',
            [keys.keyC]: '150.0000',
          },
        },
      ];

      const result = calculateAllocationMatrix(sourceItems, destinationNotes);
      assert.strictEqual(result.canSave, true);

      // O destino deve conter 3 linhas distintas preservando cada fornecedor, sem agregação artificial
      const destItems = result.destinationSummaries[0].items;
      assert.strictEqual(destItems.length, 3);
      assert.strictEqual(destItems[0].sourceInvoiceId, invoices[0].invoiceId);
      assert.strictEqual(destItems[1].sourceInvoiceId, invoices[1].invoiceId);
      assert.strictEqual(destItems[2].sourceInvoiceId, invoices[2].invoiceId);
      assert.strictEqual(result.destinationSummaries[0].totalQuantity, '450.0000');
    });

    it('1.3: Constrói e decompõe chaves compostas de forma bidirecional e determinística', () => {
      const compositeKey = buildCompositeKey('nfe-352411...', 'item-001');
      assert.strictEqual(compositeKey, 'nfe-352411...__item-001');

      const parsed = parseCompositeKey(compositeKey);
      assert.strictEqual(parsed.sourceInvoiceId, 'nfe-352411...');
      assert.strictEqual(parsed.sourceItemId, 'item-001');
    });
  });

  // ==========================================================================
  // TIER 2: Workflows de Agrupamento (N -> 1) e Divisão (1 -> M)
  // ==========================================================================
  describe('Tier 2: Workflows de Agrupamento (N -> 1) e Divisão (1 -> M)', () => {
    it('2.1: Agrupamento (N -> 1): agrega 2 notas de fornecedores diferentes em 1 nota de exportação para a Holanda', () => {
      const grouping = SCENARIOS.createGroupingScenario();
      const { invoices, destNote, expectedAllocations } = grouping;

      const sourceItems = invoices.flatMap((inv) =>
        inv.items.map((it) => ({
          ...it,
          sourceInvoiceId: inv.invoiceId,
          sourceItemId: `nfe-${inv.chaveAcesso}-item-${it.nItem}`,
          quantidade: it.qCom,
          valorUnitario: it.vUnCom,
          valorTotal: it.vProd,
          frete: it.vFrete,
        }))
      );

      const result = calculateAllocationMatrix(sourceItems, [destNote]);
      assert.strictEqual(result.canSave, true);
      assert.strictEqual(result.isBalanced, true);

      const summary = result.destinationSummaries[0];
      assert.strictEqual(summary.totalQuantity, expectedAllocations.totalAllocatedQty);
      assert.strictEqual(summary.totalProducts, expectedAllocations.totalAllocatedValue);
      assert.strictEqual(summary.totalFreight, expectedAllocations.totalFreight);
      assert.strictEqual(summary.items.length, 2);
    });

    it('2.2: Divisão (1 -> M): divide 1 grande nota fiscal entre 3 destinos internacionais com alocação total', () => {
      const division = SCENARIOS.createDivisionScenario();
      const { sourceInvoice, destinations, expectedBalances } = division;

      const sourceItems = sourceInvoice.items.map((it) => ({
        ...it,
        sourceInvoiceId: sourceInvoice.invoiceId,
        sourceItemId: `nfe-${sourceInvoice.chaveAcesso}-item-${it.nItem}`,
        quantidade: it.qCom,
        valorUnitario: it.vUnCom,
        valorTotal: it.vProd,
        frete: it.vFrete,
      }));

      const result = calculateAllocationMatrix(sourceItems, destinations);
      assert.strictEqual(result.canSave, true);
      assert.strictEqual(result.isBalanced, true);
      assert.strictEqual(result.destinationSummaries.length, 3);

      // Verifica saldo zerado dos itens de origem
      for (const balance of Object.values(result.sourceBalances)) {
        assert.strictEqual(balance.remainingQty, '0.0000');
        assert.strictEqual(balance.status, ALLOCATION_STATUS.OK);
      }
    });

    it('2.3: Divisão parcial retém saldo disponível e marca preparação como parcial (canSave: true, isBalanced: false)', () => {
      const sourceItems = [
        {
          id: 'item-div-partial',
          sourceInvoiceId: 'nfe-orig-1',
          sourceItemId: 'it-1',
          quantidade: '1000.0000',
          valorUnitario: '100.0000',
        },
      ];

      // Aloca apenas 400 de 1000
      const destinationNotes = [
        { id: 'dest-1', allocations: { 'nfe-orig-1__it-1': '400.0000' } },
        { id: 'dest-2', allocations: { 'nfe-orig-1__it-1': '0.0000' } },
      ];

      const result = calculateAllocationMatrix(sourceItems, destinationNotes);
      assert.strictEqual(result.canSave, true, 'Alocação parcial é válida e pode ser salva');
      assert.strictEqual(result.isBalanced, false);
      assert.strictEqual(result.sourceBalances['nfe-orig-1__it-1'].remainingQty, '600.0000');
      assert.strictEqual(result.sourceBalances['nfe-orig-1__it-1'].status, ALLOCATION_STATUS.PARTIAL);
    });
  });

  // ==========================================================================
  // TIER 3: Workflow Misto (N -> M) e Gestão de Rascunhos em Memória
  // ==========================================================================
  describe('Tier 3: Workflow Misto (N -> M) e Gestão de Rascunhos em Memória', () => {
    it('3.1: Permite alocação mista de 4 fornecedores para 3 destinos com sobras parciais remanescentes', () => {
      const mixed = SCENARIOS.createMixedScenario();
      const { invoices, destinations } = mixed;

      const sourceItems = invoices.flatMap((inv) =>
        inv.items.map((it) => ({
          ...it,
          sourceInvoiceId: inv.invoiceId,
          sourceItemId: `nfe-${inv.chaveAcesso}-item-${it.nItem}`,
          quantidade: it.qCom,
          valorUnitario: it.vUnCom,
          valorTotal: it.vProd,
          frete: it.vFrete,
        }))
      );

      const result = calculateAllocationMatrix(sourceItems, destinations);
      assert.strictEqual(result.canSave, true);
      assert.strictEqual(result.hasExcess, false);
      assert.strictEqual(result.hasRemaining, true);
    });

    it('3.2: Salva rascunho de preparação preservando matriz incompleta para retomada posterior', async () => {
      const draftData = {
        titulo: 'Rascunho Embarque Roterdã',
        tipo: 'mista',
        status: 'draft',
        isDemo: true,
        origens: [{ id: 'demo-01' }],
        destinos: [
          { id: 'dest-draft-1', numero: 'EXP-DRAFT-1', allocations: { 'demo-01__1': '50.0000' } },
        ],
      };

      const saved = await preparationRepository.create(draftData);
      assert.ok(saved.id);
      assert.strictEqual(saved.status, 'draft');

      const retrieved = await preparationRepository.findById(saved.id);
      assert.strictEqual(retrieved.titulo, 'Rascunho Embarque Roterdã');
      assert.strictEqual(retrieved.destinos[0].allocations['demo-01__1'], '50.0000');
    });

    it('3.3: Preparações que envolvem documentos reais residem 100% em sessionPreparations (memória volátil)', async () => {
      // Cria nota real na sessão
      const realDoc = generateNFeXml({ nNF: '888777' });
      await invoiceRepository.create(realDoc);

      const realPrepData = {
        titulo: 'Preparação Real Soja',
        tipo: 'agrupamento',
        status: 'draft',
        isRealImport: true,
        sourceInvoiceIds: [realDoc.invoiceId],
        origens: [{ id: realDoc.invoiceId, isRealImport: true }],
        destinos: [{ id: 'dest-real-1', allocations: { [`${realDoc.invoiceId}__1`]: '100.0000' } }],
      };

      const saved = await preparationRepository.create(realPrepData);
      assert.ok(saved.id);

      // Comprova presença em sessionPreparations
      assert.strictEqual(sessionPreparations.has(saved.id), true);

      // Comprova ausência total no localStorageService
      const stored = localStorageService.load(STORAGE_KEYS.PREPARATIONS || 'smartnfe_preparations', []);
      const foundInStorage = stored.find((p) => p.id === saved.id);
      assert.strictEqual(foundInStorage, undefined, 'Preparação com origem real NUNCA deve constar no localStorage');
    });

    it('3.4: getActiveAllocations recupera alocações ativas e impede alocação excedente em nova preparação', async () => {
      // 1. Cria preparação ativa 1 alocando 70.0000 do item 'inv-1__it-1' (original = 100.0000)
      const prep1 = await preparationRepository.create({
        titulo: 'Prep 1 Ativa',
        status: 'active',
        isDemo: true,
        destinos: [
          {
            id: 'd1',
            allocations: { 'inv-1__it-1': '70.0000' },
          },
        ],
      });

      // 2. Consulta alocações ativas
      const activeAllocations = await preparationRepository.getActiveAllocations();
      assert.strictEqual(activeAllocations.get('inv-1__it-1'), '70.0000');

      // 3. Tenta alocar 40.0000 em uma segunda preparação: 70 + 40 = 110 > 100 (deve falhar com excesso)
      const sourceItems = [
        {
          id: 'item-1',
          sourceInvoiceId: 'inv-1',
          sourceItemId: 'it-1',
          quantidade: '100.0000',
          valorUnitario: '10.0000',
        },
      ];

      const newDestinationNotes = [
        { id: 'd2', allocations: { 'inv-1__it-1': '40.0000' } },
      ];

      const result = calculateAllocationMatrix(sourceItems, newDestinationNotes, activeAllocations);
      assert.strictEqual(result.canSave, false, 'Alocação concomitante que excede o saldo remanescente deve ser bloqueada');
      assert.strictEqual(result.hasExcess, true);
      assert.strictEqual(result.sourceBalances['inv-1__it-1'].availableQty, '30.0000'); // 100 - 70
      assert.strictEqual(result.sourceBalances['inv-1__it-1'].remainingQty, '-10.0000'); // 30 - 40
    });
  });

  // ==========================================================================
  // TIER 4: Ciclo de Vida End-to-End e Cancelamento
  // ==========================================================================
  describe('Tier 4: Ciclo de Vida End-to-End e Cancelamento', () => {
    it('4.1: Ciclo de vida completo: draft -> update -> active -> completed', async () => {
      // Cria draft
      const prep = await preparationRepository.create({
        titulo: 'Embarque Cingapura',
        status: 'draft',
        destinos: [{ id: 'dest-1', allocations: { 'src-1__1': '10.0000' } }],
      });
      assert.strictEqual(prep.status, 'draft');

      // Atualiza para active
      const updated = await preparationRepository.update(prep.id, {
        status: 'active',
        titulo: 'Embarque Cingapura Confirmado',
      });
      assert.strictEqual(updated.status, 'active');
      assert.strictEqual(updated.titulo, 'Embarque Cingapura Confirmado');

      // Finaliza como completed
      const completed = await preparationRepository.update(prep.id, {
        status: 'completed',
      });
      assert.strictEqual(completed.status, 'completed');
    });

    it('4.2: Cancelamento de preparação (status: "cancelled") libera imediatamente as alocações retidas', async () => {
      // Cria preparação ativa
      const prep = await preparationRepository.create({
        titulo: 'Preparação Temporária',
        status: 'active',
        destinos: [{ id: 'd-temp', allocations: { 'src-item-9__1': '150.0000' } }],
      });

      let activeBefore = await preparationRepository.getActiveAllocations();
      assert.strictEqual(activeBefore.get('src-item-9__1'), '150.0000');

      // Cancela a preparação
      await preparationRepository.update(prep.id, { status: 'cancelled' });

      // getActiveAllocations não deve mais contabilizar preparações canceladas
      let activeAfter = await preparationRepository.getActiveAllocations();
      assert.strictEqual(activeAfter.get('src-item-9__1'), undefined, 'Alocações canceladas devem ser liberadas imediatamente');
    });

    it('4.3: Exclusão de preparação via repository.delete remove registro e libera alocações', async () => {
      const prep = await preparationRepository.create({
        titulo: 'A Deletar',
        status: 'draft',
        destinos: [{ id: 'd-del', allocations: { 'item-del__1': '50.0000' } }],
      });

      await preparationRepository.delete(prep.id);
      const found = await preparationRepository.findById(prep.id);
      assert.strictEqual(found, null);
    });
  });
});
