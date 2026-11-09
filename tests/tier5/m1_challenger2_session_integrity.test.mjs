/**
 * SmartNFe — Tier 5 Adversarial Challenger 2 Test Suite:
 * In-Memory Session Repository & Data Integrity Stress Harness
 *
 * Verificações empíricas rigorosas:
 * 1. Isolamento estrito de LocalStorage: Nenhuma chamada de importação/criação,
 *    atualização ou exclusão de documento real (isRealImport: true ou isDemo: false)
 *    polui ou grava dados no localStorageService (espião em localStorageService.save).
 * 2. Concorrência e idempotência: 50 operações concorrentes de updateItem e list
 *    simultâneas sobre a memória de sessão volátil, garantindo ausência de race
 *    conditions, consistência matemática e ausência de lost updates.
 * 3. Estabilidade e unicidade do itemId: Itens com cProd ou xProd repetidos geram
 *    itemIds determinísticos, distintos e estáveis (nfe-${chaveAcesso}-item-${nItem}),
 *    e edição por itemId atinge exclusivamente a linha almejada.
 * 4. Conservação de despesas acessórias e totais: Frete, seguro, outras despesas
 *    e descontos são conservados integralmente em xmlToInvoiceMapper e recalculados
 *    com precisão decimal estrita em invoiceRepository.create e updateItem.
 * 5. Escopo de resetDemoData(): Restaura apenas o storage de mocks de demonstração
 *    e mantém 100% intactos e inalterados os documentos reais residentes na sessão.
 *
 * Execução: node --no-warnings --test tests/tier5/m1_challenger2_session_integrity.test.mjs
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  invoiceRepository,
  sessionInvoices,
} from '../../app/features/invoiceRepository.js';
import {
  mapXmlToInvoice,
  generateItemId,
} from '../../app/features/xml/xmlToInvoiceMapper.js';
import {
  localStorageService,
  STORAGE_KEYS,
} from '../../app/lib/storage/localStorageService.js';
import { calculateInvoiceTotals } from '../../app/lib/calculations/invoiceTotals.js';
import {
  decimalAdd,
  decimalSubtract,
  decimalMultiply,
} from '../../app/lib/calculations/decimal.js';

// ============================================================================
// Fixture Helper: Gerador sintético de documento de NF-e
// ============================================================================
function createSyntheticInvoiceData(overrides = {}) {
  const chaveAcesso =
    overrides.chaveAcesso || '35241112345678000190550010001458921001234562';
  const id = overrides.id || `nfe-${chaveAcesso}`;
  const itemCount = overrides.itemCount || 10;

  const itens = [];
  for (let i = 1; i <= itemCount; i++) {
    const qty = overrides.itemQty || '10.0000';
    const unitPrice = overrides.itemUnitPrice || '50.0000';
    const total = overrides.itemTotal || '500.00';
    itens.push({
      id: `nfe-${chaveAcesso}-item-${i}`,
      item: i,
      codigo: overrides.repeatedCode || `PROD-${i.toString().padStart(3, '0')}`,
      cEAN: 'SEM GTIN',
      descricao: overrides.repeatedDesc || `Produto de Teste ${i}`,
      ncm: '84089090',
      cfop: '6501',
      unidade: 'UN',
      quantidade: qty,
      valorUnitario: unitPrice,
      valorTotal: total,
      valorFrete: '10.00',
      valorSeguro: '5.00',
      valorDesconto: '2.00',
      outrasDespesas: '3.00',
      situacao: 'pendente',
      modificado: false,
      valorOriginal: null,
      inconsistencias: [],
    });
  }

  const calcTotals = calculateInvoiceTotals(itens, {
    valorDesconto: overrides.valorDesconto || '20.00',
    valorFrete: overrides.valorFrete || '100.00',
    valorSeguro: overrides.valorSeguro || '50.00',
    outrasDespesas: overrides.outrasDespesas || '30.00',
  });

  return {
    id,
    numero: '000.145.892',
    serie: '1',
    chaveAcesso,
    tipoDocumento: 'XML',
    naturezaOperacao: 'EXPORTACAO DE PRODUTOS',
    emissao: '2026-10-15',
    dataEmissao: '2026-10-15T10:30:00Z',
    status: 'importado',
    isDemo: false,
    isRealImport: true,
    emitente: {
      cnpj: '12.345.678/0001-90',
      razaoSocial: 'EMITENTE TESTE INDUSTRIAL S/A',
      nomeFantasia: 'EMITENTE TESTE',
      inscricaoEstadual: '123456789',
      uf: 'SP',
      municipio: 'Sao Paulo',
    },
    destinatario: {
      nome: 'GLOBAL LOGISTICS BV',
      cnpj: '',
      idEstrangeiro: 'NL884920192B01',
      pais: 'Holanda',
      paisCodigo: '528',
      uf: 'EX',
      municipio: 'Rotterdam',
    },
    itens,
    totais: {
      valorProdutos: calcTotals.valorProdutos,
      valorFrete: calcTotals.valorFrete,
      valorSeguro: calcTotals.valorSeguro,
      valorDesconto: calcTotals.valorDesconto,
      outrasDespesas: calcTotals.outrasDespesas,
      valorTotalNota: calcTotals.valorTotalNota,
      pesoLiquido: '1000.000',
      pesoBruto: '1050.000',
    },
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    ...overrides,
  };
}

describe('Adversarial Challenger 2 — Isolamento Estrito de LocalStorage (R3 / Sigilo Fiscal)', () => {
  let originalSave;
  let saveCalls = [];

  beforeEach(async () => {
    invoiceRepository.clearSession();
    // Garante que o storage inicial de mocks esteja presente
    await invoiceRepository.resetDemoData();

    // Espia chamadas a localStorageService.save
    saveCalls = [];
    originalSave = localStorageService.save;
    localStorageService.save = function (key, data) {
      saveCalls.push({ key, data, timestamp: Date.now() });
      return originalSave.call(this, key, data);
    };
  });

  afterEach(() => {
    localStorageService.save = originalSave;
    invoiceRepository.clearSession();
  });

  it('PROVA EMPÍRICA 1.1: invoiceRepository.create com isRealImport: true NUNCA chama localStorageService.save', async () => {
    const realDoc = createSyntheticInvoiceData({
      id: 'nfe-real-001',
      isRealImport: true,
      isDemo: false,
    });

    const created = await invoiceRepository.create(realDoc);

    // 1. Confirma que reside na sessão
    assert.strictEqual(invoiceRepository.isSessionInvoice(created.id), true);
    assert.strictEqual(sessionInvoices.has(created.id), true);

    // 2. Confirma 0 chamadas ao storage
    assert.strictEqual(
      saveCalls.length,
      0,
      `Esperado 0 chamadas a localStorageService.save, mas recebeu ${saveCalls.length}`
    );

    // 3. Verifica que a chave INVOICES no localStorage não contém o documento
    const persisted = localStorageService.load(STORAGE_KEYS.INVOICES, []);
    assert.strictEqual(
      persisted.some((doc) => doc.id === created.id),
      false,
      'Documento real não pode estar presente na lista persistida do LocalStorage'
    );
  });

  it('PROVA EMPÍRICA 1.2: invoiceRepository.create com isDemo: false NUNCA chama localStorageService.save', async () => {
    const realDoc = createSyntheticInvoiceData({
      id: 'nfe-real-002',
      isRealImport: false, // isDemo: false deve prevalecer e torná-lo isRealImport: true
      isDemo: false,
    });

    const created = await invoiceRepository.create(realDoc);

    assert.strictEqual(created.isRealImport, true);
    assert.strictEqual(created.isDemo, false);
    assert.strictEqual(invoiceRepository.isSessionInvoice(created.id), true);
    assert.strictEqual(saveCalls.length, 0);

    const persisted = localStorageService.load(STORAGE_KEYS.INVOICES, []);
    assert.strictEqual(persisted.some((doc) => doc.id === created.id), false);
  });

  it('PROVA EMPÍRICA 1.3: Mutações de documento real (update, updateItem, delete) JAMAIS tocam no LocalStorage', async () => {
    const realDoc = createSyntheticInvoiceData({
      id: 'nfe-real-003',
      isRealImport: true,
      isDemo: false,
    });

    await invoiceRepository.create(realDoc);
    assert.strictEqual(saveCalls.length, 0);

    // Mutação 1: update no documento
    await invoiceRepository.update(realDoc.id, {
      naturezaOperacao: 'REMESSA PARA EXPORTACAO ATUALIZADA',
    });
    assert.strictEqual(saveCalls.length, 0, 'update não pode chamar save');

    // Mutação 2: updateItem no primeiro item
    const firstItemId = realDoc.itens[0].id;
    await invoiceRepository.updateItem(realDoc.id, firstItemId, {
      quantidade: '99.0000',
      valorUnitario: '120.0000',
    });
    assert.strictEqual(saveCalls.length, 0, 'updateItem não pode chamar save');

    // Mutação 3: delete do documento da sessão
    const deleted = await invoiceRepository.delete(realDoc.id);
    assert.strictEqual(deleted, true);
    assert.strictEqual(saveCalls.length, 0, 'delete não pode chamar save');
    assert.strictEqual(sessionInvoices.has(realDoc.id), false);

    // Controle positivo: confirma que um documento de demonstração legítimo CHAMA o save
    const demoDoc = {
      id: 'demo-control-test',
      isDemo: true,
      isRealImport: false,
      numero: '999',
      itens: [],
      totais: {},
    };
    await invoiceRepository.create(demoDoc);
    assert.strictEqual(
      saveCalls.length,
      1,
      'Criação de documento de demonstração DEVE acionar o storage persistente'
    );
  });

  it('PROVA EMPÍRICA 1.4: Mapeador xmlToInvoiceMapper SEMPRE impõe isRealImport: true e isDemo: false', () => {
    const extractedData = {
      chaveAcesso: '35241112345678000190550010001458921001234562',
      numero: '145892',
      serie: '1',
      emitente: { CNPJ: '12345678000190', xNome: 'Emitente' },
      destinatario: { xNome: 'Destino', pais: 'Brasil' },
      itens: [
        {
          nItem: 1,
          cProd: 'P1',
          xProd: 'Item 1',
          NCM: '84089090',
          CFOP: '5102',
          uCom: 'UN',
          qCom: '1.0000',
          vUnCom: '10.0000',
          vProd: '10.00',
        },
      ],
      totais: { vProd: '10.00', vNF: '10.00' },
      // Tentativa adversária de forçar isDemo: true ou isRealImport: false nos dados brutos
      isDemo: true,
      isRealImport: false,
    };

    const invoice = mapXmlToInvoice(extractedData);

    assert.strictEqual(
      invoice.isRealImport,
      true,
      'isRealImport DEVE ser imutavelmente true'
    );
    assert.strictEqual(
      invoice.isDemo,
      false,
      'isDemo DEVE ser imutavelmente false'
    );
  });
});

describe('Adversarial Challenger 2 — Concorrência e Idempotência (50 Operações Simultâneas)', () => {
  beforeEach(async () => {
    invoiceRepository.clearSession();
    await invoiceRepository.resetDemoData();
  });

  afterEach(() => {
    invoiceRepository.clearSession();
  });

  it('PROVA EMPÍRICA 2.1: 50 operações concorrentes simultâneas de updateItem e list sem race condition nem colapso de estado', async () => {
    const invoiceId = 'nfe-concurrency-test-01';
    const realDoc = createSyntheticInvoiceData({
      id: invoiceId,
      itemCount: 10,
      itemQty: '10.0000',
      itemUnitPrice: '20.0000',
      itemTotal: '200.00',
    });

    await invoiceRepository.create(realDoc);
    assert.strictEqual(sessionInvoices.has(invoiceId), true);

    // Array de 50 operações concorrentes simultâneas
    const concurrentOps = [];

    // 25 operações de updateItem variando itens de 1 a 10 com valores determinísticos
    for (let i = 1; i <= 25; i++) {
      const targetItemNum = ((i - 1) % 10) + 1;
      const targetItemId = `nfe-35241112345678000190550010001458921001234562-item-${targetItemNum}`;
      const newQty = `${10 + i}.0000`;
      const newUnit = `${20 + i}.0000`;

      concurrentOps.push(
        invoiceRepository.updateItem(invoiceId, targetItemId, {
          quantidade: newQty,
          valorUnitario: newUnit,
        })
      );
    }

    // 25 operações simultâneas de leitura (list e findById)
    for (let i = 1; i <= 25; i++) {
      if (i % 2 === 0) {
        concurrentOps.push(invoiceRepository.list({ query: 'EMITENTE' }));
      } else {
        concurrentOps.push(invoiceRepository.findById(invoiceId));
      }
    }

    assert.strictEqual(concurrentOps.length, 50);

    // Disparo em paralelo massivo via Promise.all
    const results = await Promise.all(concurrentOps);

    // Validação 1: Nenhuma das 50 operações rejeitou ou lançou erro
    assert.strictEqual(results.length, 50);

    // Validação 2: Documento final recuperado da sessão
    const finalDoc = await invoiceRepository.findById(invoiceId);
    assert.ok(finalDoc);
    assert.strictEqual(finalDoc.itens.length, 10);

    // Validação 3: Consistência matemática exata entre linhas e totais consolidados
    let expectedSumProdutos = '0.00';
    for (const item of finalDoc.itens) {
      // Cada item deve ter valorTotal = unitPrice * quantidade
      const calculatedItemTotal = decimalMultiply(
        item.valorUnitario,
        item.quantidade,
        2
      );
      assert.strictEqual(
        item.valorTotal,
        calculatedItemTotal,
        `Item ${item.id} inconsistente: unit=${item.valorUnitario} * qty=${item.quantidade} != total=${item.valorTotal}`
      );
      expectedSumProdutos = decimalAdd(expectedSumProdutos, item.valorTotal, 2);
    }

    assert.strictEqual(
      finalDoc.totais.valorProdutos,
      expectedSumProdutos,
      'totais.valorProdutos deve coincidir exatamente com a soma de todos os itens'
    );

    // Validação 4: Total da nota reconciliado com frete, seguro, outras despesas e desconto
    const expectedNota = decimalAdd(
      decimalSubtract(
        decimalAdd(
          decimalAdd(expectedSumProdutos, finalDoc.totais.valorFrete, 2),
          finalDoc.totais.valorSeguro,
          2
        ),
        finalDoc.totais.valorDesconto,
        2
      ),
      finalDoc.totais.outrasDespesas,
      2
    );

    assert.strictEqual(
      finalDoc.totais.valorTotalNota,
      expectedNota,
      'totais.valorTotalNota deve conservar a fórmula SEFAZ exata após 50 operações concorrentes'
    );
  });

  it('PROVA EMPÍRICA 2.2: Idempotência sob concorrência — 50 updateItem simultâneos com idêntico payload', async () => {
    const invoiceId = 'nfe-idempotency-test-02';
    const realDoc = createSyntheticInvoiceData({
      id: invoiceId,
      itemCount: 5,
    });

    await invoiceRepository.create(realDoc);
    const targetItemId = realDoc.itens[0].id;

    const payload = {
      quantidade: '42.0000',
      valorUnitario: '10.5000',
    };

    // 50 chamadas simultâneas idênticas
    const idempotentOps = Array.from({ length: 50 }, () =>
      invoiceRepository.updateItem(invoiceId, targetItemId, payload)
    );

    await Promise.all(idempotentOps);

    const docAfter = await invoiceRepository.findById(invoiceId);
    const targetItem = docAfter.itens.find((it) => it.id === targetItemId);

    assert.strictEqual(targetItem.quantidade, '42.0000');
    assert.strictEqual(targetItem.valorUnitario, '10.5000');
    assert.strictEqual(targetItem.valorTotal, '441.00'); // 42 * 10.5 = 441.00
    assert.strictEqual(targetItem.modificado, true);
  });

  it('PROVA EMPÍRICA 2.3: Ausência de Lost Updates em 50 atualizações distintas sobre 50 itens', async () => {
    const invoiceId = 'nfe-lost-updates-test-03';
    const realDoc = createSyntheticInvoiceData({
      id: invoiceId,
      itemCount: 50,
      itemQty: '1.0000',
      itemUnitPrice: '10.0000',
      itemTotal: '10.00',
    });

    await invoiceRepository.create(realDoc);

    // 50 mutações concorrentes, cada uma afetando um item específico diferente
    const updateOps = [];
    for (let i = 1; i <= 50; i++) {
      const itemId = `nfe-35241112345678000190550010001458921001234562-item-${i}`;
      updateOps.push(
        invoiceRepository.updateItem(invoiceId, itemId, {
          quantidade: `${i}.0000`,
          valorUnitario: '100.0000',
        })
      );
    }

    await Promise.all(updateOps);

    const finalDoc = await invoiceRepository.findById(invoiceId);
    assert.strictEqual(finalDoc.itens.length, 50);

    // Verifica que NENHUM item perdeu sua atualização ("zero lost updates")
    for (let i = 1; i <= 50; i++) {
      const item = finalDoc.itens[i - 1];
      assert.strictEqual(
        item.quantidade,
        `${i}.0000`,
        `Item ${i} sofreu lost update! Quantidade esperada ${i}.0000, obtida ${item.quantidade}`
      );
      assert.strictEqual(item.valorUnitario, '100.0000');
      const expectedTotal = (i * 100).toFixed(2);
      assert.strictEqual(item.valorTotal, expectedTotal);
      assert.strictEqual(item.modificado, true);
    }
  });
});

describe('Adversarial Challenger 2 — Estabilidade e Unicidade do itemId (R1 / R3)', () => {
  it('PROVA EMPÍRICA 3.1: generateItemId gera IDs determinísticos a partir da chave e nItem', () => {
    const chave1 = '35241112345678000190550010001458921001234562';
    assert.strictEqual(
      generateItemId(chave1, 1),
      'nfe-35241112345678000190550010001458921001234562-item-1'
    );
    assert.strictEqual(
      generateItemId(chave1, '1'),
      'nfe-35241112345678000190550010001458921001234562-item-1'
    );
    assert.strictEqual(
      generateItemId(`NFe${chave1}`, 15),
      'nfe-35241112345678000190550010001458921001234562-item-15'
    );
    assert.strictEqual(
      generateItemId('  3524 1112 3456 7800 0190 5500 1000 1458 9210 0123 4562  ', 42),
      'nfe-35241112345678000190550010001458921001234562-item-42'
    );
  });

  it('PROVA EMPÍRICA 3.2: Itens com cProd e xProd 100% IDÊNTICOS geram itemIds estáveis, distintos e únicos', () => {
    const chave = '35241112345678000190550010001458921001234562';
    const extractedData = {
      chaveAcesso: chave,
      numero: '100',
      serie: '1',
      emitente: { CNPJ: '12345678000190', xNome: 'Emitente' },
      destinatario: { xNome: 'Destino', pais: 'Brasil' },
      itens: [
        {
          nItem: 1,
          cProd: 'PARAFUSO-M8',
          xProd: 'PARAFUSO SEXTAVADO M8 INOX',
          NCM: '73181500',
          CFOP: '5102',
          uCom: 'UN',
          qCom: '100.0000',
          vUnCom: '1.5000',
          vProd: '150.00',
        },
        {
          nItem: 2,
          cProd: 'PARAFUSO-M8', // IDÊNTICO
          xProd: 'PARAFUSO SEXTAVADO M8 INOX', // IDÊNTICO
          NCM: '73181500',
          CFOP: '5102',
          uCom: 'UN',
          qCom: '200.0000',
          vUnCom: '1.5000',
          vProd: '300.00',
        },
        {
          nItem: 3,
          cProd: 'PARAFUSO-M8', // IDÊNTICO
          xProd: 'PARAFUSO SEXTAVADO M8 INOX', // IDÊNTICO
          NCM: '73181500',
          CFOP: '5102',
          uCom: 'UN',
          qCom: '300.0000',
          vUnCom: '1.5000',
          vProd: '450.00',
        },
      ],
      totais: { vProd: '900.00', vNF: '900.00' },
    };

    const invoice = mapXmlToInvoice(extractedData);

    assert.strictEqual(invoice.itens.length, 3);
    assert.strictEqual(
      invoice.itens[0].id,
      'nfe-35241112345678000190550010001458921001234562-item-1'
    );
    assert.strictEqual(
      invoice.itens[1].id,
      'nfe-35241112345678000190550010001458921001234562-item-2'
    );
    assert.strictEqual(
      invoice.itens[2].id,
      'nfe-35241112345678000190550010001458921001234562-item-3'
    );

    const ids = invoice.itens.map((it) => it.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(
      uniqueIds.size,
      3,
      'Todos os itens com cProd/xProd repetidos DEVEM ter itemIds únicos'
    );
  });

  it('PROVA EMPÍRICA 3.3: Edição de item repetido atinge ESTRITAMENTE a linha selecionada por itemId', async () => {
    const chave = '35241112345678000190550010001458921001234562';
    const invoiceData = createSyntheticInvoiceData({
      chaveAcesso: chave,
      id: `nfe-${chave}`,
      itemCount: 4,
      repeatedCode: 'REPETIDO-SKU',
      repeatedDesc: 'DESCRICAO HOMONIMA REPETIDA',
      itemQty: '10.0000',
      itemUnitPrice: '5.0000',
      itemTotal: '50.00',
    });

    await invoiceRepository.create(invoiceData);

    const targetItemId = `nfe-${chave}-item-3`;

    // Atualiza especificamente o item 3
    await invoiceRepository.updateItem(invoiceData.id, targetItemId, {
      quantidade: '999.0000',
      valorUnitario: '50.0000',
    });

    const docAfter = await invoiceRepository.findById(invoiceData.id);

    // Item 1, 2 e 4 devem permanecer intactos
    const item1 = docAfter.itens[0];
    const item2 = docAfter.itens[1];
    const item3 = docAfter.itens[2];
    const item4 = docAfter.itens[3];

    assert.strictEqual(item1.quantidade, '10.0000');
    assert.strictEqual(item1.modificado, false);

    assert.strictEqual(item2.quantidade, '10.0000');
    assert.strictEqual(item2.modificado, false);

    // Apenas item 3 deve ter sido modificado
    assert.strictEqual(item3.id, targetItemId);
    assert.strictEqual(item3.quantidade, '999.0000');
    assert.strictEqual(item3.valorUnitario, '50.0000');
    assert.strictEqual(item3.valorTotal, '49950.00');
    assert.strictEqual(item3.modificado, true);

    assert.strictEqual(item4.quantidade, '10.0000');
    assert.strictEqual(item4.modificado, false);
  });
});

describe('Adversarial Challenger 2 — Conservação de Frete, Seguro, Outras Despesas e Descontos', () => {
  beforeEach(() => {
    invoiceRepository.clearSession();
  });

  afterEach(() => {
    invoiceRepository.clearSession();
  });

  it('PROVA EMPÍRICA 4.1: xmlToInvoiceMapper extrai e normaliza despesas acessórias e totais da NF-e', () => {
    const extractedData = {
      chaveAcesso: '35241112345678000190550010001458921001234562',
      numero: '987',
      serie: '1',
      emitente: { CNPJ: '12345678000190', xNome: 'Emitente' },
      destinatario: { xNome: 'Destino', pais: 'Brasil' },
      itens: [
        {
          nItem: 1,
          cProd: 'P1',
          xProd: 'Item 1',
          NCM: '84089090',
          CFOP: '5102',
          uCom: 'UN',
          qCom: '10.0000',
          vUnCom: '100.0000',
          vProd: '1000.00',
          vFrete: '100.00',
          vSeg: '50.00',
          vDesc: '20.00',
          vOutro: '30.00',
        },
      ],
      totais: {
        valorProdutos: '1000.00',
        valorFrete: '100.00',
        valorSeguro: '50.00',
        valorDesconto: '20.00',
        outrasDespesas: '30.00',
        valorTotalNota: '1160.00', // 1000 - 20 + 100 + 50 + 30 = 1160.00
      },
    };

    const invoice = mapXmlToInvoice(extractedData);

    assert.strictEqual(invoice.totais.valorProdutos, '1000.00');
    assert.strictEqual(invoice.totais.valorFrete, '100.00');
    assert.strictEqual(invoice.totais.valorSeguro, '50.00');
    assert.strictEqual(invoice.totais.valorDesconto, '20.00');
    assert.strictEqual(invoice.totais.outrasDespesas, '30.00');
    assert.strictEqual(invoice.totais.valorTotalNota, '1160.00');

    // Despesas no item individual
    const it = invoice.itens[0];
    assert.strictEqual(it.valorFrete, '100.00');
    assert.strictEqual(it.valorSeguro, '50.00');
    assert.strictEqual(it.valorDesconto, '20.00');
    assert.strictEqual(it.outrasDespesas, '30.00');
  });

  it('PROVA EMPÍRICA 4.2: xmlToInvoiceMapper reconcilia total da nota se vNF vier zerado ou ausente', () => {
    const extractedData = {
      chaveAcesso: '35241112345678000190550010001458921001234562',
      numero: '988',
      serie: '1',
      emitente: { CNPJ: '12345678000190', xNome: 'Emitente' },
      destinatario: { xNome: 'Destino', pais: 'Brasil' },
      itens: [
        {
          nItem: 1,
          cProd: 'P1',
          xProd: 'Item 1',
          NCM: '84089090',
          CFOP: '5102',
          uCom: 'UN',
          qCom: '5.0000',
          vUnCom: '200.0000',
          vProd: '1000.00',
        },
      ],
      totais: {
        valorProdutos: '1000.00',
        valorFrete: '80.00',
        valorSeguro: '20.00',
        valorDesconto: '50.00',
        outrasDespesas: '15.00',
        valorTotalNota: '0.00', // Zerado no XML de entrada
      },
    };

    const invoice = mapXmlToInvoice(extractedData);

    // 1000 - 50 (desc) + 80 (frete) + 20 (seg) + 15 (outras) = 1065.00
    assert.strictEqual(invoice.totais.valorTotalNota, '1065.00');
  });

  it('PROVA EMPÍRICA 4.3: invoiceRepository.updateItem PRESERVA frete, seguro, outras despesas e desconto após recálculo', async () => {
    const invoiceData = createSyntheticInvoiceData({
      id: 'nfe-totals-preservation-01',
      itemCount: 2,
      itemQty: '1.0000',
      itemUnitPrice: '1000.0000',
      itemTotal: '1000.00',
      valorFrete: '150.00',
      valorSeguro: '50.00',
      valorDesconto: '80.00',
      outrasDespesas: '30.00',
    });

    // Totais iniciais:
    // Produtos = 2000.00
    // Total Nota = 2000 - 80 + 150 + 50 + 30 = 2150.00
    await invoiceRepository.create(invoiceData);

    const docBefore = await invoiceRepository.findById(invoiceData.id);
    assert.strictEqual(docBefore.totais.valorProdutos, '2000.00');
    assert.strictEqual(docBefore.totais.valorTotalNota, '2150.00');
    assert.strictEqual(docBefore.totais.valorFrete, '150.00');
    assert.strictEqual(docBefore.totais.valorSeguro, '50.00');
    assert.strictEqual(docBefore.totais.valorDesconto, '80.00');
    assert.strictEqual(docBefore.totais.outrasDespesas, '30.00');

    // Altera a quantidade do primeiro item de 1 para 3 (item 1 vai de 1000 para 3000)
    const firstItemId = docBefore.itens[0].id;
    await invoiceRepository.updateItem(invoiceData.id, firstItemId, {
      quantidade: '3.0000',
    });

    const docAfter = await invoiceRepository.findById(invoiceData.id);

    // Novos produtos = 3000 (item 1) + 1000 (item 2) = 4000.00
    assert.strictEqual(docAfter.totais.valorProdutos, '4000.00');

    // Despesas acessórias DEVEM permanecer estritamente conservadas!
    assert.strictEqual(
      docAfter.totais.valorFrete,
      '150.00',
      'Frete deve ser conservado'
    );
    assert.strictEqual(
      docAfter.totais.valorSeguro,
      '50.00',
      'Seguro deve ser conservado'
    );
    assert.strictEqual(
      docAfter.totais.valorDesconto,
      '80.00',
      'Desconto deve ser conservado'
    );
    assert.strictEqual(
      docAfter.totais.outrasDespesas,
      '30.00',
      'Outras despesas devem ser conservadas'
    );

    // Novo Total da Nota = 4000 - 80 + 150 + 50 + 30 = 4150.00
    assert.strictEqual(
      docAfter.totais.valorTotalNota,
      '4150.00',
      'Total da nota deve ser recalculado considerando exatamente as despesas acessórias'
    );
  });
});

describe('Adversarial Challenger 2 — Escopo de resetDemoData() (Isolamento de Memória vs LocalStorage)', () => {
  beforeEach(async () => {
    invoiceRepository.clearSession();
    await invoiceRepository.resetDemoData();
  });

  afterEach(() => {
    invoiceRepository.clearSession();
  });

  it('PROVA EMPÍRICA 5.1: resetDemoData() restaura os mocks do LocalStorage mas mantém 100% dos documentos da sessão intactos', async () => {
    // 1. Modifica um documento de demonstração no LocalStorage (demo-01)
    await invoiceRepository.update('demo-01', {
      status: 'dividido',
      naturezaOperacao: 'MODIFICADO PELO TESTE',
    });
    const modifiedDemo1 = await invoiceRepository.findById('demo-01');
    assert.strictEqual(modifiedDemo1.status, 'dividido');
    assert.strictEqual(modifiedDemo1.naturezaOperacao, 'MODIFICADO PELO TESTE');

    // 2. Adiciona 3 documentos reais na sessão volátil em memória
    const realDoc1 = createSyntheticInvoiceData({
      id: 'nfe-session-01',
      chaveAcesso: '35241112345678000190550010001458921001234562',
    });
    const realDoc2 = createSyntheticInvoiceData({
      id: 'nfe-session-02',
      chaveAcesso: '35241198765432000188550010000000421007890120',
    });
    const realDoc3 = createSyntheticInvoiceData({
      id: 'nfe-session-03',
      chaveAcesso: '35241111223344000155550010000001001009998881',
    });

    await invoiceRepository.create(realDoc1);
    await invoiceRepository.create(realDoc2);
    await invoiceRepository.create(realDoc3);

    assert.strictEqual(invoiceRepository.getSessionCount(), 3);
    assert.strictEqual(sessionInvoices.size, 3);

    // 3. Executa resetDemoData()
    await invoiceRepository.resetDemoData();

    // 4. Verificação dos documentos de demonstração: demo-01 deve ter retornado ao estado original de fábrica
    const demo1Restored = await invoiceRepository.findById('demo-01');
    assert.strictEqual(
      demo1Restored.status,
      'em_conferencia',
      'demo-01 deve ser restaurado para o status original de fábrica'
    );
    assert.strictEqual(
      demo1Restored.naturezaOperacao,
      'EXPORTAÇÃO DE MERCADORIAS',
      'demo-01 deve restaurar a natureza da operação original'
    );

    // 5. Verificação dos documentos reais na sessão: DEVEM ESTAR 100% INTACTOS
    assert.strictEqual(
      invoiceRepository.getSessionCount(),
      3,
      'Contagem de documentos na sessão deve permanecer rigorosamente 3'
    );
    assert.strictEqual(sessionInvoices.has('nfe-session-01'), true);
    assert.strictEqual(sessionInvoices.has('nfe-session-02'), true);
    assert.strictEqual(sessionInvoices.has('nfe-session-03'), true);

    const doc1 = await invoiceRepository.findById('nfe-session-01');
    assert.ok(doc1);
    assert.strictEqual(doc1.id, 'nfe-session-01');
    assert.strictEqual(doc1.isRealImport, true);
    assert.strictEqual(doc1.isDemo, false);

    // 6. Verificação da listagem unificada: documentos reais no topo, seguidos pelos 5 mocks
    const fullList = await invoiceRepository.list();
    assert.strictEqual(fullList.length, 8); // 3 reais + 5 mocks de demonstração
    assert.strictEqual(fullList[0].id, 'nfe-session-01');
    assert.strictEqual(fullList[1].id, 'nfe-session-02');
    assert.strictEqual(fullList[2].id, 'nfe-session-03');
  });

  it('PROVA EMPÍRICA 5.2: resetInvoice() em documento de sessão lança erro informativo expressivo', async () => {
    const realDoc = createSyntheticInvoiceData({
      id: 'nfe-session-cannot-reset',
    });
    await invoiceRepository.create(realDoc);

    await assert.rejects(
      async () => {
        await invoiceRepository.resetInvoice(realDoc.id);
      },
      (err) => {
        assert.match(
          err.message,
          /sessão volátil e não possui versão de demonstração de fábrica/i
        );
        return true;
      }
    );
  });
});

describe('Adversarial Challenger 2 — Busca Textual e Paginação sobre a Sessão', () => {
  beforeEach(async () => {
    invoiceRepository.clearSession();
    await invoiceRepository.resetDemoData();
  });

  afterEach(() => {
    invoiceRepository.clearSession();
  });

  it('PROVA EMPÍRICA 6.1: Busca textual filtra simultaneamente documentos da sessão e mocks', async () => {
    const realDoc = createSyntheticInvoiceData({
      id: 'nfe-searchable-real',
      chaveAcesso: '35241112345678000190550010001458921001234562',
      numero: '999.888.777',
      emitente: {
        cnpj: '99.888.777/0001-11',
        razaoSocial: 'XILOFONE INDUSTRIAS PESADAS',
      },
      destinatario: {
        nome: 'IMPORTADOR ALFA OMEGA',
        pais: 'Alemanha',
      },
    });

    await invoiceRepository.create(realDoc);

    // Busca por termo exclusivo do documento real
    const searchChave = await invoiceRepository.list({ query: 'xilofone' });
    assert.strictEqual(searchChave.length, 1);
    assert.strictEqual(searchChave[0].id, 'nfe-searchable-real');

    // Busca por termo presente no documento real e no mock demo-03 (Alemanha)
    const searchDest = await invoiceRepository.list({ query: 'alemanha' });
    assert.strictEqual(searchDest.length, 2);
    assert.strictEqual(searchDest[0].id, 'nfe-searchable-real');
    assert.strictEqual(searchDest[1].id, 'demo-03');

    // Busca por termo existente nos mocks (ex: 'agroexport')
    const searchMock = await invoiceRepository.list({ query: 'agroexport' });
    assert.ok(searchMock.length >= 1);
    assert.strictEqual(searchMock[0].id, 'demo-01');
  });

  it('PROVA EMPÍRICA 6.2: Paginação respeita retorno de envelope com session docs integrados', async () => {
    // 3 documentos reais na sessão
    for (let i = 1; i <= 3; i++) {
      await invoiceRepository.create(
        createSyntheticInvoiceData({
          id: `nfe-page-doc-${i}`,
          chaveAcesso: `3524111234567800019055001000145892100123456${i}`,
        })
      );
    }

    // 3 reais + 5 mocks = 8 documentos totais. PageSize = 3 => 3 páginas.
    const page1 = await invoiceRepository.list({
      page: 1,
      pageSize: 3,
      returnPagination: true,
    });

    assert.strictEqual(page1.total, 8);
    assert.strictEqual(page1.page, 1);
    assert.strictEqual(page1.pageSize, 3);
    assert.strictEqual(page1.totalPages, 3);
    assert.strictEqual(page1.data.length, 3);
    // Os 3 primeiros itens são os da sessão
    assert.strictEqual(page1.data[0].id, 'nfe-page-doc-1');
    assert.strictEqual(page1.data[1].id, 'nfe-page-doc-2');
    assert.strictEqual(page1.data[2].id, 'nfe-page-doc-3');

    const page2 = await invoiceRepository.list({
      page: 2,
      pageSize: 3,
      returnPagination: true,
    });
    assert.strictEqual(page2.data.length, 3);
    assert.strictEqual(page2.data[0].id, 'demo-01');
  });
});

describe('Adversarial Challenger 2 — Normalizadores e Formatadores de XML', () => {
  it('PROVA EMPÍRICA 7.1: formatInvoiceNumber formata com segurança números, strings e nulos', async () => {
    const { formatInvoiceNumber, formatCNPJorCPF, normalizeQuantity, normalizeUnitPrice } =
      await import('../../app/features/xml/xmlToInvoiceMapper.js');

    assert.strictEqual(formatInvoiceNumber(145892), '000.145.892');
    assert.strictEqual(formatInvoiceNumber('145892'), '000.145.892');
    assert.strictEqual(formatInvoiceNumber('1'), '000.000.001');
    assert.strictEqual(formatInvoiceNumber('123456789'), '123.456.789');
    assert.strictEqual(formatInvoiceNumber(null), '000.000.000');
    assert.strictEqual(formatInvoiceNumber(undefined), '000.000.000');
    assert.strictEqual(formatInvoiceNumber(''), '000.000.000');

    assert.strictEqual(formatCNPJorCPF('12345678000190'), '12.345.678/0001-90');
    assert.strictEqual(formatCNPJorCPF('12345678901'), '123.456.789-01');
    assert.strictEqual(formatCNPJorCPF(''), '');
    assert.strictEqual(formatCNPJorCPF(null), '');

    assert.strictEqual(normalizeQuantity('100'), '100.0000');
    assert.strictEqual(normalizeQuantity('12.34567'), '12.3457');
    assert.strictEqual(normalizeQuantity(null), '0.0000');

    assert.strictEqual(normalizeUnitPrice('25.5'), '25.5000');
    assert.strictEqual(normalizeUnitPrice('686.6667'), '686.6667');
    assert.strictEqual(normalizeUnitPrice('0.123456'), '0.123456');
    assert.strictEqual(normalizeUnitPrice(null), '0.0000');
  });
});

