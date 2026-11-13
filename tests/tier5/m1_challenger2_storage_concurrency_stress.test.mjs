/**
 * SmartNFe — Tier 5 Adversarial Challenger 2 Test Suite:
 * Dual-Storage Repositories, Session Isolation & Concurrency Stress Harness
 *
 * Scope: Milestone 1 (Core Allocation Engine & Repositories)
 * Targets:
 * - app/features/preparedInvoiceRepository.js
 * - app/features/preparationRepository.js
 * 
 * Mandated Adversarial Scenarios:
 * 1. Real XML Leakage Attack (Zero LocalStorage Pollution)
 * 2. Memory Session Isolation & Lifetime
 * 3. Concurrency Stress Harness & Serialization (withMutationLock)
 * 4. Lifecycle Conservation State & Active Allocations
 *
 * Execution: node --no-warnings --test tests/tier5/m1_challenger2_storage_concurrency_stress.test.mjs
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  preparedInvoiceRepository,
  sessionPreparedInvoices,
  isRealPreparedInvoice,
} from '../../app/features/preparedInvoiceRepository.js';

import {
  preparationRepository,
  sessionPreparations,
  isRealPreparation,
  normalizePreparationStatus,
} from '../../app/features/preparationRepository.js';

import {
  invoiceRepository,
  sessionInvoices,
} from '../../app/features/invoiceRepository.js';

import {
  localStorageService,
  STORAGE_KEYS,
} from '../../app/lib/storage/localStorageService.js';

import {
  calculateAllocationMatrix,
  calculateItemConservationBalance,
} from '../../app/lib/calculations/allocationEngine.js';

const STORAGE_KEY_PREPARATIONS = STORAGE_KEYS?.PREPARATIONS || 'smartnfe_preparations';

// ============================================================================
// LocalStorage Spy Helper: Tracks every call to localStorageService.save
// ============================================================================
let originalSave = null;
let saveCallLog = [];

function setupLocalStorageSpy() {
  saveCallLog = [];
  originalSave = localStorageService.save;
  localStorageService.save = function (key, data) {
    saveCallLog.push({
      key,
      data: JSON.parse(JSON.stringify(data)),
      timestamp: Date.now(),
    });
    return originalSave.call(localStorageService, key, data);
  };
}

function teardownLocalStorageSpy() {
  if (originalSave) {
    localStorageService.save = originalSave;
    originalSave = null;
  }
  saveCallLog = [];
}

// ============================================================================
// Fixture Helpers: Synthetic Real XML and Demo Invoices
// ============================================================================
const REAL_ACCESS_KEY_1 = '3524110001458925500100000004211001234567';
const REAL_INVOICE_ID_1 = `nfe-${REAL_ACCESS_KEY_1}`;

const REAL_ACCESS_KEY_2 = '35241199988877000155550010000000991007654321';
const REAL_INVOICE_ID_2 = `nfe-${REAL_ACCESS_KEY_2}`;

function createSyntheticRealInvoice(overrides = {}) {
  const chaveAcesso = overrides.chaveAcesso || REAL_ACCESS_KEY_1;
  const id = overrides.id || `nfe-${chaveAcesso}`;
  return {
    id,
    chaveAcesso,
    numero: overrides.numero || '000.000.042',
    serie: '1',
    isRealImport: true,
    isDemo: false,
    emitente: {
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'Exportadora Real do Brasil Ltda',
    },
    destinatario: {
      nome: 'Rotterdam Trading BV',
      pais: 'Holanda',
      paisCodigo: 'NLD',
    },
    itens: [
      {
        id: `${id}-item-1`,
        item: 1,
        codigo: 'GRAO-SOJA-01',
        descricao: 'Soja em Grãos Não Transgênica',
        ncm: '12019000',
        cfop: '7101',
        unidade: 'KG',
        quantidade: '1000.0000',
        valorUnitario: '2.5000',
        valorTotal: '2500.00',
      },
      {
        id: `${id}-item-2`,
        item: 2,
        codigo: 'GRAO-MILHO-02',
        descricao: 'Milho em Grãos a Granel',
        ncm: '10059010',
        cfop: '7101',
        unidade: 'KG',
        quantidade: '500.0000',
        valorUnitario: '1.8000',
        valorTotal: '900.00',
      },
    ],
    ...overrides,
  };
}

// ============================================================================
// SUITE 1: Adversarial Real XML Leakage Attack (Zero LocalStorage Pollution)
// ============================================================================
describe('SUITE 1: Real XML Leakage Attack (Zero LocalStorage Pollution)', () => {
  beforeEach(async () => {
    setupLocalStorageSpy();
    await preparedInvoiceRepository.resetDemoData();
    await preparationRepository.resetDemoData();
    invoiceRepository.clearSession();
    preparedInvoiceRepository.clearSession();
    preparationRepository.clearSession();
    saveCallLog = [];
  });

  afterEach(() => {
    teardownLocalStorageSpy();
  });

  it('1.1: Criar nota preparada derivada de XML real NUNCA chama save() nem grava no localStorage', async () => {
    // 1. Cadastra documento real no invoiceRepository
    const realInvoice = createSyntheticRealInvoice();
    await invoiceRepository.create(realInvoice);

    // Limpa log do save do setup
    saveCallLog = [];

    // 2. Cria nota preparada vinculada ao documento real
    const prepared = await preparedInvoiceRepository.create({
      id: 'prep-real-export-001',
      parentInvoiceId: realInvoice.id,
      documentoOrigemId: realInvoice.id,
      isRealImport: true,
      isDemo: false,
      numero: 'EXP-2026-001',
      descricaoLote: 'Exportação Roterdã 1000KG Soja',
      itens: [
        {
          sourceInvoiceId: realInvoice.id,
          sourceItemId: `${realInvoice.id}-item-1`,
          quantidade: '600.0000',
          valorTotal: '1500.00',
        },
      ],
    });

    assert.ok(prepared, 'Nota preparada deve ser retornada');
    assert.strictEqual(prepared.id, 'prep-real-export-001');

    // 3. Verifica armazenamento em memória volátil
    assert.ok(
      sessionPreparedInvoices.has('prep-real-export-001'),
      'Nota preparada real DEVE residir em sessionPreparedInvoices'
    );

    // 4. Assert rigoroso: NENHUMA chamada a localStorageService.save com dados da nota real
    const leakedSaves = saveCallLog.filter((log) => {
      const str = JSON.stringify(log.data);
      return (
        str.includes('prep-real-export-001') ||
        str.includes(REAL_ACCESS_KEY_1) ||
        str.includes('EXP-2026-001') ||
        str.includes('Roterdã')
      );
    });
    assert.strictEqual(
      leakedSaves.length,
      0,
      `Vazamento detectado em localStorageService.save: ${JSON.stringify(leakedSaves)}`
    );

    // 5. Inspeciona o storage persistente diretamente
    const storedPrepared = localStorageService.load(STORAGE_KEYS.PREPARED_INVOICES, []);
    const foundInStorage = storedPrepared.some(
      (p) => p.id === 'prep-real-export-001' || p.parentInvoiceId === realInvoice.id
    );
    assert.strictEqual(
      foundInStorage,
      false,
      'LocalStorage sob STORAGE_KEYS.PREPARED_INVOICES NÃO PODE conter a nota real'
    );

    // 6. Inspeciona possíveis variações de chave de storage
    const altStored1 = localStorageService.load('smartnfe_prepared_invoices_v1', null);
    const altStored2 = localStorageService.load('smartnfe_prepared_invoices', null);
    const altStr1 = JSON.stringify(altStored1 || '');
    const altStr2 = JSON.stringify(altStored2 || '');
    assert.strictEqual(altStr1.includes('prep-real-export-001'), false);
    assert.strictEqual(altStr2.includes('prep-real-export-001'), false);
  });

  it('1.2: Criar preparação N->M derivada de XML real NUNCA polui o localStorage', async () => {
    const realInvoice = createSyntheticRealInvoice();
    await invoiceRepository.create(realInvoice);
    saveCallLog = [];

    const preparation = await preparationRepository.create({
      id: 'prep-nm-real-001',
      titulo: 'Preparação Mista Grãos Exportação',
      tipo: 'mista',
      status: 'active',
      isRealImport: true,
      origens: [{ invoiceId: realInvoice.id, numero: realInvoice.numero }],
      destinos: [
        { id: 'dest-1', nome: 'Navio Santos - Lote A' },
        { id: 'dest-2', nome: 'Navio Paranaguá - Lote B' },
      ],
      alocacoes: {
        [`${realInvoice.id}__${realInvoice.id}-item-1__dest-1`]: '600.0000',
        [`${realInvoice.id}__${realInvoice.id}-item-1__dest-2`]: '400.0000',
      },
    });

    assert.ok(preparation);
    assert.strictEqual(preparation.id, 'prep-nm-real-001');

    // Deve estar em sessionPreparations
    assert.ok(
      sessionPreparations.has('prep-nm-real-001'),
      'Preparação real DEVE residir em sessionPreparations'
    );

    // ZERO chamadas a save com dados da preparação real
    const leakedSaves = saveCallLog.filter((log) => {
      const str = JSON.stringify(log.data);
      return (
        str.includes('prep-nm-real-001') ||
        str.includes(REAL_ACCESS_KEY_1) ||
        str.includes('Paranaguá')
      );
    });
    assert.strictEqual(
      leakedSaves.length,
      0,
      `Vazamento em localStorageService.save: ${JSON.stringify(leakedSaves)}`
    );

    // Inspeciona STORAGE_KEY_PREPARATIONS e smartnfe_preparations_v1
    const storedPreps = localStorageService.load(STORAGE_KEY_PREPARATIONS, []);
    assert.strictEqual(
      storedPreps.some((p) => p.id === 'prep-nm-real-001'),
      false,
      'LocalStorage de preparações não pode conter o ID real'
    );

    const storedV1 = localStorageService.load('smartnfe_preparations_v1', null);
    assert.strictEqual(
      JSON.stringify(storedV1 || '').includes('prep-nm-real-001'),
      false
    );
  });

  it('1.3: Detecção implícita: Preparações sem flag explícito isRealImport que referenciam IDs de sessão são isoladas automaticamente', async () => {
    // Nota real na sessão
    const realInvoice = createSyntheticRealInvoice({ id: 'nfe-real-implicit-99' });
    sessionInvoices.set(realInvoice.id, realInvoice);
    saveCallLog = [];

    // Cria preparação sem isRealImport: true e sem isDemo: false, apenas com a origem apontando para o ID
    const preparation = await preparationRepository.create({
      id: 'prep-implicit-001',
      origens: [{ invoiceId: 'nfe-real-implicit-99' }],
      alocacoes: {
        'nfe-real-implicit-99__item-1': '100.0000',
      },
    });

    assert.strictEqual(
      preparationRepository.isSessionPreparation('prep-implicit-001'),
      true,
      'Deve ser reconhecida como sessão volátil automaticamente'
    );
    assert.ok(sessionPreparations.has('prep-implicit-001'));

    // Verifica que save() não foi chamado com essa preparação
    const leaked = saveCallLog.filter((l) => JSON.stringify(l.data).includes('prep-implicit-001'));
    assert.strictEqual(leaked.length, 0, 'Zero vazamentos no storage persistente');
  });

  it('1.4: Atualização de nota preparada real e preparação real não vaza para localStorage', async () => {
    const realPrep = await preparedInvoiceRepository.create({
      id: 'prep-update-leak-01',
      isRealImport: true,
      parentInvoiceId: 'nfe-real-12345',
      numero: 'EXP-101',
      status: 'preparado',
    });

    const realPrepNM = await preparationRepository.create({
      id: 'prep-nm-update-01',
      isRealImport: true,
      origens: [{ invoiceId: 'nfe-real-12345' }],
      status: 'draft',
    });

    saveCallLog = [];

    // Executa updates
    await preparedInvoiceRepository.update('prep-update-leak-01', {
      status: 'concluido',
      observacao: 'Dados confidenciais de aduana',
    });

    await preparationRepository.update('prep-nm-update-01', {
      status: 'active',
      titulo: 'Título Confidencial Mista',
    });

    // Confere que estão atualizadas na sessão
    const updatedPrepared = await preparedInvoiceRepository.findById('prep-update-leak-01');
    assert.strictEqual(updatedPrepared.status, 'concluido');
    assert.strictEqual(updatedPrepared.observacao, 'Dados confidenciais de aduana');

    const updatedNM = await preparationRepository.findById('prep-nm-update-01');
    assert.strictEqual(updatedNM.status, 'active');
    assert.strictEqual(updatedNM.titulo, 'Título Confidencial Mista');

    // Confere que NENHUM dado foi salvo no storage
    const leaked = saveCallLog.filter((l) => {
      const s = JSON.stringify(l.data);
      return (
        s.includes('Dados confidenciais de aduana') ||
        s.includes('prep-update-leak-01') ||
        s.includes('prep-nm-update-01') ||
        s.includes('Título Confidencial Mista')
      );
    });
    assert.strictEqual(leaked.length, 0, 'Updates em sessão não podem chamar save()');
  });

  it('1.5: Exclusão de itens reais remove da memória e não polui o storage', async () => {
    await preparedInvoiceRepository.create({
      id: 'prep-delete-01',
      isRealImport: true,
      parentInvoiceId: 'nfe-real-del',
    });

    await preparationRepository.create({
      id: 'prep-nm-del-01',
      isRealImport: true,
      origens: [{ invoiceId: 'nfe-real-del' }],
    });

    assert.ok(sessionPreparedInvoices.has('prep-delete-01'));
    assert.ok(sessionPreparations.has('prep-nm-del-01'));

    saveCallLog = [];

    const del1 = await preparedInvoiceRepository.delete('prep-delete-01');
    const del2 = await preparationRepository.delete('prep-nm-del-01');

    assert.strictEqual(del1, true);
    assert.strictEqual(del2, true);

    assert.strictEqual(sessionPreparedInvoices.has('prep-delete-01'), false);
    assert.strictEqual(sessionPreparations.has('prep-nm-del-01'), false);

    // Verifica que save() não gravou nada
    const leaked = saveCallLog.filter((l) => {
      const s = JSON.stringify(l.data);
      return s.includes('prep-delete-01') || s.includes('prep-nm-del-01');
    });
    assert.strictEqual(leaked.length, 0);
  });

  it('1.6: Migração Trojan: Atualizar preparação demo tornando-a real migra para sessão e expurga do localStorage', async () => {
    // Cria preparação inicialmente demo (vai para o storage)
    const demoPrep = await preparationRepository.create({
      id: 'demo-prep-to-migrate',
      isDemo: true,
      origens: [{ invoiceId: 'demo-01' }],
      titulo: 'Preparação Demo Inicial',
    });

    assert.strictEqual(sessionPreparations.has('demo-prep-to-migrate'), false);
    const inStoreBefore = localStorageService
      .load(STORAGE_KEY_PREPARATIONS, [])
      .some((p) => p.id === 'demo-prep-to-migrate');
    assert.strictEqual(inStoreBefore, true, 'Deve estar no storage');

    saveCallLog = [];

    // Atualiza injetando documento real
    await preparationRepository.update('demo-prep-to-migrate', {
      isRealImport: true,
      origens: [{ invoiceId: REAL_INVOICE_ID_1, numero: '000.000.042' }],
      titulo: 'Preparação Convertida em Real',
    });

    // Deve agora residir em sessionPreparations
    assert.ok(sessionPreparations.has('demo-prep-to-migrate'));

    // E deve ter sido REMOVIDA do localStorage
    const storedAfter = localStorageService.load(STORAGE_KEY_PREPARATIONS, []);
    const inStoreAfter = storedAfter.some((p) => p.id === 'demo-prep-to-migrate');
    assert.strictEqual(inStoreAfter, false, 'Deve ter sido removida do localStorage após migração para real');
  });

  it('1.7: Deep Scan Oracle: Varredura de string crua no storage após múltiplas operações comprova 0 resíduos reais', async () => {
    const rawKeys = [
      STORAGE_KEYS.PREPARED_INVOICES,
      'smartnfe_prepared_invoices_v1',
      STORAGE_KEY_PREPARATIONS,
      'smartnfe_preparations_v1',
      'smartnfe_invoices',
    ];

    for (const key of rawKeys) {
      const data = localStorageService.load(key, null);
      if (data) {
        const text = JSON.stringify(data);
        assert.strictEqual(text.includes(REAL_ACCESS_KEY_1), false, `Chave ${key} contém REAL_ACCESS_KEY_1`);
        assert.strictEqual(text.includes(REAL_ACCESS_KEY_2), false, `Chave ${key} contém REAL_ACCESS_KEY_2`);
        assert.strictEqual(text.includes('Rotterdam Trading BV'), false, `Chave ${key} contém dados reais`);
      }
    }
  });
});

// ============================================================================
// SUITE 2: Memory Session Isolation & Volatile Lifetime
// ============================================================================
describe('SUITE 2: Memory Session Isolation & Volatile Lifetime', () => {
  beforeEach(async () => {
    await preparedInvoiceRepository.resetDemoData();
    await preparationRepository.resetDemoData();
    invoiceRepository.clearSession();
    preparedInvoiceRepository.clearSession();
    preparationRepository.clearSession();
  });

  it('2.1: Itens reais na sessão são consultáveis via findById, getById e list com filtros', async () => {
    const realPrep = await preparedInvoiceRepository.create({
      id: 'prep-sess-001',
      isRealImport: true,
      numero: '98765',
      descricaoLote: 'Lote Especial Soja',
      destinatario: { nome: 'Trader Hamburgo' },
      parentInvoiceId: 'nfe-real-001',
      status: 'preparado',
    });

    const realNM = await preparationRepository.create({
      id: 'nm-sess-001',
      isRealImport: true,
      numero: 'PREP-2026-999',
      titulo: 'Preparação Mista Grãos Hamburgo',
      tipo: 'mista',
      status: 'active',
      destinos: [{ id: 'd-1', nome: 'Destino Porto' }],
    });

    // 1. findById e getById
    const found1 = await preparedInvoiceRepository.findById('prep-sess-001');
    const found1Alias = await preparedInvoiceRepository.getById('prep-sess-001');
    assert.strictEqual(found1.id, 'prep-sess-001');
    assert.strictEqual(found1Alias.id, 'prep-sess-001');

    const foundNM = await preparationRepository.findById('nm-sess-001');
    assert.strictEqual(foundNM.id, 'nm-sess-001');

    // 2. list com filtro de query
    const listPrepQuery = await preparedInvoiceRepository.list({ query: 'Hamburgo' });
    assert.strictEqual(listPrepQuery.length, 1);
    assert.strictEqual(listPrepQuery[0].id, 'prep-sess-001');

    const listNMQuery = await preparationRepository.list({ query: 'Grãos Hamburgo' });
    assert.strictEqual(listNMQuery.length, 1);
    assert.strictEqual(listNMQuery[0].id, 'nm-sess-001');

    // 3. list com filtro de parentInvoiceId
    const listByParent = await preparedInvoiceRepository.list({ parentInvoiceId: 'nfe-real-001' });
    assert.strictEqual(listByParent.length, 1);
    assert.strictEqual(listByParent[0].id, 'prep-sess-001');

    // 4. list com filtro de status
    const listActive = await preparationRepository.list({ status: 'active' });
    assert.ok(listActive.some((p) => p.id === 'nm-sess-001'));
  });

  it('2.2: Deep Cloning & Reference Safety: Modificar objeto retornado NÃO altera o registro interno em memória', async () => {
    await preparationRepository.create({
      id: 'prep-clone-test',
      isRealImport: true,
      titulo: 'Título Original Inviolável',
      alocacoes: { 'nf-1__it-1': '100.0000' },
      destinos: [{ id: 'd-1', nome: 'Destino 1' }],
    });

    const retrieved = await preparationRepository.findById('prep-clone-test');
    assert.ok(retrieved);

    // Tenta mutação maliciosa externa
    retrieved.titulo = 'Título Corrompido Externamente';
    retrieved.alocacoes['nf-1__it-1'] = '999999.0000';
    retrieved.destinos.push({ id: 'd-malicious', nome: 'Destino Injetado' });

    // Consulta novamente do repositório
    const verified = await preparationRepository.findById('prep-clone-test');
    assert.strictEqual(verified.titulo, 'Título Original Inviolável');
    assert.strictEqual(verified.alocacoes['nf-1__it-1'], '100.0000');
    assert.strictEqual(verified.destinos.length, 1);
  });

  it('2.3: resetDemoData() limpa 100% da sessão volátil enquanto restaura dados de demonstração', async () => {
    // Cria notas reais em sessão
    await preparedInvoiceRepository.create({
      id: 'prep-volatile-01',
      isRealImport: true,
    });
    await preparationRepository.create({
      id: 'nm-volatile-01',
      isRealImport: true,
    });

    assert.strictEqual(sessionPreparedInvoices.size, 1);
    assert.strictEqual(sessionPreparations.size, 1);

    // Executa resetDemoData
    await preparedInvoiceRepository.resetDemoData();
    await preparationRepository.resetDemoData();

    // Sessão deve estar completamente vazia
    assert.strictEqual(sessionPreparedInvoices.size, 0);
    assert.strictEqual(sessionPreparations.size, 0);
    assert.strictEqual(await preparedInvoiceRepository.findById('prep-volatile-01'), null);
    assert.strictEqual(await preparationRepository.findById('nm-volatile-01'), null);

    // Dados de demonstração devem estar disponíveis
    const demoPrepared = await preparedInvoiceRepository.list();
    assert.ok(demoPrepared.length > 0, 'Deve conter os mocks de demonstração de fábrica');
  });

  it('2.4: clearSession() limpa apenas a memória volátil sem tocar no LocalStorage demo', async () => {
    await preparedInvoiceRepository.create({
      id: 'prep-vol-only',
      isRealImport: true,
    });
    await preparationRepository.create({
      id: 'nm-vol-only',
      isRealImport: true,
    });

    assert.strictEqual(sessionPreparedInvoices.has('prep-vol-only'), true);
    assert.strictEqual(sessionPreparations.has('nm-vol-only'), true);

    preparedInvoiceRepository.clearSession();
    preparationRepository.clearSession();

    assert.strictEqual(sessionPreparedInvoices.has('prep-vol-only'), false);
    assert.strictEqual(sessionPreparations.has('nm-vol-only'), false);

    // Mocks do storage demo continuam acessíveis
    const prepList = await preparedInvoiceRepository.list();
    assert.ok(prepList.length > 0);
  });

  it('2.5: Coexistência de múltiplas preparações reais distintas na sessão sem colisão de chaves', async () => {
    for (let i = 1; i <= 5; i++) {
      await preparationRepository.create({
        id: `real-batch-prep-${i}`,
        isRealImport: true,
        numero: `EXP-BATCH-${i}`,
        alocacoes: {
          [`nfe-batch-${i}__item-1`]: `${i * 10}.0000`,
        },
      });
    }

    assert.strictEqual(preparationRepository.getSessionCount(), 5);
    for (let i = 1; i <= 5; i++) {
      const p = await preparationRepository.findById(`real-batch-prep-${i}`);
      assert.ok(p);
      assert.strictEqual(p.alocacoes[`nfe-batch-${i}__item-1`], `${i * 10}.0000`);
    }
  });
});

// ============================================================================
// SUITE 3: Concurrency Stress Harness & Serialization (withMutationLock)
// ============================================================================
describe('SUITE 3: Concurrency Stress Harness & Serialization (withMutationLock)', () => {
  beforeEach(async () => {
    await preparedInvoiceRepository.resetDemoData();
    await preparationRepository.resetDemoData();
    preparedInvoiceRepository.clearSession();
    preparationRepository.clearSession();
  });

  it('3.1: 20 criações concorrentes em preparationRepository executam sem race condition nem colisões', async () => {
    const CONCURRENCY_COUNT = 20;
    const promises = [];

    for (let i = 1; i <= CONCURRENCY_COUNT; i++) {
      promises.push(
        preparationRepository.create({
          id: `concurrent-prep-${i}`,
          isRealImport: true,
          titulo: `Preparação Concorrente ${i}`,
          numero: `PREP-CONC-${String(i).padStart(3, '0')}`,
          status: 'active',
          alocacoes: {
            [`nfe-conc-${i}__item-1`]: `${i * 5}.0000`,
          },
        })
      );
    }

    // Dispara todas as 20 criações simultaneamente
    const results = await Promise.all(promises);

    assert.strictEqual(results.length, CONCURRENCY_COUNT);
    assert.strictEqual(preparationRepository.getSessionCount(), CONCURRENCY_COUNT);

    const list = await preparationRepository.list();
    const concurrentItems = list.filter((p) => p.id.startsWith('concurrent-prep-'));
    assert.strictEqual(concurrentItems.length, CONCURRENCY_COUNT);

    // Verifica que cada um dos 20 IDs está presente e com dados íntegros
    for (let i = 1; i <= CONCURRENCY_COUNT; i++) {
      const found = await preparationRepository.findById(`concurrent-prep-${i}`);
      assert.ok(found, `ID concurrent-prep-${i} deve existir`);
      assert.strictEqual(found.alocacoes[`nfe-conc-${i}__item-1`], `${i * 5}.0000`);
    }
  });

  it('3.2: 20 operações mistas concorrentes (create, update, delete, getActiveAllocations) preservam consistência', async () => {
    // Pre-popula 5 preparações
    for (let i = 1; i <= 5; i++) {
      await preparationRepository.create({
        id: `mix-prep-${i}`,
        isRealImport: true,
        status: 'active',
        alocacoes: {
          'nfe-mix__item-1': '10.0000',
        },
      });
    }

    // Executa 20 operações mistas simultâneas
    const mixedOps = [];

    // 5 updates de status
    for (let i = 1; i <= 5; i++) {
      mixedOps.push(
        preparationRepository.update(`mix-prep-${i}`, {
          status: i % 2 === 0 ? 'completed' : 'draft',
          observacao: `Update concorrente ${i}`,
        })
      );
    }

    // 5 novas criações
    for (let i = 6; i <= 10; i++) {
      mixedOps.push(
        preparationRepository.create({
          id: `mix-prep-${i}`,
          isRealImport: true,
          status: 'active',
          alocacoes: {
            'nfe-mix__item-1': '20.0000',
          },
        })
      );
    }

    // 5 leituras de alocações ativas
    for (let i = 1; i <= 5; i++) {
      mixedOps.push(preparationRepository.getActiveAllocations());
    }

    // 5 consultas findById
    for (let i = 1; i <= 5; i++) {
      mixedOps.push(preparationRepository.findById(`mix-prep-${i}`));
    }

    assert.strictEqual(mixedOps.length, 20);

    // Executa tudo concorrentemente com Promise.all
    const opResults = await Promise.all(mixedOps);
    assert.strictEqual(opResults.length, 20);

    // Verifica integridade do estado final
    const finalAll = await preparationRepository.list();
    const finalMix = finalAll.filter((p) => p.id.startsWith('mix-prep-'));
    assert.strictEqual(finalMix.length, 10, 'Todas as 10 preparações devem existir');

    // Confere que os updates foram aplicados
    const prep2 = await preparationRepository.findById('mix-prep-2');
    assert.strictEqual(prep2.status, 'completed');
    assert.strictEqual(prep2.observacao, 'Update concorrente 2');
  });

  it('3.3: 20 operações concorrentes em preparedInvoiceRepository executam sem corrupção de estado', async () => {
    const promises = [];
    for (let i = 1; i <= 20; i++) {
      promises.push(
        preparedInvoiceRepository.create({
          id: `conc-prepared-${i}`,
          isRealImport: true,
          numero: `EXP-C-${i}`,
          valorTotal: `${i * 100}.00`,
        })
      );
    }

    const created = await Promise.all(promises);
    assert.strictEqual(created.length, 20);
    assert.strictEqual(sessionPreparedInvoices.size, 20);

    // Atualiza todos concorrentemente
    const updatePromises = [];
    for (let i = 1; i <= 20; i++) {
      updatePromises.push(
        preparedInvoiceRepository.update(`conc-prepared-${i}`, {
          status: 'concluido',
        })
      );
    }

    const updated = await Promise.all(updatePromises);
    assert.strictEqual(updated.length, 20);

    for (let i = 1; i <= 20; i++) {
      const item = await preparedInvoiceRepository.findById(`conc-prepared-${i}`);
      assert.strictEqual(item.status, 'concluido');
    }
  });

  it('3.4: Auto-recuperação (Self-Healing) da fila de mutex: Exceções em operações não quebram operações subsequentes', async () => {
    // 1. Operação 1 válida
    const p1 = preparationRepository.create({
      id: 'heal-prep-1',
      isRealImport: true,
      titulo: 'Valido 1',
    });

    // 2. Operação 2 que FALHA propositalmente (update de ID inexistente lança erro)
    const p2 = preparationRepository.update('id-inexistente-que-vai-falhar', {
      status: 'active',
    });

    // 3. Operação 3 válida subsequente
    const p3 = preparationRepository.create({
      id: 'heal-prep-2',
      isRealImport: true,
      titulo: 'Valido 2',
    });

    // p1 deve resolver com sucesso
    const res1 = await p1;
    assert.strictEqual(res1.id, 'heal-prep-1');

    // p2 deve rejeitar de forma limpa para quem chamou
    await assert.rejects(
      async () => await p2,
      /não encontrada/i,
      'Operação com ID inválido deve rejeitar'
    );

    // p3 DEVE resolver com sucesso e a fila NÃO deve ter morrido
    const res3 = await p3;
    assert.strictEqual(res3.id, 'heal-prep-2');

    // Ambas as notas válidas devem estar salvas
    assert.ok(sessionPreparations.has('heal-prep-1'));
    assert.ok(sessionPreparations.has('heal-prep-2'));
  });
});

// ============================================================================
// SUITE 4: Lifecycle Conservation State & Active Allocations
// ============================================================================
describe('SUITE 4: Lifecycle Conservation State & Active Allocations', () => {
  beforeEach(async () => {
    await preparedInvoiceRepository.resetDemoData();
    await preparationRepository.resetDemoData();
    preparedInvoiceRepository.clearSession();
    preparationRepository.clearSession();
  });

  it('4.1: getActiveAllocations soma quantidades comprometidas com precisão BigInt de 4 casas decimais', async () => {
    // Cria 3 preparações ativas consumindo do mesmo item: 12.3456 + 23.4567 + 34.5678 = 70.3701
    await preparationRepository.create({
      id: 'active-alloc-1',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'nfe-source-1__item-1__dest-1': '12.3456',
      },
    });

    await preparationRepository.create({
      id: 'active-alloc-2',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'nfe-source-1__item-1__dest-2': '23.4567',
      },
    });

    await preparationRepository.create({
      id: 'active-alloc-3',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'nfe-source-1__item-1': '34.5678',
      },
    });

    const activeAllocations = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeAllocations.get('nfe-source-1__item-1'), '70.3701');
    assert.strictEqual(activeAllocations.toObject()['nfe-source-1__item-1'], '70.3701');
  });

  it('4.2: Suporta todas as estruturas e layouts de chaves de alocação (alocacoes, destinos[].allocations, itens[])', async () => {
    // Prep com chave composta de 3 partes no root alocacoes
    await preparationRepository.create({
      id: 'struct-prep-1',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'src-A__item-1__dest-X': '10.5000',
      },
    });

    // Prep com destinos[].allocations
    await preparationRepository.create({
      id: 'struct-prep-2',
      status: 'active',
      isRealImport: true,
      destinos: [
        {
          id: 'dest-Y',
          allocations: {
            'src-A__item-2__dest-Y': '25.2500',
          },
        },
      ],
    });

    // Prep com destinos[].itens
    await preparationRepository.create({
      id: 'struct-prep-3',
      status: 'active',
      isRealImport: true,
      destinos: [
        {
          id: 'dest-Z',
          itens: [
            {
              sourceInvoiceId: 'src-B',
              sourceItemId: 'item-10',
              quantidade: '30.0000',
            },
          ],
        },
      ],
    });

    // Prep com root itens[]
    await preparationRepository.create({
      id: 'struct-prep-4',
      status: 'active',
      isRealImport: true,
      itens: [
        {
          sourceInvoiceId: 'src-C',
          sourceItemId: 'item-20',
          quantidade: '40.0000',
        },
      ],
    });

    const activeMap = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeMap.get('src-A__item-1'), '10.5000');
    assert.strictEqual(activeMap.get('src-A__item-2'), '25.2500');
    assert.strictEqual(activeMap.get('src-B__item-10'), '30.0000');
    assert.strictEqual(activeMap.get('src-C__item-20'), '40.0000');
  });

  it('4.3: Cancelar preparação (status: cancelled) LIBERA IMEDIATAMENTE suas quantidades alocadas', async () => {
    const prep = await preparationRepository.create({
      id: 'prep-to-cancel',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'origem-1__item-1': '500.0000',
      },
    });

    let activeMap = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeMap.get('origem-1__item-1'), '500.0000');

    // Cancela a preparação
    await preparationRepository.update('prep-to-cancel', { status: 'cancelled' });

    // Saldo alocado deve zerar imediatamente
    activeMap = await preparationRepository.getActiveAllocations();
    assert.strictEqual(
      activeMap.get('origem-1__item-1') || '0.0000',
      '0.0000',
      'Preparação cancelada não pode reter saldo'
    );
  });

  it('4.4: Reativação (cancelled -> active) recompromete o saldo imediatamente', async () => {
    await preparationRepository.create({
      id: 'prep-reactivate',
      status: 'cancelled',
      isRealImport: true,
      alocacoes: {
        'origem-react__item-1': '250.0000',
      },
    });

    let activeMap = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeMap.get('origem-react__item-1') || '0.0000', '0.0000');

    // Reativa
    await preparationRepository.update('prep-reactivate', { status: 'active' });

    activeMap = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeMap.get('origem-react__item-1'), '250.0000');
  });

  it('4.5: Excluir preparação ativa com delete() libera imediatamente suas alocações', async () => {
    await preparationRepository.create({
      id: 'prep-delete-alloc',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'origem-del__item-1': '333.3333',
      },
    });

    let activeMap = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeMap.get('origem-del__item-1'), '333.3333');

    // Exclui
    await preparationRepository.delete('prep-delete-alloc');

    activeMap = await preparationRepository.getActiveAllocations();
    assert.strictEqual(activeMap.get('origem-del__item-1') || '0.0000', '0.0000');
  });

  it('4.6: Controle de rascunhos (includeDrafts=false) exclui alocações de rascunhos', async () => {
    await preparationRepository.create({
      id: 'prep-draft-1',
      status: 'draft',
      isRealImport: true,
      alocacoes: {
        'origem-d__item-1': '150.0000',
      },
    });

    await preparationRepository.create({
      id: 'prep-active-1',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'origem-d__item-1': '200.0000',
      },
    });

    // Padrão (inclui rascunhos): 150 + 200 = 350
    const withDrafts = await preparationRepository.getActiveAllocations();
    assert.strictEqual(withDrafts.get('origem-d__item-1'), '350.0000');

    // Sem rascunhos: apenas 200
    const noDrafts = await preparationRepository.getActiveAllocations(null, {
      includeDrafts: false,
    });
    assert.strictEqual(noDrafts.get('origem-d__item-1'), '200.0000');
  });

  it('4.7: excludePreparationId exclui a própria preparação em edição, evitando falso bloqueio por excesso', async () => {
    await preparationRepository.create({
      id: 'prep-editing-now',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'origem-ex__item-1': '400.0000',
      },
    });

    await preparationRepository.create({
      id: 'prep-other',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        'origem-ex__item-1': '100.0000',
      },
    });

    // Ao editar prep-editing-now, passa seu ID como excludePreparationId
    const editAllocations = await preparationRepository.getActiveAllocations('prep-editing-now');
    assert.strictEqual(
      editAllocations.get('origem-ex__item-1'),
      '100.0000',
      'Deve retornar apenas a alocação de prep-other'
    );
  });

  it('4.8: Integração Ponta a Ponta: getActiveAllocations + calculateItemConservationBalance + calculateAllocationMatrix', async () => {
    // Item original tem 1000.0000 KG
    const sourceKey = 'nfe-grain__item-1';
    const originalQty = '1000.0000';

    // 1. Preparação 1 ativa alocou 400.0000 KG
    await preparationRepository.create({
      id: 'prep-prior-1',
      status: 'active',
      isRealImport: true,
      alocacoes: {
        [`${sourceKey}__dest-A`]: '400.0000',
      },
    });

    // 2. Consulta alocações ativas
    const activeMap = await preparationRepository.getActiveAllocations();
    const activeObj = activeMap.toObject();

    // 3. Testa calculateItemConservationBalance
    const priorAllocated = activeObj[sourceKey] || '0.0000';
    const balance = calculateItemConservationBalance(originalQty, [], priorAllocated);
    assert.strictEqual(balance.originalQty, '1000.0000');
    assert.strictEqual(balance.priorAllocatedQty, '400.0000');
    assert.strictEqual(balance.availableQty, '600.0000');
    assert.strictEqual(balance.hasExcess, false);

    // 4. Nova preparação tenta alocar 600.0000 (exatamente o disponível) -> DEVE PERMITIR
    const sourceItems = [
      {
        id: 'item-1',
        sourceInvoiceId: 'nfe-grain',
        sourceItemId: 'item-1',
        codigo: 'GRAO-1',
        descricao: 'Soja',
        unidade: 'KG',
        quantidade: originalQty,
        valorUnitario: '10.00',
      },
    ];

    const validDestinations = [
      {
        id: 'dest-B',
        allocations: {
          [sourceKey]: '600.0000',
        },
      },
    ];

    const matrixValid = calculateAllocationMatrix(sourceItems, validDestinations, activeObj);
    assert.strictEqual(matrixValid.canSave, true, 'Deve permitir alocação de 600 restante');
    assert.strictEqual(matrixValid.sourceBalances[sourceKey].remainingQty, '0.0000');

    // 5. Nova preparação tenta alocar 600.0001 (1 décimo de miligrama além do disponível) -> DEVE BLOQUEAR
    const invalidDestinations = [
      {
        id: 'dest-B',
        allocations: {
          [sourceKey]: '600.0001',
        },
      },
    ];

    const matrixInvalid = calculateAllocationMatrix(sourceItems, invalidDestinations, activeObj);
    assert.strictEqual(matrixInvalid.canSave, false, 'Deve bloquear alocação de 600.0001');
    assert.strictEqual(matrixInvalid.sourceBalances[sourceKey].hasExcess, true);
    assert.strictEqual(matrixInvalid.sourceBalances[sourceKey].status, 'excess');
  });
});
